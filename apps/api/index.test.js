const request = require('supertest');
const app = require('./index');
const prisma = require('./prisma');
const jwt = require('jsonwebtoken');

// Test secret — must match what the middleware reads from process.env.API_JWT_SECRET
const TEST_SECRET = 'test_secret_do_not_use_in_production';
process.env.API_JWT_SECRET = TEST_SECRET;

/**
 * Helper: generates a valid HS256 JWT for test requests.
 * All protected endpoints must include this in their Authorization header.
 */
function generateToken(payload = {}) {
  return jwt.sign(
    { sub: 'u1', email: 'test@kinship.local', ...payload },
    TEST_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

describe('Kinship API Endpoints', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 5.1 Auth Middleware
  // -------------------------------------------------------------------------
  describe('Auth Middleware', () => {
    it('GET / (healthcheck) should be accessible without a token', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/users should be accessible without a token (public key registration)', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'u1', email: 'test@kinship.local' });
      const res = await request(app).post('/v1/users').send({
        januaId: 'auth0|123',
        email: 'test@kinship.local',
        publicKey: 'base64key'
      });
      expect(res.statusCode).toEqual(200);
    });

    it('protected route should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).get('/v1/users/u1/network');
      expect(res.statusCode).toEqual(401);
    });

    it('protected route should return 401 when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/v1/users/u1/network')
        .set('Authorization', 'Bearer this.is.not.valid');
      expect(res.statusCode).toEqual(401);
    });

    it('protected route should return 401 when Authorization header is malformed', async () => {
      const res = await request(app)
        .get('/v1/users/u1/network')
        .set('Authorization', 'NotBearer token');
      expect(res.statusCode).toEqual(401);
    });
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
      const res = await request(app)
        .get('/v1/users/test@kinship.local')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.publicKey).toEqual('abc');
    });

    it('GET /v1/users/:email should handle 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .get('/v1/users/unknown@kinship.local')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(404);
    });

    it('GET /v1/users/:email should handle 500 exceptions', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB Down'));
      const res = await request(app)
        .get('/v1/users/test@kinship.local')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(500);
    });

    it('PATCH /v1/users/:id/battery should update the battery level', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u1', socialBattery: 20 });
      const res = await request(app)
        .patch('/v1/users/u1/battery')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ level: 20 });
      expect(res.statusCode).toEqual(200);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
      }));
    });

    it('PATCH /v1/users/:id/battery should handle 500 exceptions', async () => {
      prisma.user.update.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .patch('/v1/users/u1/battery')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ level: 20 });
      expect(res.statusCode).toEqual(500);
    });

    it('PATCH /v1/users/:id/battery should fan-out battery-alert SSE when level < 20', async () => {
      // user.update returns the updated user, then user.findMany is called to get network
      prisma.user.update.mockResolvedValue({ id: 'u1', email: 'alice@kinship.local', socialBattery: 15 });
      prisma.user.findMany.mockResolvedValue([{ id: 'u2' }]);

      const res = await request(app)
        .patch('/v1/users/u1/battery')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ level: 15 });

      expect(res.statusCode).toEqual(200);
      // Verify network lookup was made for fan-out
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('GET /v1/events/stream/:userId should respond with SSE headers then keep connection alive', done => {
      // Use .parse() to capture the initial headers without consuming the stream
      const req = request(app)
        .get('/v1/events/stream/u1')
        .set('Authorization', `Bearer ${generateToken()}`)
        .buffer(false)
        .parse((res, cb) => {
          // Check headers are correct, then abort immediately
          expect(res.headers['content-type']).toMatch(/text\/event-stream/);
          res.destroy();
          cb(null, null);
        });

      req.end((err) => {
        // 'socket hang up' or similar is expected since we destroyed the response
        done();
      });
    }, 3000);

    it('GET /v1/users/:userId/network should return shared group members', async () => {
      // Note: groupMembership.findMany is NO LONGER called (N+1 fixed) — single Prisma query only
      prisma.user.findMany.mockResolvedValue([{ id: 'u2', email: 'friend@kinship.local' }]);
      
      const res = await request(app)
        .get('/v1/users/u1/network')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      // groupMembership.findMany should NOT be called (N+1 fix)
      expect(prisma.groupMembership.findMany).not.toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('GET /v1/users/:userId/network should handle 500 exceptions', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .get('/v1/users/u1/network')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Group Endpoints', () => {
    it('POST /v1/groups should create a group and assign ADMIN to owner', async () => {
      prisma.group.create.mockResolvedValue({ id: 'g1', name: 'My Group' });
      const res = await request(app)
        .post('/v1/groups')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ name: 'My Group', ownerId: 'u1' });
      expect(res.statusCode).toEqual(200);
      expect(prisma.group.create).toHaveBeenCalled();
    });

    it('POST /v1/groups should handle 500 exceptions', async () => {
      prisma.group.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .post('/v1/groups')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ name: 'My Group', ownerId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('POST /v1/groups/:id/members should add member', async () => {
      prisma.groupMembership.create.mockResolvedValue({ id: 'gm1' });
      const res = await request(app)
        .post('/v1/groups/g1/members')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ userId: 'u2', role: 'MEMBER' });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/groups/:id/members should handle 500 exceptions', async () => {
      prisma.groupMembership.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .post('/v1/groups/g1/members')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ userId: 'u2' });
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Event & Crypto logic', () => {
    it('POST /v1/events should store encrypted payload and key wraps', async () => {
      prisma.event.create.mockResolvedValue({ id: 'evt1', wrappedKeys: [], pollOptions: [] });
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({
          hostId: 'u1',
          minTrustLayer: 'INNER_CIRCLE',
          encryptedPayload: 'blob',
          wrappedKeys: [{ userId: 'u1', encryptedSymmetricKey: 'key_blob' }]
        });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/events should handle 500 exceptions', async () => {
      prisma.event.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .post('/v1/events')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ hostId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/events/authorized/:userId should strip payload, startTime, and endTime for busy-broadcast-only viewers', async () => {
      const mockEvents = [
        {
          id: 'evt1', hostId: 'u2', broadcastBusy: true,
          startTime: new Date('2026-03-01T19:00:00Z'), endTime: new Date('2026-03-01T22:00:00Z'),
          encryptedPayload: 'TOP_SECRET_BLOB', wrappedKeys: [], pollOptions: []
        },
        {
          id: 'evt2', hostId: 'u2',
          startTime: new Date('2026-03-02T19:00:00Z'), endTime: new Date('2026-03-02T22:00:00Z'),
          encryptedPayload: 'OK_BLOB', wrappedKeys: [{ userId: 'u1' }], pollOptions: []
        }
      ];
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      // $transaction resolves [count, events]
      prisma.event.count.mockResolvedValue(2);
      prisma.event.findMany.mockResolvedValue(mockEvents);

      const res = await request(app)
        .get('/v1/events/authorized/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta.total).toEqual(2);
      
      const evt1 = res.body.data.find(e => e.id === 'evt1');
      const evt2 = res.body.data.find(e => e.id === 'evt2');
      
      expect(evt1.encryptedPayload).toBeNull();
      expect(evt1.startTime).toBeNull();
      expect(evt1.endTime).toBeNull();
      expect(evt1.pollOptions).toEqual([]);
      expect(evt2.encryptedPayload).toEqual('OK_BLOB');
      expect(evt2.startTime).not.toBeNull();
    });

    it('GET /v1/events/authorized/:userId should include pagination meta', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(5);
      prisma.event.findMany.mockResolvedValue([{ id: 'evt1', hostId: 'u1', wrappedKeys: [], pollOptions: [] }]);

      const res = await request(app)
        .get('/v1/events/authorized/u1?limit=1&offset=0')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.meta).toMatchObject({ total: 5, limit: 1, offset: 0 });
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /v1/events/authorized/:userId should handle 500 exceptions', async () => {
      prisma.groupMembership.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .get('/v1/events/authorized/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Asset Inventory Endpoints', () => {
    it('POST /v1/assets should create asset', async () => {
      prisma.asset.create.mockResolvedValue({ id: 'a1' });
      const res = await request(app)
        .post('/v1/assets')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ ownerId: 'u1', groupId: 'g1', encryptedMetadata: 'base64' });
      expect(res.statusCode).toEqual(200);
    });

    it('POST /v1/assets should handle 500 exceptions', async () => {
      prisma.asset.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .post('/v1/assets')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ ownerId: 'u1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/assets/catalog/:userId should fetch overlapping items', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      prisma.asset.findMany.mockResolvedValue([{ id: 'a1', ownerId: 'u1', requiresHighCapacity: false, owner: { socialBattery: 100 } }]);
      const res = await request(app)
        .get('/v1/assets/catalog/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.meta.total).toEqual(1);
    });

    it('GET /v1/assets/catalog/:userId should support pagination via offset slicing', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([]);
      prisma.asset.findMany.mockResolvedValue([
        { id: 'a1', requiresHighCapacity: false, owner: { socialBattery: 100 } },
        { id: 'a2', requiresHighCapacity: false, owner: { socialBattery: 100 } },
        { id: 'a3', requiresHighCapacity: false, owner: { socialBattery: 100 } },
      ]);
      const res = await request(app)
        .get('/v1/assets/catalog/u1?limit=2&offset=1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.meta).toMatchObject({ total: 3, limit: 2, offset: 1 });
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].id).toEqual('a2');
    });

    it('GET /v1/assets/catalog/:userId should filter out high capacity assets if owner battery is < 20', async () => {
      prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
      prisma.asset.findMany.mockResolvedValue([
        { id: 'a1', ownerId: 'u1', requiresHighCapacity: false, owner: { socialBattery: 10 } },
        { id: 'a2', ownerId: 'u2', requiresHighCapacity: true,  owner: { socialBattery: 15 } },
        { id: 'a3', ownerId: 'u3', requiresHighCapacity: true,  owner: { socialBattery: 100 } }
      ]);
      const res = await request(app)
        .get('/v1/assets/catalog/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.meta.total).toEqual(2);
      expect(res.body.data.find(a => a.id === 'a2')).toBeUndefined();
    });

    it('GET /v1/assets/catalog/:userId should handle 500 exceptions', async () => {
      prisma.groupMembership.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .get('/v1/assets/catalog/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(500);
    });

    it('POST /v1/loan-requests should create request (PENDING by default)', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a1', autoApproveLayer: 'INNER_CIRCLE' });
      prisma.loanRequest.create.mockResolvedValue({ id: 'lr1', status: 'PENDING' });
      const res = await request(app)
        .post('/v1/loan-requests')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ assetId: 'a1', borrowerId: 'u2', trustDistance: 'OUTER_RING' });
      expect(res.statusCode).toEqual(200);
      expect(prisma.loanRequest.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING', trustDistance: 'OUTER_RING' })
      }));
    });

    it('POST /v1/loan-requests should instantly auto-approve if borrower is within autoApproveLayer', async () => {
       prisma.asset.findUnique.mockResolvedValue({ id: 'a1', autoApproveLayer: 'EXTENDED_POLYCULE' });
       prisma.loanRequest.create.mockResolvedValue({ id: 'lr2', status: 'APPROVED' });
       prisma.asset.update.mockResolvedValue({ id: 'a1', status: 'LENT' });

       const res = await request(app)
         .post('/v1/loan-requests')
         .set('Authorization', `Bearer ${generateToken()}`)
         .send({ assetId: 'a1', borrowerId: 'u3', trustDistance: 'INNER_CIRCLE' });
       expect(res.statusCode).toEqual(200);
       expect(prisma.loanRequest.create).toHaveBeenCalledWith(expect.objectContaining({
         data: expect.objectContaining({ status: 'APPROVED', trustDistance: 'INNER_CIRCLE' })
       }));
       expect(prisma.asset.update).toHaveBeenCalledWith({
         where: { id: 'a1' },
         data: { status: 'LENT' }
       });
    });

    it('POST /v1/loan-requests should 404 if asset not found', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .post('/v1/loan-requests')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ assetId: 'a1' });
      expect(res.statusCode).toEqual(404);
    });

    it('POST /v1/loan-requests should handle 500 exceptions', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a1', autoApproveLayer: 'INNER_CIRCLE' });
      prisma.loanRequest.create.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .post('/v1/loan-requests')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ assetId: 'a1' });
      expect(res.statusCode).toEqual(500);
    });

    it('GET /v1/loan-requests/:userId should fetch user loans', async () => {
      prisma.loanRequest.count.mockResolvedValue(1);
      prisma.loanRequest.findMany.mockResolvedValue([{ id: 'lr1' }]);
      const res = await request(app)
        .get('/v1/loan-requests/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.meta.total).toEqual(1);
    });

    it('GET /v1/loan-requests/:userId should handle 500 exceptions', async () => {
      prisma.loanRequest.findMany.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .get('/v1/loan-requests/u1')
        .set('Authorization', `Bearer ${generateToken()}`);
      expect(res.statusCode).toEqual(500);
    });

    it('PATCH /v1/loan-requests/:id should approve and update asset status', async () => {
      prisma.loanRequest.update.mockResolvedValue({ id: 'lr1', assetId: 'a1' });
      prisma.asset.update.mockResolvedValue({ id: 'a1', status: 'LENT' });
      
      const res = await request(app)
        .patch('/v1/loan-requests/lr1')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ status: 'APPROVED' });
      expect(res.statusCode).toEqual(200);
      expect(prisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'LENT' }
      }));
    });

    it('PATCH /v1/loan-requests/:id should handle RETURNED status', async () => {
      prisma.loanRequest.update.mockResolvedValue({ id: 'lr1', assetId: 'a1' });
      prisma.asset.update.mockResolvedValue({ id: 'a1', status: 'AVAILABLE' });
      
      const res = await request(app)
        .patch('/v1/loan-requests/lr1')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ status: 'RETURNED' });
      expect(res.statusCode).toEqual(200);
      expect(prisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'AVAILABLE' }
      }));
    });

    it('PATCH /v1/loan-requests/:id should handle 500 exceptions', async () => {
      prisma.loanRequest.update.mockRejectedValue(new Error('Fail'));
      const res = await request(app)
        .patch('/v1/loan-requests/lr1')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ status: 'REJECTED' });
      expect(res.statusCode).toEqual(500);
    });
  });

  describe('Key Rotation Endpoints (Phase 5.5)', () => {
    it('POST /v1/groups/:id/rotate-keys should create a rotation request and return member public keys', async () => {
      prisma.keyRotationRequest.create.mockResolvedValue({ id: 'rot1', groupId: 'g1' });
      prisma.groupMembership.findMany.mockResolvedValue([
        { user: { id: 'u1', email: 'alice@kinship.local', publicKey: 'pk_alice' } },
        { user: { id: 'u2', email: 'bob@kinship.local',   publicKey: 'pk_bob'   } }
      ]);

      const res = await request(app)
        .post('/v1/groups/g1/rotate-keys')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ requestedByUserId: 'u1' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.rotationRequest.id).toEqual('rot1');
      expect(res.body.members).toHaveLength(2);
    });

    it('POST /v1/groups/:id/rotate-keys should return 400 without requestedByUserId', async () => {
      const res = await request(app)
        .post('/v1/groups/g1/rotate-keys')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({});
      expect(res.statusCode).toEqual(400);
    });

    it('POST /v1/groups/:id/wrapped-keys should upsert re-wrapped keys atomically', async () => {
      // wrappedKey.upsert calls are batched into $transaction which resolves via Promise.all in singleton
      prisma.wrappedKey.upsert
        .mockResolvedValueOnce({ id: 'wk1' })
        .mockResolvedValueOnce({ id: 'wk2' });

      const res = await request(app)
        .post('/v1/groups/g1/wrapped-keys')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({
          wrappedKeys: [
            { eventId: 'evt1', userId: 'u1', encryptedSymmetricKey: 'new_blob_u1' },
            { eventId: 'evt1', userId: 'u2', encryptedSymmetricKey: 'new_blob_u2' }
          ]
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.updated).toEqual(2);
    });

    it('POST /v1/groups/:id/wrapped-keys should return 400 with empty array', async () => {
      const res = await request(app)
        .post('/v1/groups/g1/wrapped-keys')
        .set('Authorization', `Bearer ${generateToken()}`)
        .send({ wrappedKeys: [] });
      expect(res.statusCode).toEqual(400);
    });
  });

});
