const mongoose = require("mongoose");

const READY_STATE_LABEL = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

let connectionPromise = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || undefined,
      })
      .then(() => {
        const state = READY_STATE_LABEL[mongoose.connection.readyState] || "unknown";
        console.log(`[db] ${state}: ${mongoose.connection.host}/${mongoose.connection.name}`);
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

function getDBStatus() {
  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    state: READY_STATE_LABEL[stateCode] || "unknown",
    host: mongoose.connection.host || "",
    name: mongoose.connection.name || "",
  };
}

module.exports = {
  connectDB,
  getDBStatus,
};
