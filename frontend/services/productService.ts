import { Product } from "../types";
import { buildApiUrl } from "./apiBase";

const PRODUCTS_ENDPOINT = buildApiUrl("/api/products");
const REQUEST_TIMEOUT_MS = 8000;

interface ProductListResponse {
  products?: unknown;
  total?: number;
}

export interface ProductQueryOptions {
  category?: string;
  gender?: string;
  type?: string;
  location?: string;
  q?: string;
  signal?: AbortSignal;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;

  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.description) ||
    !isNonEmptyString(item.category) ||
    !isNonEmptyString(item.gender) ||
    !isNonEmptyString(item.type) ||
    !isNonEmptyString(item.location) ||
    !isNonEmptyString(item.image) ||
    !isNumber(item.price) ||
    !isNumber(item.stock) ||
    !isNumber(item.rating) ||
    !isNumber(item.reviewsCount)
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    gender: item.gender as Product["gender"],
    type: item.type as Product["type"],
    location: item.location as Product["location"],
    image: item.image,
    stock: item.stock,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
  };
}

function buildProductsUrl(options: ProductQueryOptions) {
  const url = new URL(PRODUCTS_ENDPOINT);

  const params: Record<string, string | undefined> = {
    category: options.category,
    gender: options.gender,
    type: options.type,
    location: options.location,
    q: options.q,
  };

  Object.entries(params).forEach(([key, value]) => {
    if (isNonEmptyString(value)) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export async function getProducts(options: ProductQueryOptions = {}): Promise<Product[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortListener = () => controller.abort();

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", abortListener, { once: true });
    }
  }

  try {
    const response = await fetch(buildProductsUrl(options), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Product API request failed with status ${response.status}.`;

      try {
        const errorBody = (await response.json()) as { message?: string };
        if (isNonEmptyString(errorBody.message)) {
          message = errorBody.message;
        }
      } catch {
        // Ignore JSON parsing failures and keep the default message.
      }

      throw new Error(message);
    }

    const data = (await response.json()) as ProductListResponse | Product[];
    const rawProducts = Array.isArray(data)
      ? data
      : Array.isArray(data.products)
        ? data.products
        : null;

    if (!rawProducts) {
      throw new Error("Product API returned an invalid payload.");
    }

    const normalizedProducts = rawProducts
      .map(normalizeProduct)
      .filter((product): product is Product => product !== null);

    if (rawProducts.length > 0 && normalizedProducts.length === 0) {
      throw new Error("Product API returned products in an unsupported format.");
    }

    return normalizedProducts;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Product API request timed out.");
    }

    throw error instanceof Error ? error : new Error("Unable to load products.");
  } finally {
    window.clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener("abort", abortListener);
    }
  }
}
