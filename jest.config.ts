import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^jose$': '<rootDir>/test/mocks/jose.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/database/migrations/**/*.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
};

export default config;
