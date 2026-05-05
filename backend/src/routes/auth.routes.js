// src/routes/auth.routes.js — /api/auth endpoints
const express = require("express");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// ── In-memory user store (replace with DB model in real projects) ──────────
// This makes the file testable without a database connection.
const users = new Map();

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    if (users.has(email)) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const userId = `user_${Date.now()}`;

    users.set(email, {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role: "user",
      createdAt: new Date().toISOString(),
    });

    const token = generateToken({ userId, email, role: "user" });

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: userId, email, name, role: "user" },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = users.get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/auth/me
 * Protected — requires valid JWT
 */
router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// Export for test purposes
router._users = users;
module.exports = router;
