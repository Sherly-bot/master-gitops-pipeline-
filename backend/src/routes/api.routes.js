// src/routes/api.routes.js — general protected API routes
const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/ping — public ping endpoint
 */
router.get("/ping", (_req, res) => {
  res.status(200).json({ message: "pong", timestamp: new Date().toISOString() });
});

/**
 * GET /api/protected — requires JWT
 */
router.get("/protected", authenticate, (req, res) => {
  res.status(200).json({
    message: "You accessed a protected route",
    user: req.user,
  });
});

module.exports = router;
