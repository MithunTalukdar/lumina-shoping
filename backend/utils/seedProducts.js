const Product = require("../models/Product");
const { products } = require("../data/products");

async function seedProducts() {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  await Product.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { id: product.id },
        update: { $set: product },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

module.exports = {
  seedProducts,
};
