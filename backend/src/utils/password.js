// src/utils/password.js — password hashing & comparison helpers
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password.
 * @param {string} plainPassword
 * @returns {Promise<string>} Hashed password
 * @throws {Error} If password is empty or not a string
 */
const hashPassword = async (plainPassword) => {
  if (!plainPassword || typeof plainPassword !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>} true if match, false otherwise
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
