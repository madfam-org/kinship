const express = require('express');
const { HTTP_STATUS, PAGINATION, SOCIAL_BATTERY, TIMERS, TRUST_LAYERS } = require('./src/constants');
const errorHandler = require('./src/middleware/errorHandler');
const prisma = require('./prisma');
const authMiddleware = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

// CORS — allow the Next.js dev server / Enclii ingress to reach the API
app.use((req, res, next) => {
  const allowed = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Auth: validate Bearer JWT on every route except / and POST /v1/users (see middleware/auth.js)
app.use(authMiddleware);

// Healthcheck endpoint for Enclii probes
app.get('/', (req, res) => {
  res.send({ status: 'healthy', service: 'kinship-api' });
});

// --- Public Key Registry ---

// Register or Update a User and their Public Key
app.post('/v1/users', async (req, res, next) => {
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
    next(error);
  }
});

// Lookup a user by email to get their Public Key (Used by hosts during key wrapping)
app.get('/v1/users/:email', async (req, res, next) => {
  const { email } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, januaId: true, email: true, publicKey: true }
    });
    if (!user) return res.status(404).send({ error: 'User not found' });
    res.send(user);
  } catch (error) {
    next(error);
  }
});

// --- SSE Connection Store (Phase 6.4) ---
// In-memory map of userId -> Set of active SSE Response objects.
// Fan-out helpers send typed SSE events to all open connections for a user.
const sseConnections = new Map();

function sseSubscribe(userId, res) {
  if (!sseConnections.has(userId)) sseConnections.set(userId, new Set());
  sseConnections.get(userId).add(res);
}

function sseUnsubscribe(userId, res) {
  sseConnections.get(userId)?.delete(res);
}

function sseFanOut(userIds, eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const uid of userIds) {
    sseConnections.get(uid)?.forEach(res => res.write(payload));
  }
}

// --- SSE Stream Endpoint ---
// GET /v1/events/stream/:userId — establishes a persistent SSE connection.
// Clients receive: battery-alert, new-event
app.get('/v1/events/stream/:userId', (req, res) => {
  const { userId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send a heartbeat comment every 25s to keep proxies from closing the connection
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), TIMERS.SSE_HEARTBEAT_MS);
  heartbeat.unref(); // Allow process to exit cleanly in tests without waiting for next tick

  sseSubscribe(userId, res);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseUnsubscribe(userId, res);
  });
});

// Get User Network (users they share a group with) — 6.2: single Prisma query (was N+1)
app.get('/v1/users/:userId/network', async (req, res, next) => {
  const { userId } = req.params;
  try {
    // Single query: find users who share at least one group with userId
    // Previously required two round-trips (groupMembership.findMany then user.findMany with groupId.in)
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        memberships: {
          some: {
            group: { memberships: { some: { userId } } }
          }
        }
      },
      select: { id: true, email: true, socialBattery: true, batteryLastUpdate: true }
    });
    res.send(users);
  } catch (error) {
    next(error);
  }
});

// Update User Social Battery (Inter-Module Automation + SSE fan-out for alerts)
// Phase 8.5: Biometric/Wearable Integration (HRV, Sleep)
app.patch('/v1/users/:id/battery', async (req, res, next) => {
  const { id } = req.params;
  let { level, healthMetrics } = req.body; // healthMetrics = { hrv: number, sleepQuality: number }
  
  try {
    // Phase 8.5: If biometric data is present, compute the battery dynamically
    if (healthMetrics) {
      // Basic heuristic: Higher HRV + Better Sleep -> Higher Battery
      const hrvScore = Math.min(Math.max(healthMetrics.hrv || 50, 20), 100); // 20-100 baselines
      const sleepScore = healthMetrics.sleepQuality ? (healthMetrics.sleepQuality * 10) : 50; // out of 10 -> 100
      level = Math.round((hrvScore * 0.6) + (sleepScore * 0.4));
      
      // Ensure bounds
      level = Math.max(0, Math.min(100, level));
    }

    const user = await prisma.user.update({
      where: { id },
      data: { socialBattery: level, batteryLastUpdate: new Date() }
    });

    // 6.4: If battery drops below 20, fan-out a battery-alert to this user's network connections
    if (typeof level === 'number' && level < SOCIAL_BATTERY.CRITICAL_THRESHOLD) {
      const networkMembers = await prisma.user.findMany({
        where: {
          id: { not: id },
          memberships: { some: { group: { memberships: { some: { userId: id } } } } }
        },
        select: { id: true }
      });
      const networkIds = networkMembers.map(u => u.id);
      // Also notify the user themselves (so their own devices update)
      sseFanOut([id, ...networkIds], 'battery-alert', {
        userId: id,
        email: user.email,
        level,
        timestamp: new Date().toISOString()
      });
    }

    res.send(user);
  } catch (error) {
    next(error);
  }
});

