/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    // Resolve Next.js @/ path alias
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub CSS/image imports
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/fileMock.cjs',
    '\\.(jpg|jpeg|png|gif|svg|ico|webp)$': '<rootDir>/src/__tests__/__mocks__/fileMock.cjs',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
      diagnostics: false,
    }],
  },
};

module.exports = config;
