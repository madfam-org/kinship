const prisma = require('./prisma');

jest.mock('./prisma', () => {
  return {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    group: {
      create: jest.fn(),
    },
    groupMembership: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      count:   jest.fn(),
    },
    asset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loanRequest: {
      create:   jest.fn(),
      findMany: jest.fn(),
      count:    jest.fn(),
      update:   jest.fn(),
    },
    treasuryPool: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
      count:  jest.fn(),
      findMany: jest.fn(),
    },
    wrappedKey: {
      upsert: jest.fn(),
    },
    keyRotationRequest: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(ops =>
      Array.isArray(ops) ? Promise.all(ops) : ops
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});
