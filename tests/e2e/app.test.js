// tests/e2e/app.test.js — End-to-end smoke tests (full user journey)
const request = require("supertest");
const app = require("../../src/app");
const authRouter = require("../../src/routes/auth.routes");

beforeAll(() => {
  process.env.JWT_SECRET = "e2e-test-secret-key";
});

beforeEach(() => {
  authRouter._users.clear();
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe("Full user journey: register → login → access protected resource", () => {
  it("should complete the full auth flow successfully", async () => {
    // Step 1: Register
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "journey@test.com", password: "JourneyPass1!", name: "Journey User" });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();

    // Step 2: Login with same credentials
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "journey@test.com", password: "JourneyPass1!" });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // Step 3: Access protected resource with token
    const protectedRes = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.user).toBeDefined();

    // Step 4: Access /me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("journey@test.com");
  });

  it("should be blocked at every protected step without a token", async () => {
    // Attempt protected route — should fail
    const response = await request(app).get("/api/protected");
    expect(response.status).toBe(401);

    // Attempt /me — should fail
    const meResponse = await request(app).get("/api/auth/me");
    expect(meResponse.status).toBe(401);
  });

  it("should reject login after wrong password even if registration succeeded", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "reject@test.com", password: "RightPass1!", name: "Reject User" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "reject@test.com", password: "WrongPass!" });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.token).toBeUndefined();
  });

  it("health endpoint should always be accessible without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
