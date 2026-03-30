const express = require("express");

const DeliveryAgent = require("../models/DeliveryAgent");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { emitOrderUpdate } = require("../realtime/socket");
const { getLocationByCity } = require("../utils/india");
const { serializeOrder } = require("../utils/orderPresentation");
const { setOrderStatus, syncOrderTracking } = require("../utils/orderTracking");

const router = express.Router();

const ADMIN_SECTIONS = ["Men", "Women", "Shoes", "Suit"];
const ADMIN_ORDER_STATUSES = ["packed", "shipped", "out_for_delivery", "delivered"];
const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_LENGTH = 2_500_000;

router.use(requireAuth, requireRole("admin"));

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSection(value) {
  const rawSection = normalizeText(value).toLowerCase();

  if (rawSection === "men") {
    return "Men";
  }

  if (rawSection === "women") {
    return "Women";
  }

  if (rawSection === "shoes") {
    return "Shoes";
  }

  if (rawSection === "suit") {
    return "Suit";
  }

  return "";
}

function normalizeGender(value) {
  return value === "women" ? "women" : "men";
}

function getCatalogSection(product) {
  if (product.type === "shoes") {
    return "Shoes";
  }

  if (normalizeText(product.category).toLowerCase().includes("suit")) {
    return "Suit";
  }

  return product.gender === "women" ? "Women" : "Men";
}

function buildBadges(stock, rating) {
  if (stock <= 0) {
    return ["Out of Stock"];
  }

  const badges = [];

  if (rating >= 4.8) {
    badges.push("Trending");
  }

  badges.push("New");

  return badges.slice(0, 2);
}

function isValidImageValue(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.length > MAX_IMAGE_LENGTH) {
    return false;
  }

  return (
    /^https?:\/\/\S+/i.test(trimmedValue) ||
    /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmedValue)
  );
}

function normalizeImages(images, fallbackImage) {
  const rawImages = Array.isArray(images)
    ? images
    : typeof fallbackImage === "string" && fallbackImage.trim()
      ? [fallbackImage]
      : [];

  return Array.from(
    new Set(
      rawImages
        .filter(isValidImageValue)
        .map((image) => image.trim())
    )
  ).slice(0, MAX_IMAGE_COUNT);
}

