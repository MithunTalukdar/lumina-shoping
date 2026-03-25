import { Product } from "../types";
import { buildApiUrl } from "./apiBase";

interface AssistantHistoryMessage {
  role: string;
  parts: { text: string }[];
}

interface AssistantResponse {
  reply?: string;
}

interface ProductDescriptionResponse {
  description?: string;
}

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
  history: AssistantHistoryMessage[] = []
) {
  try {
    const response = await request<AssistantResponse>("/api/assistant", {
      query,
      products,
      history,
    });

    return response.reply || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Assistant Error:", error);
    return "I'm having trouble connecting to my system right now. Please try again later!";
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
