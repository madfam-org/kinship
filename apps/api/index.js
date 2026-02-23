const express = require('express');
const prisma = require('./prisma');

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

// Healthcheck endpoint for Enclii probes
app.get('/', (req, res) => {
  res.send({ status: 'healthy', service: 'kinship-api' });
});

// --- Public Key Registry ---

// Register or Update a User and their Public Key
app.post('/v1/users', async (req, res) => {
  const { januaId, email, publicKey } = req.body;
  
  if (!januaId || !email) {
    return res.status(400).send({ error: 'Missing januaId or email' });
  }

  try {
    const user = await prisma.user.upsert({
      where: { januaId },
      update: { publicKey, email },
      create: { januaId, email, publicKey },
    });
    res.send(user);
  } catch (error) {
    console.error('User Upsert Error:', error);
    res.status(500).send({ error: error.message });
  }
});

// Lookup a user by email to get their Public Key (Used by hosts during key wrapping)
app.get('/v1/users/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, januaId: true, email: true, publicKey: true }
    });
    if (!user) return res.status(404).send({ error: 'User not found' });
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get User Network (users they share a group with)
app.get('/v1/users/:userId/network', async (req, res) => {
  const { userId } = req.params;
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        memberships: {
          some: {
            groupId: {
              in: (await prisma.groupMembership.findMany({
                where: { userId },
                select: { groupId: true }
              })).map(g => g.groupId)
            }
          }
        }
      },
      select: { id: true, email: true, socialBattery: true, batteryLastUpdate: true }
    });
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update User Social Battery (Inter-Module Automation)
app.patch('/v1/users/:id/battery', async (req, res) => {
  const { id } = req.params;
  const { level } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { socialBattery: level, batteryLastUpdate: new Date() }
    });
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// --- Group Management ---

