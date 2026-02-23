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
      findUnique: jest.fn(),
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
      count: jest.fn(),
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
    mutedEvent: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    list: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    listItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    equityProject: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    equityContribution: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(ops =>
      Array.isArray(ops) ? Promise.all(ops) : ops
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});
