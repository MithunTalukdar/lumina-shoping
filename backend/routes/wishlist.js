const express = require("express");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { products } = require("../data/products");

const router = express.Router();

function getProductById(productId) {
  return products.find((product) => product.id === productId) || null;
}

function normalizeWishlistItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const uniqueIds = new Set();

  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    if (!productId || !getProductById(productId)) {
      return;
    }

    uniqueIds.add(productId);
  });

  return Array.from(uniqueIds).map((productId) => ({ productId }));
}

function hydrateWishlistItems(items) {
  return normalizeWishlistItems(items)
    .map((item) => getProductById(item.productId))
    .filter(Boolean);
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

    return res.json({
      items: hydrateWishlistItems(user.wishlistItems || []),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load wishlist." });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    if (!Array.isArray(req.body.items)) {
      return res.status(400).json({ message: "Wishlist items array is required." });
    }

    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.wishlistItems = normalizeWishlistItems(req.body.items);
    await user.save();

    return res.json({
      items: hydrateWishlistItems(user.wishlistItems || []),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update wishlist." });
  }
});

module.exports = router;
