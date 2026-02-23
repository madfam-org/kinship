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
    },
    asset: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    loanRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    }
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});
