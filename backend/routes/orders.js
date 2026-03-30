const express = require("express");

const Order = require("../models/Order");
const { requireAuth } = require("../middleware/auth");
const { canAccessOrder, serializeOrder } = require("../utils/orderPresentation");
const { syncOrderTracking } = require("../utils/orderTracking");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = req.authUser.role === "admin"
      ? {}
      : req.authUser.role === "delivery_agent"
        ? { "deliveryAgent.email": req.authUser.email }
        : { userId: req.authUser.id };

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    await Promise.all(orders.map((order) => syncOrderTracking(order)));

    return res.json({
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load orders." });
  }
});

router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!canAccessOrder(order, req.authUser)) {
      return res.status(403).json({ message: "You do not have access to this order." });
    }

    await syncOrderTracking(order);
    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load order tracking." });
  }
});

router.get("/:orderId/stream", requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!canAccessOrder(order, req.authUser)) {
      return res.status(403).json({ message: "You do not have access to this order." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const writeSnapshot = async () => {
      const freshOrder = await Order.findById(req.params.orderId);
      if (!freshOrder) {
        res.write(`event: closed\ndata: ${JSON.stringify({ message: "Order not found." })}\n\n`);
        return;
      }

      await syncOrderTracking(freshOrder);
      res.write(`data: ${JSON.stringify({ order: serializeOrder(freshOrder) })}\n\n`);
    };

    await writeSnapshot();
    const intervalId = setInterval(() => {
      writeSnapshot().catch((error) => {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Tracking stream failed." })}\n\n`);
      });
    }, 5000);

    req.on("close", () => {
      clearInterval(intervalId);
      res.end();
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to open order tracking stream." });
  }
});

module.exports = router;
