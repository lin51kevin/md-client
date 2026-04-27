import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock document.elementFromPoint for drag-and-drop tests
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
