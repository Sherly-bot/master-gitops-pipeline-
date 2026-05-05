// src/utils/jwt.js — JWT token generation & verification helpers
const jwt = require("jsonwebtoken");

/**
 * Generate a signed JWT token.
 * @param {object} payload  - Data to encode (userId, role, etc.)
 * @param {string} [expiresIn] - Expiry duration (default from env or '7d')
 * @returns {string} Signed JWT string
 * @throws {Error} If JWT_SECRET is not set
 */
const generateToken = (payload, expiresIn) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const expiry = expiresIn || process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(payload, secret, { expiresIn: expiry });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token - The JWT string to verify
 * @returns {object} Decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError} on invalid/expired token
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.verify(token, secret);
};

/**
 * Decode a JWT without verifying signature.
 * Useful for reading payload from an expired token.
 * @param {string} token
 * @returns {object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = { generateToken, verifyToken, decodeToken };
