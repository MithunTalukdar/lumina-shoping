const express = require("express");

const { emitOrderUpdate } = require("../realtime/socket");
const DeliveryAgent = require("../models/DeliveryAgent");
const Order = require("../models/Order");
const { requireAuth, requireRole } = require("../middleware/auth");
const { serializeOrder } = require("../utils/orderPresentation");
const { ORDER_STATUS_FLOW, setOrderStatus, syncOrderTracking } = require("../utils/orderTracking");

const router = express.Router();

async function loadAgentForRequest(authUser) {
  if (authUser.role === "admin") {
    return null;
  }

  return DeliveryAgent.findOne({ userId: authUser.id });
}

function canManageOrder(order, authUser, agent) {
  if (authUser.role === "admin") {
    return true;
  }

  if (!agent || !order.deliveryAgent?.id) {
    return false;
  }

  return order.deliveryAgent.id === agent._id.toString();
}

router.get("/orders", requireAuth, requireRole("delivery_agent", "admin"), async (req, res) => {
  try {
    const agent = await loadAgentForRequest(req.authUser);
    const filter =
      req.authUser.role === "admin"
        ? {}
        : {
            "deliveryAgent.id": agent?._id?.toString() || "",
          };

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(25);
    await Promise.all(orders.map((order) => syncOrderTracking(order)));

    return res.json({
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load delivery assignments." });
  }
});

router.post("/orders/:orderId/status", requireAuth, requireRole("delivery_agent", "admin"), async (req, res) => {
  try {
    const nextStatus = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!ORDER_STATUS_FLOW.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid delivery status supplied." });
    }

    const [order, agent] = await Promise.all([
      Order.findById(req.params.orderId),
      loadAgentForRequest(req.authUser),
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!canManageOrder(order, req.authUser, agent)) {
      return res.status(403).json({ message: "You cannot update this order." });
    }

    setOrderStatus(order, nextStatus, "manual");
    await order.save();
    await syncOrderTracking(order);

    if (agent) {
      agent.availability = nextStatus === "delivered" ? "available" : "busy";
      agent.activeOrderId = nextStatus === "delivered" ? null : order._id;
      if (nextStatus === "delivered") {
        agent.completedDeliveries += 1;
      }
      await agent.save();
    }

    emitOrderUpdate(order);

    return res.json({
      message: "Order status updated.",
      order: serializeOrder(order),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update delivery status." });
  }
});

router.post("/orders/:orderId/location", requireAuth, requireRole("delivery_agent", "admin"), async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const city = typeof req.body?.city === "string" ? req.body.city.trim() : "";
    const state = typeof req.body?.state === "string" ? req.body.state.trim() : "";

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    const [order, agent] = await Promise.all([
      Order.findById(req.params.orderId),
      loadAgentForRequest(req.authUser),
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (!canManageOrder(order, req.authUser, agent)) {
      return res.status(403).json({ message: "You cannot update this order." });
    }

    order.trackingMode = "manual";
    order.latestAgentLocation = {
      lat,
      lng,
      city: city || order.latestAgentLocation?.city || order.shippingAddress.city,
      state: state || order.latestAgentLocation?.state || order.shippingAddress.state,
      updatedAt: new Date(),
      label: "Live agent location",
    };

    await order.save();

    if (agent) {
      agent.currentLocation = {
        ...agent.currentLocation,
        lat,
        lng,
        city: order.latestAgentLocation.city,
        state: order.latestAgentLocation.state,
        updatedAt: new Date(),
      };
      agent.availability = "busy";
      agent.activeOrderId = order._id;
      await agent.save();
    }

    emitOrderUpdate(order);

    return res.json({
      message: "Live delivery location updated.",
      order: serializeOrder(order),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update delivery location." });
  }
});

module.exports = router;
