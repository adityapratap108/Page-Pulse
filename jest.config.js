/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['server/**/*.js'],
  verbose: true,
  // 10 second timeout per test (some integration tests do real network calls via supertest)
  testTimeout: 10000,
};