app.post('/v1/groups', async (req, res) => {
  const { name, ownerId } = req.body;
  try {
    const group = await prisma.group.create({
      data: {
        name,
        memberships: {
          create: [{ userId: ownerId, role: 'ADMIN' }]
        }
      }
    });
    res.send(group);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post('/v1/groups/:id/members', async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.body;
  try {
    const membership = await prisma.groupMembership.create({
      data: {
        groupId: id,
        userId,
        role: role || 'MEMBER'
      }
    });
    res.send(membership);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// --- Encrypted Event Envelopes ---

// Submit a new Encrypted Event with Wrapped Keys
app.post('/v1/events', async (req, res) => {
  const { 
    hostId, 
    startTime, 
    endTime, 
    minTrustLayer, 
    encryptedPayload, 
    wrappedKeys // Array of { userId, encryptedSymmetricKey }
  } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        hostId,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        minTrustLayer: minTrustLayer || 'INNER_CIRCLE',
        encryptedPayload,
        wrappedKeys: {
          create: wrappedKeys || []
        }
      },
      include: {
        wrappedKeys: true
      }
    });
    res.send(event);
  } catch (error) {
    console.error('Event Creation Error:', error);
    res.status(500).send({ error: error.message });
  }
});

// Get events for a user
// Returns events where user is host, holds a WrappedKey, OR the event broadcasts "busy" and the host shares a group.
app.get('/v1/events/authorized/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Get IDs of all groups the user is a member of
    const userGroups = await prisma.groupMembership.findMany({
      where: { userId },
      select: { groupId: true }
    });
    const groupIds = userGroups.map(g => g.groupId);

    const authorizedEvents = await prisma.event.findMany({
      where: {
        OR: [
          { hostId: userId },
          { wrappedKeys: { some: { userId } } },
          { 
            broadcastBusy: true,
            host: {
              memberships: {
                some: {
                  groupId: { in: groupIds }
                }
              }
            }
          }
        ]
      },
      include: {
        wrappedKeys: {
          where: { userId }
        }
      }
    });

    // Strip encrypted payloads from events where the user is NOT the host and DOES NOT hold a wrapped key
    // i.e., they are only seeing a "Busy Broadcast" from a network connection
    const sanitizedEvents = authorizedEvents.map(event => {
      const isHost = event.hostId === userId;
      const hasWrappedKey = event.wrappedKeys && event.wrappedKeys.length > 0;
      
      if (!isHost && !hasWrappedKey) {
         // It's a busy broadcast only. Strip sensitive payload entirely to enforce Zero Trust
         return {
           ...event,
           encryptedPayload: null, 
           // Technically we still need Title for the frontend Event model, but we set it blank here
           // as a safety mechanism, even if encrypted Payload is null. Calendar.tsx handles "Busy".
         };
      }
      return event;
    });

    res.send(sanitizedEvents);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// --- Virtual Asset Inventory ---

// Register a new Asset with Encrypted Metadata
app.post('/v1/assets', async (req, res) => {
  const { ownerId, groupId, encryptedMetadata, visibilityLayer, autoApproveLayer, status, requiresHighCapacity, wrappedKeys } = req.body;
  try {
    const asset = await prisma.asset.create({
      data: {
        ownerId,
        groupId,
        encryptedMetadata,
        visibilityLayer: visibilityLayer || 'INNER_CIRCLE',
        autoApproveLayer: autoApproveLayer || 'INNER_CIRCLE',
        status: status || 'AVAILABLE',
        requiresHighCapacity: requiresHighCapacity || false,
        wrappedKeys: {
          create: wrappedKeys || []
        }
      }
    });
    res.send(asset);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Fetch Asset Catalog for a User
// Returns assets owned by user or shared within a common group
app.get('/v1/assets/catalog/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Find all groups this user belongs to
    const userGroups = await prisma.groupMembership.findMany({
       where: { userId },
       select: { groupId: true }
    });
    const groupIds = userGroups.map(g => g.groupId);

    // 2. Query assets owned by user OR assigned to a group the user is in
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { groupId: { in: groupIds } }
        ]
      },
      include: {
        owner: { select: { email: true, socialBattery: true } },
        group: { select: { name: true } },
        wrappedKeys: {
          where: { userId }
        }
      }
    });

    // Inter-Module Automation: Filter out assets that require high capacity 
    // if the owner's social battery is critically low (< 20). Protects owner from burnout.
    const filteredAssets = assets.filter(asset => {
      // If the owner's battery is known, less than 20, and the asset requires high capacity, hide it.
      if (asset.requiresHighCapacity && asset.owner.socialBattery !== null && asset.owner.socialBattery < 20) {
        return false;
      }
      return true;
    });

    res.send(filteredAssets);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Submit a Loan Request
app.post('/v1/loan-requests', async (req, res) => {
  const { assetId, borrowerId, dueDate, trustDistance } = req.body;
  try {
    // 1. Fetch the Asset to check autoApproveLayer
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).send({ error: 'Asset not found' });

    // Trust Layer Hierarchy (Lower index = Tighter Trust)
    const layerHierarchy = ['INNER_CIRCLE', 'EXTENDED_POLYCULE', 'OUTER_RING', 'FRIENDS_OF_FRIENDS'];
    
    const requestDistance = trustDistance || 'OUTER_RING';
    const borrowerLevel = layerHierarchy.indexOf(requestDistance);
    const assetApprovalLevel = layerHierarchy.indexOf(asset.autoApproveLayer);

    // If borrower is inside or equals the autoApproveLayer, auto-approve instantly
    const isAutoApproved = borrowerLevel !== -1 && assetApprovalLevel !== -1 && borrowerLevel <= assetApprovalLevel;
    const finalStatus = isAutoApproved ? 'APPROVED' : 'PENDING';

    const loanRequest = await prisma.loanRequest.create({
      data: {
        assetId,
        borrowerId,
        trustDistance: requestDistance,
        status: finalStatus,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    if (isAutoApproved) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'LENT' }
      });
    }

    res.send(loanRequest);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get Loan Requests for a User (Borrowed by them OR Requested of their assets)
app.get('/v1/loan-requests/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const loans = await prisma.loanRequest.findMany({
      where: {
        OR: [
          { borrowerId: userId },
          { asset: { ownerId: userId } }
        ]
      },
      include: {
        asset: {
          select: { id: true, ownerId: true, encryptedMetadata: true, status: true }
        },
        borrower: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.send(loans);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update Loan Request Status (Approve/Reject/Return)
app.patch('/v1/loan-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status, dueDate, wrappedKey } = req.body;
  try {
    const loanRequest = await prisma.loanRequest.update({
      where: { id },
      data: { status, dueDate: dueDate ? new Date(dueDate) : undefined }
    });
    
    // If approved, mark asset as LENT
    if (status === 'APPROVED') {
      await prisma.asset.update({
        where: { id: loanRequest.assetId },
        data: { status: 'LENT' }
      });
      
      if (wrappedKey) {
        await prisma.assetWrappedKey.upsert({
          where: {
            assetId_userId: {
              assetId: loanRequest.assetId,
              userId: loanRequest.borrowerId
            }
          },
          update: { encryptedSymmetricKey: wrappedKey },
          create: {
            assetId: loanRequest.assetId,
            userId: loanRequest.borrowerId,
            encryptedSymmetricKey: wrappedKey
          }
        });
      }
    } else if (status === 'RETURNED') {
      await prisma.asset.update({
        where: { id: loanRequest.assetId },
        data: { status: 'AVAILABLE' }
      });
    }

    res.send(loanRequest);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Kinship API listening on port ${port}`);
  });
}

module.exports = app;

