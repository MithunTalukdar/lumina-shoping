const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || "dev_only_secret",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

router.post("/register", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "user",
    });

    const token = signToken(user);
    return res.status(201).json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered." });
    }
    return res.status(500).json({ message: "Failed to register user." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({
      user: toPublicUser(user),
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed." });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  return res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load current user." });
  }
});

module.exports = router;
