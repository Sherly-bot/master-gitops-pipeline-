// tests/integration/auth.routes.test.js — Integration tests for /api/auth
const request = require("supertest");
const app = require("../../src/app");
const authRouter = require("../../src/routes/auth.routes");

beforeAll(() => {
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
});

// Clean user store between tests
beforeEach(() => {
  authRouter._users.clear();
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

// ── Registration ───────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("should register a new user and return 201 with a token", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@test.com", password: "Password123!", name: "Test User" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user.email).toBe("new@test.com");
    expect(response.body.user.role).toBe("user");
    // Password must never be returned
    expect(response.body.user).not.toHaveProperty("password");
  });

  it("should return 400 when required fields are missing", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "incomplete@test.com" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("should return 400 if password is shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "short@test.com", password: "abc", name: "Short Pass" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/8 characters/i);
  });

  it("should return 409 if email is already registered", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@test.com", password: "Password123!", name: "First" });

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@test.com", password: "Password456!", name: "Second" });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already exists/i);
  });
});

// ── Login ──────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create a user before each login test
    await request(app)
      .post("/api/auth/register")
      .send({ email: "login@test.com", password: "MyPassword99!", name: "Login User" });
  });

  it("should return 200 and a token with correct credentials", async () => {
    // Line 47 — the core test: correct login returns token
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "MyPassword99!" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.split(".")).toHaveLength(3);
    expect(response.body.message).toMatch(/successful/i);
  });

  it("should return 401 with wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "WrongPassword!" });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
    expect(response.body).not.toHaveProperty("token");
  });

  it("should return 401 with non-existent email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "AnyPassword1!" });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });

  it("should return 400 when email is missing", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ password: "Password123!" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com" });

    expect(response.status).toBe(400);
  });

  it("should not return the hashed password in the response", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "MyPassword99!" });

    expect(response.body.user).not.toHaveProperty("password");
  });
});

// ── Protected /me route ───────────────────────────────────

describe("GET /api/auth/me", () => {
  let token;

  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "me@test.com", password: "Password123!", name: "Me User" });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "me@test.com", password: "Password123!" });

    token = loginRes.body.token;
  });

  it("should return 200 and user data with valid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });

  it("should return 401 with no Authorization header", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
