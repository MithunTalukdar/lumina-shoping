const { Server } = require("socket.io");

const { initializeBackend } = require("../bootstrap");
const { verifyAuthToken } = require("../middleware/auth");
const Order = require("../models/Order");
const { canAccessOrder, serializeOrder, toId } = require("../utils/orderPresentation");
const { syncOrderTracking } = require("../utils/orderTracking");

let io = null;

function createOriginChecker(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS."));
  };
}

function getSocketToken(socket) {
  const authToken = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token.trim() : "";
  if (authToken) {
    return authToken;
  }

  const authorization = typeof socket.handshake.headers?.authorization === "string" ? socket.handshake.headers.authorization : "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function getOrderRoom(orderId) {
  return `orders:${orderId}`;
}

function ensureIntervalRegistry(socket) {
  if (!(socket.data.orderIntervals instanceof Map)) {
    socket.data.orderIntervals = new Map();
  }

  return socket.data.orderIntervals;
}

function clearOrderInterval(socket, orderId) {
  const intervals = ensureIntervalRegistry(socket);
  const intervalId = intervals.get(orderId);
  if (intervalId) {
    clearInterval(intervalId);
    intervals.delete(orderId);
  }
}

function clearAllOrderIntervals(socket) {
  const intervals = ensureIntervalRegistry(socket);
  intervals.forEach((intervalId) => clearInterval(intervalId));
  intervals.clear();
}

async function loadAuthorizedOrder(orderId, authUser) {
  await initializeBackend();

  const order = await Order.findById(orderId);
  if (!order) {
    return { order: null, message: "Order not found." };
  }

  if (!canAccessOrder(order, authUser)) {
    return { order: null, message: "You do not have access to this order." };
  }

  await syncOrderTracking(order);
  return { order, message: "" };
}

function emitOrderUpdate(order) {
  if (!io || !order) {
    return;
  }

  const orderId = toId(order._id || order.id);
  if (!orderId) {
    return;
  }

  io.to(getOrderRoom(orderId)).emit("orders:update", {
    order: serializeOrder(order),
  });
}

function initializeRealtime(server, allowedOrigins = []) {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      credentials: true,
      origin: createOriginChecker(allowedOrigins),
    },
  });

  io.use((socket, next) => {
    const token = getSocketToken(socket);
    if (!token) {
      return next(new Error("Missing auth token."));
    }

    try {
      socket.authUser = verifyAuthToken(token);
      return next();
    } catch (error) {
      return next(new Error("Invalid or expired auth token."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("orders:subscribe", async (payload = {}) => {
      const orderId = typeof payload.orderId === "string" ? payload.orderId.trim() : "";
      if (!orderId) {
        socket.emit("orders:error", { message: "Order id is required." });
        return;
      }

      clearOrderInterval(socket, orderId);

      try {
        const { order, message } = await loadAuthorizedOrder(orderId, socket.authUser);
        if (!order) {
          socket.emit("orders:error", { orderId, message });
          return;
        }

        socket.join(getOrderRoom(orderId));
        socket.emit("orders:update", { order: serializeOrder(order) });

        const intervalId = setInterval(async () => {
          try {
            const next = await loadAuthorizedOrder(orderId, socket.authUser);
            if (!next.order) {
              clearOrderInterval(socket, orderId);
              socket.leave(getOrderRoom(orderId));
              socket.emit("orders:error", {
                orderId,
                message: next.message || "Live tracking connection was interrupted.",
              });
              return;
            }

            socket.emit("orders:update", { order: serializeOrder(next.order) });
          } catch (error) {
            socket.emit("orders:error", {
              orderId,
              message: "Live tracking connection was interrupted.",
            });
          }
        }, 4000);

        ensureIntervalRegistry(socket).set(orderId, intervalId);
      } catch (error) {
        socket.emit("orders:error", {
          orderId,
          message: "Unable to load live tracking.",
        });
      }
    });

    socket.on("orders:unsubscribe", (payload = {}) => {
      const orderId = typeof payload.orderId === "string" ? payload.orderId.trim() : "";
      if (!orderId) {
        return;
      }

      clearOrderInterval(socket, orderId);
      socket.leave(getOrderRoom(orderId));
    });

    socket.on("disconnect", () => {
      clearAllOrderIntervals(socket);
    });
  });

  return io;
}

module.exports = {
  emitOrderUpdate,
  initializeRealtime,
};
