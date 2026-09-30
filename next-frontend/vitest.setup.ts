import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom ships no ResizeObserver; Radix UI primitives (@radix-ui/react-use-size,
// used by Checkbox and others) reference it at mount.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom ships no Pointer Events capture API; Radix UI Select (and other
// pointer-driven primitives) calls hasPointerCapture/setPointerCapture/
// releasePointerCapture on the trigger element when opening.
// Guarded by `typeof Element !== "undefined"` because this setup file also
// runs for the default `node` environment (non-jsdom `*.test.ts` files),
// where the `Element` global does not exist at all.
if (typeof Element !== "undefined") {
  if (typeof Element.prototype.hasPointerCapture === "undefined") {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof Element.prototype.setPointerCapture === "undefined") {
    Element.prototype.setPointerCapture = () => {};
  }
  if (typeof Element.prototype.releasePointerCapture === "undefined") {
    Element.prototype.releasePointerCapture = () => {};
  }

  // jsdom ships no scrollIntoView; Radix UI Select scrolls the highlighted
  // item into view when the listbox opens.
  if (typeof Element.prototype.scrollIntoView === "undefined") {
    Element.prototype.scrollIntoView = () => {};
  }
}

// Env vars required by lib/env.ts at module load in test runtime.
// Must be set before any module importing lib/env.ts is evaluated.
process.env.API_URL = process.env.API_URL ?? "http://nestjs-api:3000";
process.env.SESSION_PASSWORD =
  process.env.SESSION_PASSWORD ?? "test-session-secret-that-is-at-least-32ch";
