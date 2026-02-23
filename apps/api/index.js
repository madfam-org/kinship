const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
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
// returns any event where the user has a WrappedKey or is the host
app.get('/v1/events/authorized/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const authorizedEvents = await prisma.event.findMany({
      where: {
        OR: [
          { hostId: userId },
          { wrappedKeys: { some: { userId } } }
        ]
      },
      include: {
        wrappedKeys: {
          where: { userId }
        }
      }
    });
    res.send(authorizedEvents);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Kinship API listening on port ${port}`);
});

