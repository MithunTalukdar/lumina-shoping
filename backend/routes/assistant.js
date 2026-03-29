const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

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

function buildShopperContext(context) {
  if (!context || typeof context !== "object") {
    return "No shopper context was provided.";
  }

  const lines = [];
  const userName = sanitizeText(context.userName);
  const cartItems = Number.isFinite(context.cartItems) ? Number(context.cartItems) : null;
  const wishlistItems = Number.isFinite(context.wishlistItems) ? Number(context.wishlistItems) : null;

  if (userName) {
    lines.push(`- Shopper name: ${userName}`);
  }

  if (cartItems !== null) {
    lines.push(`- Items currently in bag: ${cartItems}`);
  }

  if (wishlistItems !== null) {
    lines.push(`- Items currently saved in wishlist: ${wishlistItems}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No shopper context was provided.";
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-10)
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const role = entry.role === "user" ? "user" : entry.role === "model" ? "model" : null;
      const parts = Array.isArray(entry.parts)
        ? entry.parts
            .map((part) => {
              const text = sanitizeText(part && part.text);
              return text ? { text } : null;
            })
            .filter(Boolean)
        : [];

      if (!role || parts.length === 0) {
        return null;
      }

      return { role, parts };
    })
    .filter(Boolean);
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "help",
  "i",
  "me",
  "my",
  "need",
  "on",
  "or",
  "please",
  "show",
  "something",
  "the",
  "to",
  "want",
  "with",
]);

function normalizeText(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
}

function formatPrice(price) {
  return typeof price === "number" && Number.isFinite(price) ? `INR ${price}` : "Price unavailable";
}

function parseBudget(query) {
  const match = sanitizeText(query).match(
    /(?:under|below|within|up to|upto|max|maximum|less than)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)(k)?/i
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(match[2] ? amount * 1000 : amount);
}

function scoreProduct(product, queryTokens, normalizedQuery, budget) {
  const searchText = normalizeText(
    [product.name, product.category, product.description, product.gender, product.type, product.location].join(" ")
  );
  let score = 0;

  queryTokens.forEach((token) => {
    if (normalizeText(product.name).includes(token)) {
      score += 5;
      return;
    }

    if (normalizeText(product.category).includes(token)) {
      score += 4;
      return;
    }

    if (normalizeText(product.type).includes(token) || normalizeText(product.gender).includes(token)) {
      score += 3;
      return;
    }

    if (searchText.includes(token)) {
      score += 2;
    }
  });

  if (normalizedQuery && searchText.includes(normalizedQuery)) {
    score += 4;
  }

  if (budget !== null && typeof product.price === "number") {
    score += product.price <= budget ? 3 : -2;
  }

  if (typeof product.rating === "number") {
    score += Math.max(0, Math.round(product.rating));
  }

  return score;
}

function pickFallbackProducts(query, products) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);
  const budget = parseBudget(query);

  return [...products]
    .map((product) => ({
      product,
      score: scoreProduct(product, queryTokens, normalizedQuery, budget),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.product.rating || 0) - (left.product.rating || 0);
    })
    .map((entry) => entry.product);
}

function buildFallbackReason(product, budget) {
  const reasons = [];

  if (product.category) {
    reasons.push(`${product.category} category`);
  }

  if (budget !== null && typeof product.price === "number" && product.price <= budget) {
    reasons.push(`within your ${formatPrice(budget)} budget`);
  }

  if (typeof product.rating === "number" && product.rating >= 4.5) {
    reasons.push(`high rating of ${product.rating.toFixed(1)}`);
  }

  if (reasons.length === 0) {
    reasons.push("strong overall catalog match");
  }

  return reasons.join(", ");
}

function buildCatalogFallbackReply(query, products, context) {
  const safeProducts = Array.isArray(products) ? products : [];
  const userName = sanitizeText(context && context.userName);
  const budget = parseBudget(query);
  const topMatches = pickFallbackProducts(query, safeProducts).slice(0, 3);
  const intro = userName
    ? `${userName}, I'm in catalog mode right now, but I can still help with strong matches from Lumina.`
    : "I'm in catalog mode right now, but I can still help with strong matches from Lumina.";

  if (topMatches.length === 0) {
    return [
      intro,
      "Tell me a category, budget, occasion, or style and I will narrow down the best products from the catalog.",
    ].join("\n\n");
  }

  const lines = [
    intro,
    budget !== null
      ? `I looked for options around ${formatPrice(budget)}. Here are the strongest picks:`
      : "Here are the strongest picks from the catalog:",
    ...topMatches.map(
      (product) =>
        `- ${product.name} (${formatPrice(product.price)}): ${buildFallbackReason(product, budget)}. ${sanitizeText(product.description)}`
    ),
    "Tell me if you want this narrowed by budget, occasion, gender, or category and I will refine it further.",
  ];

  return lines.join("\n");
}

function buildFallbackDescription(productName, category) {
  return `${productName} is a polished ${category.toLowerCase()} option built for shoppers who want reliable quality, wearable comfort, and confident everyday style.`;
}

function createClient() {
  const apiKey = sanitizeText(process.env.GEMINI_API_KEY);

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

function getModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

router.post("/", async (req, res) => {
  try {
    const query = sanitizeText(req.body.query);
    const history = normalizeHistory(req.body.history);
    const products = Array.isArray(req.body.products) ? req.body.products : [];
    const shopperContextPayload = req.body.context && typeof req.body.context === "object" ? req.body.context : {};
    const shopperContext = buildShopperContext(req.body.context);

    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }

    const fallbackReply = buildCatalogFallbackReply(query, products, shopperContextPayload);
    const client = createClient();
    if (!client) {
      return res.json({
        reply: fallbackReply,
        didFallback: true,
      });
    }

    const systemInstruction = `
You are Lumina Assistant, an AI support and shopping guide for Lumina Commerce.
Your goal is to help customers discover products, compare options, answer storefront questions, and move confidently toward purchase.

Current Catalog:
${buildCatalogContext(products)}

Current Shopper Context:
${shopperContext}

Instructions:
1. Be friendly, professional, and helpful.
2. If a user asks for recommendations, use the catalog and shopper context to suggest the strongest matches by name.
3. You can explain product differences, style pairings, budgets, gifting ideas, and checkout-related guidance based on the provided storefront context.
4. Never claim to see live order systems, shipping systems, or private account data unless that information was explicitly provided in the shopper context.
5. If the user asks something unrelated to shopping or support, gently steer them back to the Lumina catalog.
6. Keep responses concise and readable in plain text. Short bullets are fine when they help.
7. Identify yourself as Lumina Assistant when it feels natural.
     `.trim();

    try {
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
        reply: sanitizeText(response.text) || fallbackReply,
        didFallback: !sanitizeText(response.text),
      });
    } catch (error) {
      console.error("[assistant] live model failed, using catalog fallback:", error.message || error);
      return res.json({
        reply: fallbackReply,
        didFallback: true,
      });
    }
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
    if (!client) {
      return res.json({
        description: buildFallbackDescription(productName, category),
        didFallback: true,
      });
    }

    const response = await client.models.generateContent({
      model: getModel(),
      contents: `Write a compelling, professional e-commerce product description for a "${productName}" in the "${category}" category. Focus on benefits and quality. Max 3 sentences.`,
    });

    return res.json({
      description: sanitizeText(response.text) || buildFallbackDescription(productName, category),
      didFallback: !sanitizeText(response.text),
    });
  } catch (error) {
    return res.json({
      description: buildFallbackDescription(
        typeof req.body.productName === "string" ? req.body.productName.trim() : "This product",
        typeof req.body.category === "string" ? req.body.category.trim() : "fashion"
      ),
      didFallback: true,
    });
  }
});

module.exports = router;
