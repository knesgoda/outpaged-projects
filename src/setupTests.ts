import "@testing-library/jest-dom";

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
