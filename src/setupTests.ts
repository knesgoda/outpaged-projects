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
