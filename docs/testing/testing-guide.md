# Testing Guide

## Overview

This guide covers the testing infrastructure and best practices for OutPaged PM.

## Test Suites

### Unit Tests

Unit tests verify individual functions, components, and utilities in isolation.

**Location:** `src/**/__tests__/*.test.tsx`

**Framework:** Jest + React Testing Library

**Running Unit Tests:**
```bash
npm test
npm test -- --coverage
```

**Example Unit Test:**
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Location:** `src/**/__tests__/*.integration.test.tsx`

**Running Integration Tests:**
```bash
npm run test:integration
```

**Example Integration Test:**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDialog } from '@/components/kanban/TaskDialog';

describe('TaskDialog Integration', () => {
  it('creates a task successfully', async () => {
    const onSave = jest.fn();
    render(<TaskDialog onSave={onSave} />);
    
    await userEvent.type(screen.getByLabelText('Title'), 'New Task');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Task' })
      );
    });
  });
});
```

### E2E Tests

End-to-end tests verify complete user workflows across the application.

**Location:** `e2e/**/*.spec.ts`

**Framework:** Playwright

**Running E2E Tests:**
```bash
npm run test:e2e
npm run test:e2e -- --headed  # Run with browser visible
```

**Example E2E Test:**
```typescript
import { test, expect } from '@playwright/test';

test('create and complete a task', async ({ page }) => {
  await page.goto('/dashboard/board');
  
  // Create task
  await page.click('button:has-text("Create Task")');
  await page.fill('input[name="title"]', 'Test Task');
  await page.click('button:has-text("Save")');
  
  // Complete task
  await page.click('text=Test Task');
  await page.selectOption('select[name="status"]', 'done');
  await page.click('button:has-text("Save")');
  
  // Verify
  await expect(page.locator('.task-card:has-text("Test Task")')).toHaveClass(/done/);
});
```

### Accessibility Tests

Accessibility-focused unit tests leverage Jest, React Testing Library, and [`jest-axe`](https://github.com/nickcolley/jest-axe) for WCAG coverage.

**Location:** `src/components/**/__tests__/*accessibility.test.tsx`

**Running Accessibility Tests:**
```bash
npm test
```

**What They Cover:**
- Presence of skip links or other required keyboard affordances on interactive views.
- Automated axe-core assertions that fail the suite if ARIA relationships, color contrast, or landmark structure regresses.

## Coverage Requirements

- **Overall Coverage:** Minimum 80%
- **Critical Paths:** 100% coverage required
- **New Features:** Must include tests

**Check Coverage:**
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Best Practices

### 1. AAA Pattern
Arrange, Act, Assert pattern for clear test structure:

```typescript
test('adds two numbers', () => {
  // Arrange
  const a = 2;
  const b = 3;
  
  // Act
  const result = add(a, b);
  
  // Assert
  expect(result).toBe(5);
});
```

### 2. Test Isolation
Each test should be independent:

```typescript
beforeEach(() => {
  // Clean up before each test
  cleanup();
  resetMocks();
});
```

### 3. Descriptive Names
Use clear, descriptive test names:

```typescript
// Good
test('displays error message when email is invalid', () => {});

// Bad
test('validation', () => {});
```

### 4. Mock External Dependencies
Mock API calls, timers, and external services:

```typescript
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ data: [], error: null }))
    }))
  }
}));
```

### 5. Test User Behavior
Focus on user interactions, not implementation:

```typescript
// Good
await userEvent.click(screen.getByRole('button', { name: /submit/i }));

// Bad (testing implementation details)
wrapper.find('.submit-button').simulate('click');
```

## Performance Testing

### Load Testing
Use k6 for load testing:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  let response = http.get('https://your-app.com/api/tasks');
  check(response, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Lighthouse CI
Automated performance audits in CI:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Debug Mode
Run tests with Node debugger:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Test-Specific Logging
Use `screen.debug()` to see rendered output:

```typescript
test('renders correctly', () => {
  render(<MyComponent />);
  screen.debug(); // Prints HTML to console
});
```

## Security Testing

### OWASP ZAP
Run security scans:

```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.com \
  -r report.html
```

### Dependency Scanning
Check for vulnerable dependencies:

```bash
npm audit
npm audit fix
```

## Continuous Improvement

1. **Review Coverage Reports** - Identify gaps
2. **Update Tests** - When bugs are found, add tests
3. **Refactor Tests** - Keep tests maintainable
4. **Share Knowledge** - Document patterns and practices
5. **Automate Everything** - Run tests in CI/CD

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
