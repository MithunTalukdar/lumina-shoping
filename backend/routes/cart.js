const express = require("express");

const Order = require("../models/Order");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { products } = require("../data/products");

const router = express.Router();

function getProductById(productId) {
  return products.find((product) => product.id === productId) || null;
}

function sanitizeQuantity(quantity) {
  const value = Number(quantity);
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.min(20, Math.round(value)));
}

function normalizeCartItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const merged = new Map();

  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    if (!productId || !getProductById(productId)) {
      return;
    }

    merged.set(productId, sanitizeQuantity(item.quantity));
  });

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function hydrateCartItems(cartItems) {
  return normalizeCartItems(cartItems)
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: item.quantity,
      };
    })
    .filter(Boolean);
}

function buildCartResponse(cartItems) {
  const items = hydrateCartItems(cartItems);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 0 : 0;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + shipping + tax;

  return {
    items,
    summary: {
      subtotal,
      shipping,
      tax,
      total,
      currency: "INR",
    },
  };
}

function buildOrderItems(items) {
  return items.map((item) => ({
    productId: item.id,
    name: item.name,
    description: item.description,
    image: item.image,
    category: item.category,
    location: item.location,
    price: item.price,
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
  }));
}

async function loadUser(userId) {
  return User.findById(userId);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(buildCartResponse(user.cartItems || []));
  } catch (error) {
    return res.status(500).json({ message: "Unable to load cart." });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    if (!Array.isArray(req.body.items)) {
      return res.status(400).json({ message: "Cart items array is required." });
    }

    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.cartItems = normalizeCartItems(req.body.items);
    await user.save();

    return res.json(buildCartResponse(user.cartItems));
  } catch (error) {
    return res.status(500).json({ message: "Unable to update cart." });
  }
});

router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const cartResponse = buildCartResponse(user.cartItems || []);
    if (cartResponse.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const order = await Order.create({
      userId: user._id,
      items: buildOrderItems(cartResponse.items),
      subtotal: cartResponse.summary.subtotal,
      shipping: cartResponse.summary.shipping,
      tax: cartResponse.summary.tax,
      total: cartResponse.summary.total,
      status: "pending",
    });

    user.cartItems = [];
    await user.save();

    return res.json({
      message: "Order placed successfully.",
      orderSummary: cartResponse.summary,
      items: cartResponse.items,
      orderId: order._id.toString(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Checkout failed." });
  }
});

module.exports = router;
