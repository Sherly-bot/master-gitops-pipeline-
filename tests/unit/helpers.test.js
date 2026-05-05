// tests/unit/helpers.test.js — Unit tests for password hashing utility
const { hashPassword, comparePassword } = require("../../src/utils/password");

describe("hashPassword()", () => {
  it("should return a string that is different from the original password", async () => {
    const plain = "SuperSecret123!";
    const hashed = await hashPassword(plain);

    expect(typeof hashed).toBe("string");
    expect(hashed).not.toBe(plain);
  });

  it("should produce a bcrypt hash starting with $2a$ or $2b$ (bcrypt format)", async () => {
    const hashed = await hashPassword("TestPassword1");
    expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);
  });

  it("should produce different hashes for the same password (salt is random)", async () => {
    const plain = "SamePassword99";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    expect(hash1).not.toBe(hash2);
  });

  it("should throw if password is an empty string", async () => {
    await expect(hashPassword("")).rejects.toThrow(
      "Password must be a non-empty string"
    );
  });

  it("should throw if password is null", async () => {
    await expect(hashPassword(null)).rejects.toThrow();
  });

  it("should throw if password is a number, not a string", async () => {
    await expect(hashPassword(12345678)).rejects.toThrow();
  });
});

describe("comparePassword()", () => {
  let hashedPassword;

  beforeAll(async () => {
    hashedPassword = await hashPassword("CorrectPassword1!");
  });

  it("should return true when plain password matches the hash", async () => {
    const result = await comparePassword("CorrectPassword1!", hashedPassword);
    expect(result).toBe(true);
  });

  it("should return false when plain password does not match the hash", async () => {
    const result = await comparePassword("WrongPassword!", hashedPassword);
    expect(result).toBe(false);
  });

  it("should return false for empty password string", async () => {
    const result = await comparePassword("", hashedPassword);
    expect(result).toBe(false);
  });

  it("should return false if hashedPassword is empty", async () => {
    const result = await comparePassword("CorrectPassword1!", "");
    expect(result).toBe(false);
  });

  it("should return false if both arguments are null", async () => {
    const result = await comparePassword(null, null);
    expect(result).toBe(false);
  });

  it("should be case-sensitive", async () => {
    const resultLower = await comparePassword("correctpassword1!", hashedPassword);
    expect(resultLower).toBe(false);
  });
});
