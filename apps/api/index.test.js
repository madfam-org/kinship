const request = require('supertest');
const app = require('./index');
const prisma = require('./prisma');

describe('Kinship API Endpoints', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthcheck', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('User Endpoints', () => {
    it('POST /v1/users should create or update a user', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'test@kinship.local' });
      
      const res = await request(app).post('/v1/users').send({
        januaId: 'auth0|123',
        email: 'test@kinship.local',
        publicKey: 'base64key'
      });
      
      expect(res.statusCode).toEqual(200);
      expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { januaId: 'auth0|123' }
      }));
    });

    it('POST /v1/users should fail without required fields', async () => {
      const res = await request(app).post('/v1/users').send({ email: 'test@kinship.local' });
      expect(res.statusCode).toEqual(400);
    });

    it('GET /v1/users/:email should return user public key', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', publicKey: 'abc' });
      const res = await request(app).get('/v1/users/test@kinship.local');
      expect(res.statusCode).toEqual(200);
      expect(res.body.publicKey).toEqual('abc');
    });

    it('GET /v1/users/:email should handle 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/v1/users/unknown@kinship.local');
      expect(res.statusCode).toEqual(404);
    });

    it('GET /v1/users/:email should handle 500 exceptions', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB Down'));
      const res = await request(app).get('/v1/users/test@kinship.local');
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/users/:userId/network should return shared group members', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      prisma.user.findMany.mockResolvedValue([{ id: 'u2', email: 'friend@kinship.local' }]);
      
      const res = await request(app).get('/v1/users/u1/network');
      expect(res.statusCode).toEqual(200);
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('GET /v1/users/:userId/network should handle 500 exceptions', async () => {
      prisma.groupMembership.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/v1/users/u1/network');
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Group Endpoints', () => {
    it('POST /v1/groups should create a group and assign ADMIN to owner', async () => {
      prisma.group.create.mockResolvedValue({ id: 'g1', name: 'My Group' });
      const res = await request(app).post('/v1/groups').send({ name: 'My Group', ownerId: 'u1' });
      expect(res.statusCode).toEqual(200);
      expect(prisma.group.create).toHaveBeenCalled();
    });

    it('POST /v1/groups should handle 500 exceptions', async () => {
      prisma.group.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app).post('/v1/groups').send({ name: 'My Group', ownerId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('POST /v1/groups/:id/members should add member', async () => {
      prisma.groupMembership.create.mockResolvedValue({ id: 'gm1' });
      const res = await request(app).post('/v1/groups/g1/members').send({ userId: 'u2', role: 'MEMBER' });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/groups/:id/members should handle 500 exceptions', async () => {
      prisma.groupMembership.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app).post('/v1/groups/g1/members').send({ userId: 'u2' });
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Event & Crypto logic', () => {
    it('POST /v1/events should store encrypted payload and key wraps', async () => {
      prisma.event.create.mockResolvedValue({ id: 'evt1' });
      const res = await request(app).post('/v1/events').send({
        hostId: 'u1',
        minTrustLayer: 'INNER_CIRCLE',
        encryptedPayload: 'blob',
        wrappedKeys: [{ userId: 'u1', encryptedSymmetricKey: 'key_blob' }]
      });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/events should handle 500 exceptions', async () => {
      prisma.event.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app).post('/v1/events').send({ hostId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/events/authorized/:userId should strip payload if user only sees busy broadcast', async () => {
      // Setup: Mock user belongs to a group, mock event returns as a busy broadcast where user is NOT the host and holds no wrapped key
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      prisma.event.findMany.mockResolvedValue([
        {
          id: 'evt1',
          hostId: 'u2', // Not u1
          broadcastBusy: true,
          encryptedPayload: 'TOP_SECRET_BLOB',
          wrappedKeys: [] // u1 has NO wrapped key
        },
        {
          id: 'evt2',
          hostId: 'u2',
          encryptedPayload: 'OK_BLOB',
          wrappedKeys: [{ userId: 'u1' }] // u1 holds a key
        }
      ]);

      const res = await request(app).get('/v1/events/authorized/u1');
      expect(res.statusCode).toEqual(200);
      
      const evt1 = res.body.find(e => e.id === 'evt1');
      const evt2 = res.body.find(e => e.id === 'evt2');
      
      // Crucial Security Assertion: The payload must be null for busy broadcasts to outer loops
      expect(evt1.encryptedPayload).toBeNull();
      // Crucial Security Assertion: The payload must remain for authorized holds
      expect(evt2.encryptedPayload).toEqual('OK_BLOB');
    });

    it('GET /v1/events/authorized/:userId should handle 500 exceptions', async () => {
      prisma.groupMembership.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/v1/events/authorized/u1');
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Asset Inventory Endpoints', () => {
    it('POST /v1/assets should create asset', async () => {
      prisma.asset.create.mockResolvedValue({ id: 'a1' });
      const res = await request(app).post('/v1/assets').send({
        ownerId: 'u1',
        groupId: 'g1',
        encryptedMetadata: 'base64'
      });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/assets should handle 500 exceptions', async () => {
      prisma.asset.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app).post('/v1/assets').send({ ownerId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/assets/catalog/:userId should fetch overlapping items', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      prisma.asset.findMany.mockResolvedValue([{ id: 'a1', ownerId: 'u1' }]);
      const res = await request(app).get('/v1/assets/catalog/u1');
      expect(res.statusCode).toEqual(200);
    });

    it('GET /v1/assets/catalog/:userId should handle 500 exceptions', async () => {
      prisma.groupMembership.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/v1/assets/catalog/u1');
      expect(res.statusCode).toEqual(500);
    });

    it('POST /v1/loan-requests should create request', async () => {
      prisma.loanRequest.create.mockResolvedValue({ id: 'lr1' });
      const res = await request(app).post('/v1/loan-requests').send({ assetId: 'a1', borrowerId: 'u2' });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/loan-requests should handle 500 exceptions', async () => {
      prisma.loanRequest.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app).post('/v1/loan-requests').send({ assetId: 'a1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/loan-requests/:userId should fetch user loans', async () => {
      prisma.loanRequest.findMany.mockResolvedValue([{ id: 'lr1' }]);
      const res = await request(app).get('/v1/loan-requests/u1');
      expect(res.statusCode).toEqual(200);
    });

    it('GET /v1/loan-requests/:userId should handle 500 exceptions', async () => {
      prisma.loanRequest.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/v1/loan-requests/u1');
      expect(res.statusCode).toEqual(500);
    });

    it('PATCH /v1/loan-requests/:id should approve and update asset status', async () => {
      prisma.loanRequest.update.mockResolvedValue({ id: 'lr1', assetId: 'a1' });
      prisma.asset.update.mockResolvedValue({ id: 'a1', status: 'LENT' });
      
      const res = await request(app).patch('/v1/loan-requests/lr1').send({ status: 'APPROVED' });
      expect(res.statusCode).toEqual(200);
      
      // Verify Side Effect
      expect(prisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'LENT' }
      }));
    });

    it('PATCH /v1/loan-requests/:id should handle RETURNED status', async () => {
      prisma.loanRequest.update.mockResolvedValue({ id: 'lr1', assetId: 'a1' });
      prisma.asset.update.mockResolvedValue({ id: 'a1', status: 'AVAILABLE' });
      
      const res = await request(app).patch('/v1/loan-requests/lr1').send({ status: 'RETURNED' });
      expect(res.statusCode).toEqual(200);
      
      // Verify Side Effect
      expect(prisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'AVAILABLE' }
      }));
    });

    it('PATCH /v1/loan-requests/:id should handle 500 exceptions', async () => {
      prisma.loanRequest.update.mockRejectedValue(new Error('Fail'));
      const res = await request(app).patch('/v1/loan-requests/lr1').send({ status: 'REJECTED' });
      expect(res.statusCode).toEqual(500);
    });
  });

});
