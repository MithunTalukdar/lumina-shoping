
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";
import { formatPrice } from "../utils/currency";

export const getShoppingAssistantResponse = async (
  query: string,
  products: Product[],
  history: { role: string; parts: { text: string }[] }[] = []
) => {
  // Always initialize with named parameter and process.env.API_KEY
  const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const productContext = products.map(p => 
    `- ${p.name} (${formatPrice(p.price)}): ${p.description} (Category: ${p.category}, Gender: ${p.gender}, Type: ${p.type}, Location: ${p.location})`
  ).join('\n');

  const systemInstruction = `
    You are an expert e-commerce shopping assistant for Lumina Commerce. 
    Your goal is to help users find the best products from our catalog.
    
    Current Catalog:
    ${productContext}

    Instructions:
    1. Be friendly, professional, and helpful.
    2. If a user asks for a recommendation, analyze our catalog and suggest the most relevant product.
    3. You can answer technical questions about products based on their descriptions.
    4. If a user asks something not related to shopping, gently steer them back to our products.
    5. Keep responses concise and use Markdown for formatting.
    6. Identify yourself as the Lumina Assistant.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    // Access .text property directly
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Assistant Error:", error);
    return "I'm having trouble connecting to my system right now. Please try again later!";
  }
};

export const generateProductDescription = async (productName: string, category: string) => {
  const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a compelling, professional e-commerce product description for a "${productName}" in the "${category}" category. Focus on benefits and quality. Max 3 sentences.`,
    });
    return response.text || "Quality product for your daily needs.";
  } catch (error) {
    return "Premium quality craftsmanship designed for modern lifestyles.";
  }
};