function buildProductId(name) {
  const baseSlug = normalizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${baseSlug || "product"}-${Date.now().toString(36)}`;
}

function deriveCatalogShape(section, category, genderInput) {
  const normalizedCategory = normalizeText(category);

  if (section === "Women") {
    return {
      gender: "women",
      type: "clothing",
      category: normalizedCategory || "Women",
    };
  }

  if (section === "Shoes") {
    return {
      gender: normalizeGender(genderInput),
      type: "shoes",
      category: normalizedCategory || "Shoes",
    };
  }

  if (section === "Suit") {
    return {
      gender: "men",
      type: "clothing",
      category: normalizedCategory || "Suit",
    };
  }

  return {
    gender: "men",
    type: "clothing",
    category: normalizedCategory || "Men",
  };
}

function serializeProduct(product) {
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image].filter(Boolean);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    section: getCatalogSection(product),
    gender: product.gender,
    type: product.type,
    location: product.location,
    image: images[0] || product.image,
    images,
    stock: product.stock,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    discountPercentage: product.discountPercentage || null,
    originalPrice: product.originalPrice || null,
    badges: Array.isArray(product.badges) ? product.badges : [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function serializeAdminUser(user, orderStats) {
  const stats = orderStats.get(user._id.toString()) || {
    ordersCount: 0,
    totalSpend: 0,
    lastOrderAt: null,
  };

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: Boolean(user.isBlocked),
    ordersCount: stats.ordersCount,
    totalSpend: stats.totalSpend,
    createdAt: user.createdAt,
    lastOrderAt: stats.lastOrderAt,
  };
}

function serializeAdminOrder(order, usersById) {
  const baseOrder = serializeOrder(order);
  const customer = usersById.get(baseOrder.userId) || null;

  return {
    ...baseOrder,
    customer: customer
      ? {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
          isBlocked: Boolean(customer.isBlocked),
        }
      : null,
    itemCount: baseOrder.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function buildOrderStatsMap(orders) {
  const stats = new Map();

  orders.forEach((order) => {
    const userId = order.userId?.toString?.() || String(order.userId || "");
    if (!userId) {
      return;
    }

    const currentStats = stats.get(userId) || {
      ordersCount: 0,
      totalSpend: 0,
      lastOrderAt: null,
    };

    currentStats.ordersCount += 1;
    currentStats.totalSpend += Number(order.total || 0);

    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && (!currentStats.lastOrderAt || createdAt > currentStats.lastOrderAt)) {
      currentStats.lastOrderAt = createdAt;
    }

    stats.set(userId, currentStats);
  });

  return stats;
}

function buildDailySeries(orders, days = 7) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return Array.from({ length: days }, (_, index) => {
    const bucketDate = new Date(start);
    bucketDate.setDate(start.getDate() + index);
    const nextDate = new Date(bucketDate);
    nextDate.setDate(bucketDate.getDate() + 1);

    const bucketOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= bucketDate && createdAt < nextDate;
    });

    return {
      label: bucketDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: bucketOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: bucketOrders.length,
    };
  });
}

function buildWeeklySeries(orders, weeks = 4) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((weeks * 7) - 1));

  return Array.from({ length: weeks }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * 7);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + 7);

    const bucketOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= bucketStart && createdAt < bucketEnd;
    });

    return {
      label: `Week ${index + 1}`,
      revenue: bucketOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: bucketOrders.length,
    };
  });
}

function buildBestSellingProducts(orders) {
  const salesMap = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const current = salesMap.get(item.productId) || {
        productId: item.productId,
        name: item.name,
        unitsSold: 0,
        revenue: 0,
      };

      current.unitsSold += Number(item.quantity || 0);
      current.revenue += Number(item.lineTotal || 0);

      salesMap.set(item.productId, current);
    });
  });

  return Array.from(salesMap.values())
    .sort((left, right) => right.unitsSold - left.unitsSold)
    .slice(0, 5);
}

function validateProductPayload(body, existingProduct = null) {
  const name = normalizeText(body.name);
  const description = normalizeText(body.description);
  const section = normalizeSection(body.section);
  const category = normalizeText(body.category);
  const locationName = normalizeText(body.location || existingProduct?.location || "Kolkata");
  const location = getLocationByCity(locationName);
  const images = normalizeImages(body.images, body.image || existingProduct?.image);
  const price = Number(body.price);
  const stock = Math.max(0, Math.round(Number(body.stock)));
  const rating = Number(body.rating);
  const reviewsCount = Number.isFinite(Number(body.reviewsCount))
    ? Math.max(1, Math.round(Number(body.reviewsCount)))
    : existingProduct?.reviewsCount || 12;
  const discountPercentage = Number.isFinite(Number(body.discountPercentage))
    ? Math.max(0, Math.min(90, Math.round(Number(body.discountPercentage))))
    : existingProduct?.discountPercentage || null;

  if (!name || !description || !section) {
    return { message: "Name, description, and catalog section are required." };
  }

  if (!ADMIN_SECTIONS.includes(section)) {
    return { message: "Choose a valid catalog section." };
  }

  if (!Number.isFinite(price) || price < 400 || price > 500) {
    return { message: "Product price must stay between ₹400 and ₹500." };
  }

  if (!Number.isFinite(stock) || stock < 0) {
    return { message: "Stock must be a valid non-negative number." };
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { message: "Rating must be between 0 and 5." };
  }

  if (!location) {
    return { message: "Only locations within India are allowed" };
  }

  if (images.length === 0) {
    return { message: "Add at least one valid product image." };
  }

  const shape = deriveCatalogShape(section, category, body.gender || existingProduct?.gender || "men");
  const productRating = Math.round(rating * 10) / 10;
  const finalBadges = buildBadges(stock, productRating);

  return {
    value: {
      name,
      description,
      price: Math.round(price),
      category: shape.category,
      gender: shape.gender,
      type: shape.type,
      location: location.city,
      image: images[0],
      images,
      stock,
      rating: productRating,
      reviewsCount,
      discountPercentage,
      originalPrice: discountPercentage ? Math.round((price / (1 - discountPercentage / 100)) / 10) * 10 : null,
      badges: finalBadges,
    },
  };
}

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ updatedAt: -1 }).lean();
    const query = normalizeText(req.query.q).toLowerCase();
    const section = normalizeSection(req.query.section);
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const stock = normalizeText(req.query.stock).toLowerCase();

    let filteredProducts = products.map(serializeProduct);

    if (query) {
      filteredProducts = filteredProducts.filter((product) => {
        return (
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.section.toLowerCase().includes(query)
        );
      });
    }

    if (section) {
      filteredProducts = filteredProducts.filter((product) => product.section === section);
    }

    if (Number.isFinite(minPrice)) {
      filteredProducts = filteredProducts.filter((product) => product.price >= minPrice);
    }

    if (Number.isFinite(maxPrice)) {
      filteredProducts = filteredProducts.filter((product) => product.price <= maxPrice);
    }

    if (stock === "in_stock") {
      filteredProducts = filteredProducts.filter((product) => product.stock > 0);
    }

    if (stock === "low_stock") {
      filteredProducts = filteredProducts.filter((product) => product.stock > 0 && product.stock <= 10);
    }

    if (stock === "out_of_stock") {
      filteredProducts = filteredProducts.filter((product) => product.stock <= 0);
    }

    return res.json({
      products: filteredProducts,
      total: filteredProducts.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin products." });
  }
});

router.post("/product", async (req, res) => {
  try {
    const validated = validateProductPayload(req.body);
    if (!validated.value) {
      return res.status(400).json({ message: validated.message });
    }

    const product = await Product.create({
      id: buildProductId(validated.value.name),
      ...validated.value,
    });

    return res.status(201).json({
      message: "Product created successfully.",
      product: serializeProduct(product),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create product." });
  }
});

router.put("/product/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const validated = validateProductPayload(req.body, product);
    if (!validated.value) {
      return res.status(400).json({ message: validated.message });
    }

    Object.assign(product, validated.value);
    await product.save();

    return res.json({
      message: "Product updated successfully.",
      product: serializeProduct(product),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update product." });
  }
});

router.delete("/product/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ id: req.params.id });
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ message: "Product deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete product." });
  }
});

router.get("/orders", async (_req, res) => {
  try {
    const [orders, users] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }),
      User.find({}).lean(),
    ]);

    await Promise.all(orders.map((order) => syncOrderTracking(order)));

    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return res.json({
      orders: orders.map((order) => serializeAdminOrder(order, usersById)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin orders." });
  }
});

router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    const nextStatus = normalizeText(req.body.status);
    if (!ADMIN_ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Choose a valid order status." });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    setOrderStatus(order, nextStatus, "manual");
    await order.save();
    await syncOrderTracking(order);

    if (order.deliveryAgent?.id) {
      const deliveryAgent = await DeliveryAgent.findById(order.deliveryAgent.id);
      if (deliveryAgent) {
        deliveryAgent.availability = nextStatus === "delivered" ? "available" : "busy";
        deliveryAgent.activeOrderId = nextStatus === "delivered" ? null : order._id;
        if (nextStatus === "delivered") {
          deliveryAgent.completedDeliveries += 1;
        }
        await deliveryAgent.save();
      }
    }

    emitOrderUpdate(order);

    const customer = await User.findById(order.userId).lean();
    const usersById = new Map(customer ? [[customer._id.toString(), customer]] : []);

    return res.json({
      message: "Order status updated successfully.",
      order: serializeAdminOrder(order, usersById),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update order status." });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const [users, orders] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }),
      Order.find({}).select("userId total createdAt").lean(),
    ]);

    const orderStats = buildOrderStatsMap(orders);

    return res.json({
      users: users.map((user) => serializeAdminUser(user, orderStats)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin users." });
  }
});

router.patch("/users/:userId/block", async (req, res) => {
  try {
    const blocked = Boolean(req.body.blocked);
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user._id.toString() === req.authUser.id) {
      return res.status(400).json({ message: "You cannot block your own account." });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be blocked from this panel." });
    }

    user.isBlocked = blocked;
    await user.save();

    const orders = await Order.find({ userId: user._id }).select("userId total createdAt").lean();
    const orderStats = buildOrderStatsMap(orders);

    return res.json({
      message: blocked ? "User blocked successfully." : "User unblocked successfully.",
      user: serializeAdminUser(user, orderStats),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update user status." });
  }
});

router.get("/analytics", async (_req, res) => {
  try {
    const [products, orders, users] = await Promise.all([
      Product.find({}).lean(),
      Order.find({}).sort({ createdAt: -1 }).lean(),
      User.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const orderStats = buildOrderStatsMap(orders);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return res.json({
      summary: {
        totalUsers: users.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        totalProducts: products.length,
      },
      recentOrders: orders.slice(0, 5).map((order) => serializeAdminOrder(order, usersById)),
      newUsers: users.slice(0, 5).map((user) => serializeAdminUser(user, orderStats)),
      salesOverTime: buildDailySeries(orders, 7),
      weeklySales: buildWeeklySeries(orders, 4),
      bestSellingProducts: buildBestSellingProducts(orders),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin analytics." });
  }
});

module.exports = router;
