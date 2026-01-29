module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'test/**/*.(t|j)s',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/database/',
    'integration.spec.ts',
    'e2e-spec.ts',
  ],
};
