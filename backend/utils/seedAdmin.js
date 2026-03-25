const bcrypt = require("bcryptjs");

const User = require("../models/User");

async function seedAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@lumina.dev").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const name = (process.env.ADMIN_NAME || "Lumina Admin").trim();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return {
      created: false,
      email,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    email,
    passwordHash,
    role: "admin",
  });

  return {
    created: true,
    email,
  };
}

module.exports = {
  seedAdminUser,
};
