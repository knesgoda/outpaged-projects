import "@testing-library/jest-dom";

jest.mock("@/integrations/supabase/client", () => {
  const createBuilder = () => {
    const builder: any = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      textSearch: jest.fn(() => builder),
      filter: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      or: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    };
    return builder;
  };

  return {
    supabaseConfigured: false,
    supabase: {
      from: jest.fn(() => createBuilder()),
    },
  };
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // ReactFlow relies on ResizeObserver for layout measurements during tests.
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserver,
    configurable: true,
    writable: true,
  });
}

const randomUUID = () => `test-uuid-${Math.random().toString(16).slice(2)}`;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: <T extends ArrayBufferView>(array: T) => array,
      randomUUID,
      subtle: {} as SubtleCrypto,
    } as unknown as Crypto,
    configurable: true,
  });
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: randomUUID,
    configurable: true,
  });
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
