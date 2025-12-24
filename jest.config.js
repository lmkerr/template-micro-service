/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@middy/core$': '<rootDir>/src/__mocks__/@middy/core.ts',
    '^@middy/http-header-normalizer$': '<rootDir>/src/__mocks__/@middy/http-header-normalizer.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.type.ts',
    '!src/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 95, // Slightly lower due to defensive ternaries in validation error handlers
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
