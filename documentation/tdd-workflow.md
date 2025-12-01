# Test Driven Development Workflow

For every new feature or bugfix, follow this TDD process:

## The 5 Steps

1. **Write Failing Test**
   - Create a test that correctly validates the desired functionality
   - The test should fail because the functionality doesn't exist yet

2. **Confirm Failure**
   - Run the test: `npm test -- --run [testfile]`
   - Verify it fails for the expected reason (not a syntax error or wrong setup)

3. **Minimal Implementation**
   - Write ONLY enough code to make the failing test pass
   - Resist the urge to add extra functionality

4. **Confirm Success**
   - Run the test again
   - Verify it passes

5. **Refactor**
   - Clean up the code if needed
   - Keep running tests to ensure they stay green

## Key Principles

- Never write production code without a failing test first
- Tests should test real behavior, not mocked behavior
- If you find yourself writing a test that tests mocked behavior, STOP and warn Alberto
- End-to-end tests must use real data and real APIs (no mocks)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run src/utils/__tests__/myfile.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage
```
