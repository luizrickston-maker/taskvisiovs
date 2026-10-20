import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest runs without `globals: true`, so @testing-library/react cannot
// register its own afterEach hook. Component tests rely on this cleanup.
afterEach(() => {
  cleanup();
});
