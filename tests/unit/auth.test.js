// tests/unit/auth.test.js — Unit tests for JWT utility
const { generateToken, verifyToken, decodeToken } = require("../../src/utils/jwt");

// Set a test secret before all tests
beforeAll(() => {
  process.env.JWT_SECRET = "unit-test-secret-key-for-testing-only";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe("generateToken()", () => {
  it("should generate a non-empty JWT string", () => {
    const token = generateToken({ userId: "123", email: "test@test.com" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should generate a token with three dot-separated parts (header.payload.signature)", () => {
    const token = generateToken({ userId: "abc" });
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("should encode the payload correctly", () => {
    const payload = { userId: "u42", email: "user@example.com", role: "admin" };
    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe("u42");
    expect(decoded.email).toBe("user@example.com");
    expect(decoded.role).toBe("admin");
  });

  it("should respect a custom expiry string", () => {
    const token = generateToken({ userId: "u1" }, "1h");
    const decoded = decodeToken(token);
    // iat + 3600 seconds ≈ exp
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it("should throw if JWT_SECRET is not set", () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    expect(() => generateToken({ userId: "x" })).toThrow(
      "JWT_SECRET environment variable is not set"
    );

    process.env.JWT_SECRET = original;
  });

  it("should generate different tokens for the same payload (due to iat)", async () => {
    const payload = { userId: "u99" };
    const token1 = generateToken(payload);
    // Small delay to guarantee different iat
    await new Promise((r) => setTimeout(r, 1100));
    const token2 = generateToken(payload);
    expect(token1).not.toBe(token2);
  });
});

describe("verifyToken()", () => {
  it("should return decoded payload for a valid token", () => {
    const token = generateToken({ userId: "v1", role: "user" });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe("v1");
    expect(decoded.role).toBe("user");
  });

  it("should throw JsonWebTokenError for a tampered token", () => {
    const token = generateToken({ userId: "hack" });
    const tampered = token.slice(0, -5) + "xxxxx";
    expect(() => verifyToken(tampered)).toThrow();
  });

  it("should throw for a completely invalid string", () => {
    expect(() => verifyToken("not.a.token")).toThrow();
  });

  it("should throw TokenExpiredError for an expired token", async () => {
    const token = generateToken({ userId: "exp" }, "1ms");
    await new Promise((r) => setTimeout(r, 50));
    expect(() => verifyToken(token)).toThrow("jwt expired");
  });
});
