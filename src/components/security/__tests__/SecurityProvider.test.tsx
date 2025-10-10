import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { SecurityProvider, useSecurity } from '../SecurityProvider';

const useAuthMock = jest.fn();
const toastMock = jest.fn();
const telemetryTrack = jest.fn();
const telemetryTrackError = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: (options: unknown) => toastMock(options),
  useToast: () => ({ toast: toastMock }),
}));

jest.mock('@/components/feature-flags/FeatureFlagProvider', () => ({
  useFeatureFlags: () => ({
    isEnabled: () => true,
  }),
}));

jest.mock('@/components/telemetry/TelemetryProvider', () => ({
  useTelemetry: () => ({
    track: telemetryTrack,
    trackError: telemetryTrackError,
    measure: (_: string, fn: () => Promise<unknown> | unknown) => Promise.resolve(fn()),
  }),
}));

jest.mock('@/domain/tenant', () => ({
  useTenant: () => ({
    organizationId: 'org-1',
    workspaceId: 'workspace-1',
    spaceId: null,
    userId: 'user-123',
    environment: 'development',
  }),
}));

function createQueryBuilder() {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: { role: 'admin', explicit_permissions: [] },
    error: null,
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq, maybeSingle });
  return { select, eq, maybeSingle };
}

jest.mock('@/domain/client', () => {
  const builder = createQueryBuilder();
  return {
    useDomainClient: () => ({
      raw: {
        from: jest.fn(() => ({
          select: builder.select,
          eq: builder.eq,
          maybeSingle: builder.maybeSingle,
        })),
      },
      scope: (_table: string, query: any) => query,
    }),
  };
});

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
    telemetryTrack.mockClear();
    telemetryTrackError.mockClear();
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
