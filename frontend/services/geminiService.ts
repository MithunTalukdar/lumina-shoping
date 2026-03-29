import { Product } from "../types";
import { buildApiUrl } from "./apiBase";

export interface AssistantHistoryMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface AssistantResponse {
  reply?: string;
  didFallback?: boolean;
}

interface ProductDescriptionResponse {
  description?: string;
  didFallback?: boolean;
}

export interface ShoppingAssistantContext {
  userName?: string | null;
  cartItems?: number;
  wishlistItems?: number;
}

export interface ShoppingAssistantReply {
  reply: string;
  didFallback: boolean;
}

const CHAT_FALLBACK_REPLY =
  "I'm having trouble connecting right now, but I can still help once the AI service is available again.";

async function request<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "Assistant request failed.";
    throw new Error(message);
  }

  return (data || {}) as T;
}

export async function getShoppingAssistantResponse(
  query: string,
  products: Product[],
  history: AssistantHistoryMessage[] = [],
  context: ShoppingAssistantContext = {}
): Promise<ShoppingAssistantReply> {
  try {
    const response = await request<AssistantResponse>("/api/assistant", {
      query,
      products,
      history: history.slice(-10),
      context,
    });

    return {
      reply: response.reply || "I'm sorry, I couldn't process that request.",
      didFallback: Boolean(response.didFallback),
    };
  } catch (error) {
    console.error("Assistant Error:", error);
    return {
      reply: CHAT_FALLBACK_REPLY,
      didFallback: true,
    };
  }
}

export async function generateProductDescription(productName: string, category: string) {
  try {
    const response = await request<ProductDescriptionResponse>("/api/assistant/description", {
      productName,
      category,
    });

    return response.description || "Quality product for your daily needs.";
  } catch {
    return "Premium quality craftsmanship designed for modern lifestyles.";
  }
}
