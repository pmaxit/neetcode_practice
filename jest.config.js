/** @type {import('jest').Config} */
export default {
    testEnvironment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    setupFilesAfterEnv: ['jest-canvas-mock'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },
    moduleFileExtensions: ['js', 'jsx', 'json'],
    testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.jsx']
};
