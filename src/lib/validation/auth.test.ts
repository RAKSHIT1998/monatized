import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./auth";

describe("signupSchema", () => {
  it("accepts valid input and normalizes email", () => {
    const result = signupSchema.safeParse({
      name: "Ada Creator",
      email: "  ADA@Example.com  ",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("rejects a password under 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Ada Creator",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Ada Creator",
      email: "not-an-email",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    const result = signupSchema.safeParse({
      name: "A",
      email: "ada@example.com",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password but does not enforce length", () => {
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "x" }).success,
    ).toBe(true);
  });
});
