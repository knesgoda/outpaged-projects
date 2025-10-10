import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { SecurityProvider, useSecurity } from '../SecurityProvider';

const useAuthMock = jest.fn();
const toastMock = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock()
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: (options: unknown) => toastMock(options),
  useToast: () => ({ toast: toastMock })
}));

const originalFetch = global.fetch;

function TestComponent() {
  const { auditLog } = useSecurity();

  useEffect(() => {
    auditLog('test_action', 'test_resource');
  }, [auditLog]);

  return null;
}

describe('SecurityProvider audit logging', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@outpaged.com'
      }
    });
    toastMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.VITE_AUDIT_CLIENT_ENABLED;
    delete process.env.VITE_AUDIT_SERVICE_URL;
    delete process.env.VITE_AUDIT_SERVICE_TOKEN;

    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (global as typeof globalThis & { fetch?: typeof fetch }).fetch;
    }
  });

  it('does not call the audit service when the client is disabled', async () => {
    process.env.VITE_AUDIT_CLIENT_ENABLED = 'false';
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
    });
  });

  it('surfaces audit failures when the backend is unavailable', async () => {
    process.env.VITE_AUDIT_CLIENT_ENABLED = 'true';
    process.env.VITE_AUDIT_SERVICE_URL = 'https://example.com/audit';

    const fetchSpy = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: jest.fn().mockResolvedValue({ message: 'maintenance' })
    });

    global.fetch = fetchSpy as unknown as typeof fetch;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SecurityProvider>
        <TestComponent />
      </SecurityProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Audit logging failed',
          description: expect.stringContaining('Service Unavailable')
        })
      );
    });

    consoleError.mockRestore();
  });
});
