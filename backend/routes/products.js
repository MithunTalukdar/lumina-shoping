const express = require("express");

const { initializeBackend } = require("../bootstrap");
const Product = require("../models/Product");
const { products } = require("../data/products");
const { getLocationByCity } = require("../utils/india");

const router = express.Router();

function normalizeQueryValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function getProductCatalog() {
  if (!process.env.MONGODB_URI) {
    return products;
  }

  try {
    await initializeBackend();
    const dbProducts = await Product.find({}).lean();
    return dbProducts.length > 0 ? dbProducts : products;
  } catch (error) {
    return products;
  }
}

router.get("/", async (req, res) => {
  const category = normalizeQueryValue(req.query.category);
  const gender = normalizeQueryValue(req.query.gender);
  const type = normalizeQueryValue(req.query.type);
  const location = normalizeQueryValue(req.query.location);
  const query = normalizeQueryValue(req.query.q);

  let filteredProducts = [...(await getProductCatalog())];

  if (category && category !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.category.toLowerCase() === category
    );
  }

  if (gender && gender !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.gender.toLowerCase() === gender
    );
  }

  if (type && type !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.type.toLowerCase() === type
    );
  }

  if (location && location !== "all") {
    if (!getLocationByCity(location)) {
      return res.status(400).json({ message: "Only locations within India are allowed" });
    }

    filteredProducts = filteredProducts.filter(
      (product) => product.location.toLowerCase() === location
    );
  }

  if (query) {
    filteredProducts = filteredProducts.filter((product) => {
      const name = product.name.toLowerCase();
      const description = product.description.toLowerCase();
      const productCategory = product.category.toLowerCase();
      const productGender = product.gender.toLowerCase();
      const productType = product.type.toLowerCase();
      const productLocation = product.location.toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query) ||
        productCategory.includes(query) ||
        productGender.includes(query) ||
        productType.includes(query) ||
        productLocation.includes(query)
      );
    });
  }

  return res.json({
    products: filteredProducts,
    total: filteredProducts.length,
    filters: {
      category: req.query.category || "All",
      gender: req.query.gender || "All",
      type: req.query.type || "All",
      location: req.query.location || "All",
      q: req.query.q || "",
    },
  });
});

module.exports = router;
