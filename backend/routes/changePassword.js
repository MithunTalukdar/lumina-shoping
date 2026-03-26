const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";
    const confirmPassword = req.body.confirmPassword || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password must match." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from the current password." });
    }

    const user = await User.findById(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordIsValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordIsValid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to change password." });
  }
});

module.exports = router;
