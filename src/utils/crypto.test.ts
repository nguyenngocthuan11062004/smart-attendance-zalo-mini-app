import { describe, it, expect } from "vitest";
import {
  generateNonce,
  signPayload,
  verifySignature,
  createQRContent,
} from "./crypto";

const TEST_SECRET = "test-hmac-secret-key";

describe("generateNonce", () => {
  it("returns a hex string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[0-9a-f]+$/);
  });

  it("returns 32 hex chars (16 bytes)", () => {
    expect(generateNonce()).toHaveLength(32);
  });

  it("generates unique values", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe("signPayload", () => {
  const data = {
    type: "teacher",
    sessionId: "session_001",
    userId: "user_001",
    timestamp: 1700000000000,
    nonce: "abc123",
  };

  it("returns a hex string", () => {
    const sig = signPayload(data, TEST_SECRET);
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });

  it("returns consistent results for same input", () => {
    const sig1 = signPayload(data, TEST_SECRET);
    const sig2 = signPayload(data, TEST_SECRET);
    expect(sig1).toBe(sig2);
  });

  it("produces different signatures for different secrets", () => {
    const sig1 = signPayload(data, "secret-a");
    const sig2 = signPayload(data, "secret-b");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different data", () => {
    const sig1 = signPayload(data, TEST_SECRET);
    const sig2 = signPayload({ ...data, userId: "user_002" }, TEST_SECRET);
    expect(sig1).not.toBe(sig2);
  });
});

describe("verifySignature", () => {
  const data = {
    type: "teacher",
    sessionId: "session_001",
    userId: "user_001",
    timestamp: 1700000000000,
    nonce: "abc123",
  };

  it("returns true for valid signature", () => {
    const sig = signPayload(data, TEST_SECRET);
    expect(verifySignature(data, sig, TEST_SECRET)).toBe(true);
  });

  it("returns false for wrong signature", () => {
    expect(verifySignature(data, "invalid-signature", TEST_SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const sig = signPayload(data, TEST_SECRET);
    expect(verifySignature(data, sig, "wrong-secret")).toBe(false);
  });

  it("returns false for tampered data", () => {
    const sig = signPayload(data, TEST_SECRET);
    const tampered = { ...data, userId: "hacker" };
    expect(verifySignature(tampered, sig, TEST_SECRET)).toBe(false);
  });
});

describe("createQRContent", () => {
  it("returns valid JSON", () => {
    const content = createQRContent("teacher", "session_001", "user_001", TEST_SECRET);
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("includes all required fields", () => {
    const content = createQRContent("teacher", "session_001", "user_001", TEST_SECRET);
    const parsed = JSON.parse(content);

    expect(parsed.type).toBe("teacher");
    expect(parsed.sessionId).toBe("session_001");
    expect(parsed.userId).toBe("user_001");
    expect(parsed.timestamp).toBeTypeOf("number");
    expect(parsed.nonce).toBeTypeOf("string");
    expect(parsed.signature).toBeTypeOf("string");
  });

  it("creates verifiable signature", () => {
    const content = createQRContent("peer", "session_002", "user_002", TEST_SECRET);
    const parsed = JSON.parse(content);

    expect(
      verifySignature(
        {
          type: parsed.type,
          sessionId: parsed.sessionId,
          userId: parsed.userId,
          timestamp: parsed.timestamp,
          nonce: parsed.nonce,
        },
        parsed.signature,
        TEST_SECRET
      )
    ).toBe(true);
  });

  it("fails verification with wrong secret", () => {
    const content = createQRContent("teacher", "s1", "u1", TEST_SECRET);
    const parsed = JSON.parse(content);

    expect(
      verifySignature(parsed, parsed.signature, "wrong-secret")
    ).toBe(false);
  });
});
