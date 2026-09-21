import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("mescla classes condicionais e remove duplicatas do Tailwind", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
  });
});
