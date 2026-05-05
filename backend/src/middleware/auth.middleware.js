// src/middleware/auth.middleware.js — JWT auth guard
const { verifyToken } = require("../utils/jwt");

/**
 * Middleware: verify Bearer token in Authorization header.
 * Sets req.user = decoded payload on success.
 * Responds 401 if missing/invalid, 403 if expired.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ error: "Token expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
};

/**
 * Middleware: require a specific role.
 * Must be used after authenticate().
 * @param {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    return next();
  };
};

module.exports = { authenticate, requireRole };