// --- Group Management ---

app.post('/v1/groups', async (req, res, next) => {
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
    next(error);
  }
});

app.post('/v1/groups/:id/members', async (req, res, next) => {
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
    next(error);
  }
});

// --- Encrypted Event Envelopes ---

// Submit a new Encrypted Event with Wrapped Keys
app.post('/v1/events', async (req, res, next) => {
  const { 
    hostId, 
    startTime, 
    endTime, 
    minTrustLayer, 
    encryptedPayload, 
    wrappedKeys, // Array of { userId, encryptedSymmetricKey }
    pollOptions  // Array of { type, encryptedValue } — Phase 5.2
  } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        hostId,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        minTrustLayer: minTrustLayer || TRUST_LAYERS.INNER_CIRCLE,
        encryptedPayload,
        wrappedKeys: {
          create: wrappedKeys || []
        },
        // 5.2: persist encrypted poll options if provided
        pollOptions: {
          create: (pollOptions || []).map(opt => ({
            type: opt.type || 'TIME',
            encryptedValue: opt.encryptedValue || null,
            value: '' // deprecated field; kept for schema compatibility
          }))
        }
      },
      include: {
        wrappedKeys: true,
        pollOptions: true
      }
    });
    res.send(event);
  } catch (error) {
    next(error);
  }
});

// Mute an Event for the current user (Phase 8.2)
app.post('/v1/events/:id/mute', async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    const mutedEvent = await prisma.mutedEvent.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      update: {}, // Do nothing if it already exists
      create: { eventId: id, userId }
    });
    res.send(mutedEvent);
  } catch (error) {
    next(error);
  }
});

// Un-mute an Event for the current user (Phase 8.2)
app.delete('/v1/events/:id/mute', async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    await prisma.mutedEvent.delete({
      where: { eventId_userId: { eventId: id, userId } }
    });
    res.send({ success: true, eventId: id, unmuted: true });
  } catch (error) {
    // Ignore error if the record doesn't exist (P2025)
    if (error.code === 'P2025') return res.send({ success: true, eventId: id, unmuted: true });
    res.status(500).send({ error: error.message });
  }
});

// --- In-Event Chat (Phase 8.3) ---

// Post an encrypted message to an event thread
app.post('/v1/events/:id/messages', async (req, res, next) => {
  const { id } = req.params;
  const { senderId, encryptedPayload } = req.body;
  
  if (!senderId || !encryptedPayload) {
    return res.status(400).send({ error: 'senderId and encryptedPayload are required' });
  }

  try {
    const message = await prisma.chatMessage.create({
      data: {
        eventId: id,
        senderId,
        encryptedPayload
      }
    });
    
    // Broadcast the new message over SSE to the event host and key holders
    const event = await prisma.event.findUnique({
      where: { id },
      include: { wrappedKeys: true }
    });
    
    if (event) {
      const authorizedNetwork = new Set([event.hostId, ...event.wrappedKeys.map(wk => wk.userId)]);
      sseFanOut(Array.from(authorizedNetwork), 'new-chat-message', message);
    }

    res.send(message);
  } catch (error) {
    next(error);
  }
});

