// tests/unit/middleware.test.js — Unit tests for auth middleware
const { authenticate, requireRole } = require("../../src/middleware/auth.middleware");
const { generateToken } = require("../../src/utils/jwt");

beforeAll(() => {
  process.env.JWT_SECRET = "middleware-test-secret";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// Helper to build mock req/res/next
const mockReqResNext = (headers = {}) => {
  const req = { headers, user: null };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe("authenticate middleware", () => {
  it("should call next() and set req.user when token is valid", () => {
    const token = generateToken({ userId: "u1", role: "user" });
    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe("u1");
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header is missing", () => {
    const { req, res, next } = mockReqResNext({});

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header does not start with Bearer", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Basic abc123" });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid/tampered", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Bearer invalid.token.here" });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 when token is expired", async () => {
    const token = generateToken({ userId: "exp" }, "1ms");
    await new Promise((r) => setTimeout(r, 50));

    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireRole middleware", () => {
  it("should call next() when user has the required role", () => {
    const req = { user: { userId: "u1", role: "admin" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRole("admin")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 403 when user does not have the required role", () => {
    const req = { user: { userId: "u2", role: "user" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when req.user is not set", () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow multiple roles and accept any matching role", () => {
    const req = { user: { userId: "u3", role: "moderator" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRole("admin", "moderator")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
