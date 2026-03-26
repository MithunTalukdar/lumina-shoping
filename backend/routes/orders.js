const express = require("express");

const Order = require("../models/Order");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function serializeOrder(order) {
  return {
    id: order._id.toString(),
    userId: order.userId.toString(),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          description: item.description,
          image: item.image,
          category: item.category,
          location: item.location,
          price: item.price,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }))
      : [],
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.authUser.id }).sort({ createdAt: -1 }).lean();

    return res.json({
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load orders." });
  }
});

module.exports = router;
