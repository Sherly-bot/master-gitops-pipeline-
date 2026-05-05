// tests/integration/api.routes.test.js — Integration tests for /api routes
const request = require("supertest");
const app = require("../../src/app");
const { generateToken } = require("../../src/utils/jwt");

beforeAll(() => {
  process.env.JWT_SECRET = "api-routes-test-secret";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe("GET /health", () => {
  it("should return 200 with status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body).toHaveProperty("uptime");
    expect(response.body).toHaveProperty("timestamp");
  });
});

describe("GET /api/ping", () => {
  it("should return pong with a timestamp", async () => {
    const response = await request(app).get("/api/ping");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("pong");
    expect(response.body).toHaveProperty("timestamp");
  });
});

describe("GET /api/protected", () => {
  it("should return 200 with valid Bearer token", async () => {
    const token = generateToken({ userId: "u1", role: "user" });

    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/protected route/i);
    expect(response.body.user.userId).toBe("u1");
  });

  it("should return 401 when hitting a protected route without a token", async () => {
    const response = await request(app).get("/api/protected");

    // THIS IS THE CORE SECURITY TEST — no token = 401, never 200
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
    expect(response.body).not.toHaveProperty("user");
  });

  it("should return 401 when Authorization header has wrong format", async () => {
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", "Token abc123");

    expect(response.status).toBe(401);
  });

  it("should return 401 with a malformed token", async () => {
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer garbage.token.value");

    expect(response.status).toBe(401);
  });

  it("should return 403 with an expired token", async () => {
    const expiredToken = generateToken({ userId: "exp" }, "1ms");
    await new Promise((r) => setTimeout(r, 50));

    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(403);
  });
});

describe("GET /nonexistent-route", () => {
  it("should return 404 for unknown routes", async () => {
    const response = await request(app).get("/api/doesnotexist");

    expect(response.status).toBe(404);
  });
});
