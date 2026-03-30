const { connectDB } = require("./config/db");
const { loadEnv } = require("./loadEnv");
const { seedAdminUser } = require("./utils/seedAdmin");
const { seedDeliveryAgents } = require("./utils/seedDeliveryAgents");
const { seedProducts } = require("./utils/seedProducts");

let initializationPromise = null;

async function initializeBackend() {
  loadEnv();

  if (!process.env.MONGODB_URI) {
    const error = new Error("MONGODB_URI is not configured.");
    error.statusCode = 500;
    throw error;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();
      await seedAdminUser();
      await seedDeliveryAgents();
      await seedProducts();
      return true;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

module.exports = {
  initializeBackend,
};
