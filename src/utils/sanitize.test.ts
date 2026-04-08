import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  isValidClassCode,
  isValidMSSV,
  isValidPhone,
  isValidEmail,
  isValidDocId,
  sanitizeName,
  isValidQRPayload,
  isValidHUSTEmail,
  extractMSSV,
} from "./sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<b>hello</b>")).toBe("hello");
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("returns empty for tags only", () => {
    expect(sanitizeText("<br/><hr>")).toBe("");
  });
});

describe("isValidClassCode", () => {
  it("accepts valid codes", () => {
    expect(isValidClassCode("IT3080")).toBe(true);
    expect(isValidClassCode("AB")).toBe(true);
    expect(isValidClassCode("1234567890")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidClassCode("")).toBe(false);
    expect(isValidClassCode("A")).toBe(false); // too short
    expect(isValidClassCode("12345678901")).toBe(false); // too long
    expect(isValidClassCode("IT-3080")).toBe(false); // special char
    expect(isValidClassCode("IT 3080")).toBe(false); // space
  });
});

describe("isValidMSSV", () => {
  it("accepts valid MSSV (8 digits starting with 20)", () => {
    expect(isValidMSSV("20225413")).toBe(true);
    expect(isValidMSSV("20210001")).toBe(true);
    expect(isValidMSSV("20999999")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isValidMSSV(" 20225413 ")).toBe(true);
  });

  it("rejects invalid MSSV", () => {
    expect(isValidMSSV("")).toBe(false);
    expect(isValidMSSV("19225413")).toBe(false); // starts with 19
    expect(isValidMSSV("2022541")).toBe(false); // 7 digits
    expect(isValidMSSV("202254131")).toBe(false); // 9 digits
    expect(isValidMSSV("abcdefgh")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts valid Vietnamese phone numbers", () => {
    expect(isValidPhone("0367444143")).toBe(true);
    expect(isValidPhone("0912345678")).toBe(true);
    expect(isValidPhone("+84367444143")).toBe(true);
    expect(isValidPhone("0 367 444 143")).toBe(true); // with spaces
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("012345678")).toBe(false); // old format
    expect(isValidPhone("036744414")).toBe(false); // too short
    expect(isValidPhone("03674441430")).toBe(false); // too long
    expect(isValidPhone("1234567890")).toBe(false); // no prefix
  });
});

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.co")).toBe(true);
    expect(isValidEmail("thuan.nn225413@sis.hust.edu.vn")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("@no-local.com")).toBe(false);
    expect(isValidEmail("no-domain@")).toBe(false);
    expect(isValidEmail("spaces in@email.com")).toBe(false);
  });
});

describe("isValidDocId", () => {
  it("accepts valid Firestore doc IDs", () => {
    expect(isValidDocId("abc123")).toBe(true);
    expect(isValidDocId("session_001")).toBe(true);
    expect(isValidDocId("a-b-c")).toBe(true);
    expect(isValidDocId("x")).toBe(true);
  });

  it("rejects invalid doc IDs", () => {
    expect(isValidDocId("")).toBe(false);
    expect(isValidDocId("has space")).toBe(false);
    expect(isValidDocId("has.dot")).toBe(false);
    expect(isValidDocId("a".repeat(129))).toBe(false); // too long
  });
});

describe("sanitizeName", () => {
  it("allows Vietnamese names", () => {
    expect(sanitizeName("Nguyễn Ngọc Thuận")).toBe("Nguyễn Ngọc Thuận");
    expect(sanitizeName("Trần Thị B")).toBe("Trần Thị B");
  });

  it("strips special characters", () => {
    expect(sanitizeName("Hello@World!")).toBe("HelloWorld");
    expect(sanitizeName('<script>alert("xss")</script>')).toBe("scriptalertxssscript");
  });

  it("truncates to 100 chars", () => {
    const long = "A".repeat(200);
    expect(sanitizeName(long).length).toBe(100);
  });
});

describe("isValidQRPayload", () => {
  it("accepts valid objects", () => {
    expect(isValidQRPayload({ type: "teacher", sessionId: "s1" })).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidQRPayload(null)).toBe(false);
    expect(isValidQRPayload(undefined)).toBe(false);
    expect(isValidQRPayload("string")).toBe(false);
    expect(isValidQRPayload(42)).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const big = { data: "x".repeat(3000) };
    expect(isValidQRPayload(big)).toBe(false);
  });
});

describe("isValidHUSTEmail", () => {
  it("accepts valid HUST emails", () => {
    expect(isValidHUSTEmail("thuan.nn225413@sis.hust.edu.vn")).toBe(true);
    expect(isValidHUSTEmail("NAME.XX123456@SIS.HUST.EDU.VN")).toBe(true);
  });

  it("rejects non-HUST emails", () => {
    expect(isValidHUSTEmail("test@gmail.com")).toBe(false);
    expect(isValidHUSTEmail("test@hust.edu.vn")).toBe(false); // not sis.hust
    expect(isValidHUSTEmail("")).toBe(false);
  });
});

describe("extractMSSV", () => {
  it("extracts MSSV from HUST email", () => {
    expect(extractMSSV("thuan.nn225413@sis.hust.edu.vn")).toBe("20225413");
    expect(extractMSSV("name.ab123456@sis.hust.edu.vn")).toBe("20123456");
  });

  it("returns null for invalid emails", () => {
    expect(extractMSSV("test@gmail.com")).toBeNull();
    expect(extractMSSV("no-mssv@sis.hust.edu.vn")).toBeNull();
    expect(extractMSSV("")).toBeNull();
  });
});
