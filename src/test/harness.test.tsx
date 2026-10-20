import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

// Harness smoke test (T1): proves Vitest, the jsdom environment, the TSX
// transform and @testing-library/react all work together.
function HarnessProbe() {
  return <span>vitest-harness-ok</span>;
}

describe("vitest harness", () => {
  it("executes a real assertion in the jsdom environment", () => {
    expect(typeof document.createElement("div").outerHTML).toBe("string");

    render(<HarnessProbe />);
    expect(screen.getByText("vitest-harness-ok")).toBeInTheDocument();
  });
});