// Retrieve paginated chat history for an event
app.get('/v1/events/:id/messages', async (req, res, next) => {
  const { id } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  // Authorization is implicitly handled by the UI only rendering this for members with the symmetric key
  try {
    const [total, messages] = await prisma.$transaction([
      prisma.chatMessage.count({ where: { eventId: id } }),
      prisma.chatMessage.findMany({
        where: { eventId: id },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      })
    ]);
    res.send({ data: messages, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// Get events for a user — 6.1: paginated
// Returns events where user is host, holds a WrappedKey, OR the event broadcasts "busy" and the host shares a group.
app.get('/v1/events/authorized/:userId', async (req, res, next) => {
  const { userId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  try {
    const userGroups = await prisma.groupMembership.findMany({
      where: { userId }, select: { groupId: true }
    });
    const groupIds = userGroups.map(g => g.groupId);

    const whereClause = {
      OR: [
        { hostId: userId },
        { wrappedKeys: { some: { userId } } },
        { broadcastBusy: true, host: { memberships: { some: { groupId: { in: groupIds } } } } }
      ]
    };

    const [total, authorizedEvents] = await prisma.$transaction([
      prisma.event.count({ where: whereClause }),
      prisma.event.findMany({
        where: whereClause,
        include: { 
          wrappedKeys: { where: { userId } }, 
          pollOptions: true,
          mutedBy: { where: { userId }, select: { userId: true } } // Phase 8.2: Fetch mute explicitly for this user
        },
        skip: offset,
        take: limit
      })
    ]);

    const sanitizedEvents = authorizedEvents.map(event => {
      const isHost = event.hostId === userId;
      const hasWrappedKey = event.wrappedKeys && event.wrappedKeys.length > 0;
      
      // Inject muted status logic
      const isMuted = event.mutedBy && event.mutedBy.length > 0;
      const finalEventData = { ...event, isMuted };

      if (!isHost && !hasWrappedKey) {
        return { ...finalEventData, encryptedPayload: null, startTime: null, endTime: null, pollOptions: [] };
      }
      return finalEventData;
    });

    res.send({ data: sanitizedEvents, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// Export External Calendar Feed (Phase 8.1)
// Generates an .ics file of authorized events for external sync (Google/Apple).
// Preserves zero-trust by stripping all encrypted metadata, title, and description.
// Only outputs raw busy/free times with generic "Kinship Event" titles.
app.get('/v1/users/:userId/calendar.ics', async (req, res, next) => {
  const { userId } = req.params;
  try {
    const userGroups = await prisma.groupMembership.findMany({
      where: { userId }, select: { groupId: true }
    });
    const groupIds = userGroups.map(g => g.groupId);

    const whereClause = {
      OR: [
        { hostId: userId },
        { wrappedKeys: { some: { userId } } },
        { broadcastBusy: true, host: { memberships: { some: { groupId: { in: groupIds } } } } }
      ]
    };

    const authorizedEvents = await prisma.event.findMany({
      where: whereClause,
      select: { id: true, startTime: true, endTime: true, broadcastBusy: true }
    });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kinship//E2EE Calendar Sync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    const formatDate = (date) => {
      const d = new Date(date);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    for (const event of authorizedEvents) {
      if (!event.startTime || !event.endTime) continue;
      
      icsContent += [
        'BEGIN:VEVENT',
        `UID:kinship-event-${event.id}`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(event.startTime)}`,
        `DTEND:${formatDate(event.endTime)}`,
        'SUMMARY:Kinship Event', // Hardcoded to preserve zero-trust
        'DESCRIPTION:Encrypted logistical event from your Kinship network.',
        'LOCATION:Kinship E2EE',
        'STATUS:CONFIRMED',
        `TRANSP:${event.broadcastBusy ? 'OPAQUE' : 'TRANSPARENT'}`,
        'END:VEVENT'
      ].join('\r\n') + '\r\n';
    }

    icsContent += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="kinship-${userId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
});

// --- Virtual Asset Inventory ---

// Register a new Asset with Encrypted Metadata
app.post('/v1/assets', async (req, res, next) => {
  const { ownerId, groupId, encryptedMetadata, visibilityLayer, autoApproveLayer, status, requiresHighCapacity, wrappedKeys } = req.body;
  try {
    const asset = await prisma.asset.create({
      data: {
        ownerId,
        groupId,
        encryptedMetadata,
        visibilityLayer: visibilityLayer || TRUST_LAYERS.INNER_CIRCLE,
        autoApproveLayer: autoApproveLayer || TRUST_LAYERS.INNER_CIRCLE,
        status: status || 'AVAILABLE',
        requiresHighCapacity: requiresHighCapacity || false,
        wrappedKeys: {
          create: wrappedKeys || []
        }
      }
    });
    res.send(asset);
  } catch (error) {
    next(error);
  }
});

// Upload encrypted binary photo blob
app.post('/v1/assets/:id/photo', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res, next) => {
  const { id } = req.params;
  try {
    const asset = await prisma.asset.update({
      where: { id },
      data: { encryptedPhotoBlob: req.body }
    });
    res.send({ success: true, assetId: asset.id });
  } catch (error) {
    next(error);
  }
});

// Retrieve encrypted binary photo blob
app.get('/v1/assets/:id/photo', async (req, res, next) => {
  const { id } = req.params;
  try {
    const asset = await prisma.asset.findUnique({ where: { id }, select: { encryptedPhotoBlob: true } });
    if (!asset || !asset.encryptedPhotoBlob) {
      return res.status(404).send({ error: 'Photo not found' });
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(asset.encryptedPhotoBlob);
  } catch (error) {
    next(error);
  }
});

// Fetch Asset Catalog for a User — 6.1: paginated
app.get('/v1/assets/catalog/:userId', async (req, res, next) => {
  const { userId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  try {
    const userGroups = await prisma.groupMembership.findMany({
      where: { userId }, select: { groupId: true }
    });
    const groupIds = userGroups.map(g => g.groupId);

    const whereClause = { OR: [{ ownerId: userId }, { groupId: { in: groupIds } }] };

    const allAssets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        owner: { select: { email: true, socialBattery: true } },
        group: { select: { name: true } },
        wrappedKeys: { where: { userId } }
      }
    });

    // Inter-Module Automation: hide high-capacity assets when owner battery < 20
    const filteredAssets = allAssets.filter(asset => {
      if (asset.requiresHighCapacity && asset.owner.socialBattery !== null && asset.owner.socialBattery < SOCIAL_BATTERY.CRITICAL_THRESHOLD) return false;
      return true;
    });

    const total = filteredAssets.length;
    const pageData = filteredAssets.slice(offset, offset + limit);
    res.send({ data: pageData, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// Submit a Loan Request
app.post('/v1/loan-requests', async (req, res, next) => {
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
    next(error);
  }
});

// Get Loan Requests for a User (Borrowed by them OR Requested of their assets) — 6.1: paginated
app.get('/v1/loan-requests/:userId', async (req, res, next) => {
  const { userId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  try {
    const whereClause = { OR: [{ borrowerId: userId }, { asset: { ownerId: userId } }] };
    const [total, loans] = await prisma.$transaction([
      prisma.loanRequest.count({ where: whereClause }),
      prisma.loanRequest.findMany({
        where: whereClause,
        include: {
          asset: { select: { id: true, ownerId: true, encryptedMetadata: true, status: true } },
          borrower: { select: { email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      })
    ]);
    res.send({ data: loans, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// Update Loan Request Status (Approve/Reject/Return)
app.patch('/v1/loan-requests/:id', async (req, res, next) => {
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
    next(error);
  }
});

// --- Collective Treasury ---

// Create a new Treasury Pool (crowdfunding campaign) for a Group
app.post('/v1/treasury/pools', async (req, res, next) => {
  const { groupId, title, description, goalAmount } = req.body;
  if (!groupId || !title || !goalAmount) return res.status(400).send({ error: 'Missing required fields' });
  try {
    const pool = await prisma.treasuryPool.create({
      data: { groupId, title, description, goalAmount }
    });
    res.send(pool);
  } catch (error) {
    next(error);
  }
});

// Get all Treasury Pools for a Group — 6.1: paginated
app.get('/v1/treasury/pools/:groupId', async (req, res, next) => {
  const { groupId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  try {
    const whereClause = { groupId };
    const [total, pools] = await prisma.$transaction([
      prisma.treasuryPool.count({ where: whereClause }),
      prisma.treasuryPool.findMany({
        where: whereClause,
        include: { _count: { select: { ledgerEntries: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      })
    ]);
    res.send({ data: pools, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// Submit a pledge (LedgerEntry) — atomically updates pool balance
app.post('/v1/treasury/pledge', async (req, res, next) => {
  const { poolId, contributorId, amount, memo } = req.body;
  if (!poolId || !contributorId || !amount || amount <= 0) {
    return res.status(400).send({ error: 'Missing or invalid pledge fields' });
  }
  try {
    const [ledgerEntry, updatedPool] = await prisma.$transaction([
      prisma.ledgerEntry.create({
        data: { poolId, contributorId, amount, memo }
      }),
      prisma.treasuryPool.update({
        where: { id: poolId },
        data: {
          currentAmount: { increment: amount },
          // Automatically mark as FUNDED when goal is reached
          status: undefined // Handled via a secondary check below
        }
      })
    ]);

    // Check if goal is now met and set FUNDED status
    if (updatedPool.currentAmount >= updatedPool.goalAmount && updatedPool.status === 'ACTIVE') {
      await prisma.treasuryPool.update({
        where: { id: poolId },
        data: { status: 'FUNDED' }
      });
    }

    res.send({ ledgerEntry, pool: updatedPool });
  } catch (error) {
    next(error);
  }
});

// Get the transparent ledger for a specific Pool — 6.1: paginated
app.get('/v1/treasury/pools/:poolId/ledger', async (req, res, next) => {
  const { poolId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit || `${PAGINATION.DEFAULT_LIMIT}`, 10), PAGINATION.MAX_LIMIT);
  const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
  try {
    const pool = await prisma.treasuryPool.findUnique({ where: { id: poolId } });
    if (!pool) return res.status(404).send({ error: 'Pool not found' });

    const [total, ledgerEntries] = await prisma.$transaction([
      prisma.ledgerEntry.count({ where: { poolId } }),
      prisma.ledgerEntry.findMany({
        where: { poolId },
        include: { contributor: { select: { email: true } } },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      })
    ]);

    res.send({ data: { ...pool, ledgerEntries }, meta: { total, limit, offset } });
  } catch (error) {
    next(error);
  }
});

// --- Key Rotation (Phase 5.5) ---

// Initiate a key rotation: creates a KeyRotationRequest signal and returns
// all current group member public keys so the client can re-wrap the group symmetric key.
app.post('/v1/groups/:id/rotate-keys', async (req, res, next) => {
  const { id: groupId } = req.params;
  const { requestedByUserId } = req.body;
  if (!requestedByUserId) return res.status(400).send({ error: 'requestedByUserId is required' });

  try {
    // Create signal record
    const rotationRequest = await prisma.keyRotationRequest.create({
      data: { groupId, requestedByUserId }
    });

    // Fetch all current group memberships with their public keys so the client can re-wrap
    const members = await prisma.groupMembership.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, email: true, publicKey: true } }
      }
    });

    res.send({ rotationRequest, members: members.map(m => m.user) });
  } catch (error) {
    next(error);
  }
});

// Accept a batch of re-wrapped keys for all events in a group.
// The client re-encrypts the group's AES-GCM symmetric key with each member's current RSA public key.
app.post('/v1/groups/:id/wrapped-keys', async (req, res, next) => {
  const { id: groupId } = req.params;
  const { wrappedKeys } = req.body; // Array of { eventId, userId, encryptedSymmetricKey }

  if (!wrappedKeys || !Array.isArray(wrappedKeys) || wrappedKeys.length === 0) {
    return res.status(400).send({ error: 'wrappedKeys array is required' });
  }

  try {
    // Upsert each wrapped key — replace existing entries for this (eventId, userId) pair
    const upserts = wrappedKeys.map(({ eventId, userId, encryptedSymmetricKey }) =>
      prisma.wrappedKey.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: { encryptedSymmetricKey },
        create: { eventId, userId, encryptedSymmetricKey }
      })
    );

    const results = await prisma.$transaction(upserts);
    res.send({ updated: results.length });
  } catch (error) {
    next(error);
  }
});

// --- Shared Lists & Chores (Phase 8.4) ---

// Get all lists for a group
app.get('/v1/groups/:groupId/lists', async (req, res, next) => {
  const { groupId } = req.params;
  try {
    const lists = await prisma.list.findMany({
      where: { groupId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.send(lists);
  } catch (error) {
    next(error);
  }
});

// Create a new list
app.post('/v1/groups/:groupId/lists', async (req, res, next) => {
  const { groupId } = req.params;
  const { type } = req.body;
  try {
    const list = await prisma.list.create({
      data: { groupId, type: type || 'TODO' },
      include: { items: true }
    });
    res.send(list);
  } catch (error) {
    next(error);
  }
});

// Add an item to a list
app.post('/v1/groups/:groupId/lists/:listId/items', async (req, res, next) => {
  const { listId } = req.params;
  const { encryptedPayload } = req.body;
  if (!encryptedPayload) return res.status(400).send({ error: 'encryptedPayload is required' });

  try {
    const item = await prisma.listItem.create({
      data: { listId, encryptedPayload }
    });
    // Optional: add SSE fanout broadcast here for realtime list updates
    res.send(item);
  } catch (error) {
    next(error);
  }
});

// Toggle an item's completion status
app.patch('/v1/groups/:groupId/lists/:listId/items/:itemId', async (req, res, next) => {
  const { itemId } = req.params;
  const { completed, completedById } = req.body;
  try {
    const item = await prisma.listItem.update({
      where: { id: itemId },
      data: { completed, completedById: completed ? completedById : null }
    });
    res.send(item);
  } catch (error) {
    next(error);
  }
});

// Delete an item from a list
app.delete('/v1/groups/:groupId/lists/:listId/items/:itemId', async (req, res, next) => {
  const { itemId } = req.params;
  try {
    await prisma.listItem.delete({ where: { id: itemId } });
    res.send({ success: true, deletedId: itemId });
  } catch (error) {
    next(error);
  }
});

// --- Cooperative Economy: Slicing Pie (Phase 10.1) ---

// Get all Equity Projects for a group
app.get('/v1/groups/:groupId/projects', async (req, res, next) => {
  const { groupId } = req.params;
  try {
    const projects = await prisma.equityProject.findMany({
      where: { groupId },
      include: {
        _count: { select: { contributions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.send(projects);
  } catch (error) {
    next(error);
  }
});

// Create a new Equity Project
app.post('/v1/groups/:groupId/projects', async (req, res, next) => {
  const { groupId } = req.params;
  const { name, description, createdById } = req.body;
  
  if (!name || !createdById) return res.status(400).send({ error: 'name and createdById are required' });
  
  try {
    const project = await prisma.equityProject.create({
      data: { groupId, name, description, createdById }
    });
    res.send(project);
  } catch (error) {
    next(error);
  }
});

// Get all contributions for a specific project
app.get('/v1/projects/:projectId/contributions', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const contributions = await prisma.equityContribution.findMany({
      where: { projectId },
      include: { contributor: { select: { email: true } } },
      orderBy: { date: 'desc' }
    });
    res.send(contributions);
  } catch (error) {
    next(error);
  }
});

// Log a new Equity Contribution (Slicing Pie)
app.post('/v1/projects/:projectId/contributions', async (req, res, next) => {
  const { projectId } = req.params;
  const { contributorId, type, description, fairMarketValue, riskMultiplier, date } = req.body;
  
  if (!contributorId || !type || !description || fairMarketValue === undefined || riskMultiplier === undefined || !date) {
    return res.status(400).send({ error: 'Missing required contribution fields' });
  }

  try {
    const slices = fairMarketValue * riskMultiplier;
    const contribution = await prisma.equityContribution.create({
      data: { 
        projectId, 
        contributorId, 
        type, 
        description, 
        fairMarketValue, 
        riskMultiplier, 
        slices, 
        date: new Date(date) 
      }
    });
    res.send(contribution);
  } catch (error) {
    next(error);
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Kinship API listening on port ${port}`);
  });
}

// 404 catch-all: structured JSON for unknown routes
app.use((req, res, next) => {
  next({ status: HTTP_STATUS.NOT_FOUND, message: `Route not found: ${req.method} ${req.path}` });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;

