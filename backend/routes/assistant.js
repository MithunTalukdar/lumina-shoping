const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

function buildCatalogContext(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return "No catalog context was provided.";
  }

  return products
    .map((product) => {
      const price = typeof product.price === "number" ? `INR ${product.price}` : "Price unavailable";
      return `- ${product.name} (${price}): ${product.description} (Category: ${product.category}, Gender: ${product.gender}, Type: ${product.type}, Location: ${product.location})`;
    })
    .join("\n");
}

function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }

  return new GoogleGenAI({ apiKey });
}

function getModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

router.post("/", async (req, res) => {
  try {
    const query = typeof req.body.query === "string" ? req.body.query.trim() : "";
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const products = Array.isArray(req.body.products) ? req.body.products : [];

    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }

    const client = createClient();
    const systemInstruction = `
You are an expert e-commerce shopping assistant for Lumina Commerce.
Your goal is to help users find the best products from our catalog.

Current Catalog:
${buildCatalogContext(products)}

Instructions:
1. Be friendly, professional, and helpful.
2. If a user asks for a recommendation, analyze our catalog and suggest the most relevant product.
3. You can answer technical questions about products based on their descriptions.
4. If a user asks something not related to shopping, gently steer them back to our products.
5. Keep responses concise and use Markdown for formatting.
6. Identify yourself as the Lumina Assistant.
    `.trim();

    const response = await client.models.generateContent({
      model: getModel(),
      contents: [
        ...history,
        { role: "user", parts: [{ text: query }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      reply: response.text || "I'm sorry, I couldn't process that request.",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Assistant request failed.",
    });
  }
});

router.post("/description", async (req, res) => {
  try {
    const productName = typeof req.body.productName === "string" ? req.body.productName.trim() : "";
    const category = typeof req.body.category === "string" ? req.body.category.trim() : "";

    if (!productName || !category) {
      return res.status(400).json({ message: "Product name and category are required." });
    }

    const client = createClient();
    const response = await client.models.generateContent({
      model: getModel(),
      contents: `Write a compelling, professional e-commerce product description for a "${productName}" in the "${category}" category. Focus on benefits and quality. Max 3 sentences.`,
    });

    return res.json({
      description: response.text || "Quality product for your daily needs.",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Unable to generate a product description.",
    });
  }
});

module.exports = router;
