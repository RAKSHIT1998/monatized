import { describe, expect, it } from "vitest";
import { businessBasicsSchema, claimUsernameSchema } from "./onboarding";

describe("businessBasicsSchema", () => {
  it("requires at least one category", () => {
    const result = businessBasicsSchema.safeParse({ displayName: "Ada", categories: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a category outside the known list", () => {
    const result = businessBasicsSchema.safeParse({
      displayName: "Ada",
      categories: ["not-a-real-category"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a known category", () => {
    const result = businessBasicsSchema.safeParse({
      displayName: "Ada",
      categories: ["digital-products"],
    });
    expect(result.success).toBe(true);
  });
});

describe("claimUsernameSchema", () => {
  it("rejects usernames with symbols or spaces", () => {
    expect(claimUsernameSchema.safeParse({ username: "ada creator" }).success).toBe(false);
    expect(claimUsernameSchema.safeParse({ username: "ada_creator" }).success).toBe(false);
    expect(claimUsernameSchema.safeParse({ username: "ada.creator" }).success).toBe(false);
  });

  it("accepts lowercase alphanumeric usernames and lowercases input", () => {
    const result = claimUsernameSchema.safeParse({ username: "AdaCreator1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("adacreator1");
    }
  });

  it("enforces a 3-20 character length", () => {
    expect(claimUsernameSchema.safeParse({ username: "ab" }).success).toBe(false);
    expect(claimUsernameSchema.safeParse({ username: "a".repeat(21) }).success).toBe(false);
  });

  it("rejects a bio over 280 characters", () => {
    const result = claimUsernameSchema.safeParse({
      username: "adacreator",
      bio: "a".repeat(281),
    });
    expect(result.success).toBe(false);
  });
});
