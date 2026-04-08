import { describe, it, expect, vi } from "vitest";
import { validateTeacherQR, validatePeerQR, parseQRContent } from "./validation";
import { signPayload } from "./crypto";
import type { QRPayload } from "@/types";

const SECRET = "test-secret";

function makePayload(overrides: Partial<QRPayload> = {}): QRPayload {
  const base = {
    type: "teacher" as const,
    sessionId: "session_001",
    userId: "teacher_001",
    timestamp: Date.now(),
    nonce: "testnonce123",
  };
  const signature = signPayload(base, SECRET);
  return { ...base, signature, ...overrides };
}

describe("validateTeacherQR", () => {
  it("accepts valid teacher QR", () => {
    const payload = makePayload();
    const result = validateTeacherQR(payload, SECRET);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects non-teacher type", () => {
    const payload = makePayload({ type: "peer" });
    const result = validateTeacherQR(payload, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("giảng viên");
  });

  it("rejects invalid signature", () => {
    const payload = makePayload({ signature: "invalid" });
    const result = validateTeacherQR(payload, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Chữ ký");
  });

  it("rejects expired QR (>90s)", () => {
    const base = {
      type: "teacher" as const,
      sessionId: "session_001",
      userId: "teacher_001",
      timestamp: Date.now() - 100_000, // 100s ago
      nonce: "testnonce",
    };
    const signature = signPayload(base, SECRET);
    const payload: QRPayload = { ...base, signature };

    const result = validateTeacherQR(payload, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hết hạn");
  });

  it("accepts QR within 90s", () => {
    const base = {
      type: "teacher" as const,
      sessionId: "session_001",
      userId: "teacher_001",
      timestamp: Date.now() - 50_000, // 50s ago
      nonce: "testnonce",
    };
    const signature = signPayload(base, SECRET);
    const payload: QRPayload = { ...base, signature };

    const result = validateTeacherQR(payload, SECRET);
    expect(result.valid).toBe(true);
  });
});

describe("validatePeerQR", () => {
  function makePeerPayload(overrides: Partial<QRPayload> = {}): QRPayload {
    const base = {
      type: "peer" as const,
      sessionId: "session_001",
      userId: "student_002",
      timestamp: Date.now(),
      nonce: "peernonce",
    };
    const signature = signPayload(base, SECRET);
    return { ...base, signature, ...overrides };
  }

  it("accepts valid peer QR", () => {
    const payload = makePeerPayload();
    const result = validatePeerQR(payload, "student_001", [], SECRET);
    expect(result.valid).toBe(true);
  });

  it("rejects non-peer type", () => {
    const payload = makePeerPayload({ type: "teacher" });
    const result = validatePeerQR(payload, "student_001", [], SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("sinh viên");
  });

  it("rejects self-scan", () => {
    const payload = makePeerPayload();
    const result = validatePeerQR(payload, "student_002", [], SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("chính mình");
  });

  it("rejects duplicate peer verification", () => {
    const payload = makePeerPayload();
    const existing = [
      { peerId: "student_002", peerName: "Test", verifiedAt: Date.now(), qrNonce: "n" },
    ];
    const result = validatePeerQR(payload, "student_001", existing, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("xác minh");
  });

  it("rejects expired peer QR", () => {
    const base = {
      type: "peer" as const,
      sessionId: "session_001",
      userId: "student_002",
      timestamp: Date.now() - 100_000,
      nonce: "peernonce",
    };
    const signature = signPayload(base, SECRET);
    const payload: QRPayload = { ...base, signature };

    const result = validatePeerQR(payload, "student_001", [], SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hết hạn");
  });
});

describe("parseQRContent", () => {
  it("parses valid QR JSON", () => {
    const payload: QRPayload = {
      type: "teacher",
      sessionId: "s1",
      userId: "u1",
      timestamp: 1700000000000,
      nonce: "n1",
      signature: "sig1",
    };
    const result = parseQRContent(JSON.stringify(payload));
    expect(result).toEqual(payload);
  });

  it("returns null for invalid JSON", () => {
    expect(parseQRContent("not json")).toBeNull();
    expect(parseQRContent("")).toBeNull();
    expect(parseQRContent("{broken")).toBeNull();
  });

  it("returns null for missing fields", () => {
    expect(parseQRContent(JSON.stringify({ type: "teacher" }))).toBeNull();
    expect(parseQRContent(JSON.stringify({ type: "teacher", sessionId: "s1" }))).toBeNull();
  });

  it("returns null for wrong field types", () => {
    const bad = {
      type: "teacher",
      sessionId: "s1",
      userId: "u1",
      timestamp: "not a number",
      nonce: "n1",
      signature: "sig1",
    };
    expect(parseQRContent(JSON.stringify(bad))).toBeNull();
  });
});
