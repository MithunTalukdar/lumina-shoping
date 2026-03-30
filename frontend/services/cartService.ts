import { CartItem, DeliveryEstimate, OrderShippingAddress, ProductBadge } from "../types";
import { buildApiUrl } from "./apiBase";
import { authHeaders } from "./authService";

const CART_ENDPOINT = buildApiUrl("/api/cart");
const REQUEST_TIMEOUT_MS = 8000;

interface CartSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface CheckoutResponse {
  message: string;
  orderSummary: CartSummary;
  items: CartItem[];
  orderId: string;
  orderNumber: string;
  shippingAddress: OrderShippingAddress | null;
  estimatedDelivery: DeliveryEstimate | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isProductBadge(value: unknown): value is ProductBadge {
  return value === "New" || value === "Trending" || value === "Out of Stock";
}

function buildFallbackSummary(items: CartItem[]): CartSummary {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const tax = Math.round(subtotal * 0.1);

  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    currency: "INR",
  };
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;

  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.description) ||
    !isNonEmptyString(item.category) ||
    !isNonEmptyString(item.image) ||
    !isNumber(item.price) ||
    !isNumber(item.stock) ||
    !isNumber(item.rating) ||
    !isNumber(item.reviewsCount) ||
    !isNumber(item.quantity)
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    gender: isNonEmptyString(item.gender) ? item.gender as CartItem["gender"] : "men",
    type: isNonEmptyString(item.type) ? item.type as CartItem["type"] : "clothing",
    location: isNonEmptyString(item.location) ? item.location as CartItem["location"] : "Kolkata",
    image: item.image,
    images: Array.isArray(item.images) ? item.images.filter(isNonEmptyString) : undefined,
    stock: item.stock,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    discountPercentage: isNumber(item.discountPercentage) ? item.discountPercentage : undefined,
    originalPrice: isNumber(item.originalPrice) ? item.originalPrice : undefined,
    badges: Array.isArray(item.badges) ? item.badges.filter(isProductBadge) : undefined,
    quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
  };
}

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeCartItem)
    .filter((item): item is CartItem => item !== null);
}

function normalizeSummary(value: unknown, items: CartItem[]): CartSummary {
  if (!value || typeof value !== "object") {
    return buildFallbackSummary(items);
  }

  const summary = value as Record<string, unknown>;
  if (
    !isNumber(summary.subtotal) ||
    !isNumber(summary.shipping) ||
    !isNumber(summary.tax) ||
    !isNumber(summary.total)
  ) {
    return buildFallbackSummary(items);
  }

  return {
    subtotal: summary.subtotal,
    shipping: summary.shipping,
    tax: summary.tax,
    total: summary.total,
    currency: isNonEmptyString(summary.currency) ? summary.currency : "INR",
  };
}

function normalizeCartResponse(value: unknown): CartResponse {
  const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = normalizeCartItems(payload.items);

  return {
    items,
    summary: normalizeSummary(payload.summary, items),
  };
}

function normalizeCheckoutResponse(value: unknown): CheckoutResponse {
  const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = normalizeCartItems(payload.items);
  const shippingAddress =
    payload.shippingAddress && typeof payload.shippingAddress === "object"
      ? (payload.shippingAddress as unknown as OrderShippingAddress)
      : null;
  const estimatedDelivery =
    payload.estimatedDelivery && typeof payload.estimatedDelivery === "object"
      ? (payload.estimatedDelivery as unknown as DeliveryEstimate)
      : null;

  return {
    message: isNonEmptyString(payload.message) ? payload.message : "Order placed successfully.",
    orderSummary: normalizeSummary(payload.orderSummary, items),
    items,
    orderId: isNonEmptyString(payload.orderId) ? payload.orderId : "",
    orderNumber: isNonEmptyString(payload.orderNumber) ? payload.orderNumber : "",
    shippingAddress,
    estimatedDelivery,
  };
}

async function request(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${CART_ENDPOINT}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data === "object" && "message" in data && isNonEmptyString(data.message)
          ? data.message
          : "Cart request failed.";

      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Cart request timed out.");
    }

    throw error instanceof Error ? error : new Error("Unable to complete cart request.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getCart(): Promise<CartResponse> {
  return normalizeCartResponse(await request("", { method: "GET" }));
}

export async function saveCart(items: CartItem[]): Promise<CartResponse> {
  return normalizeCartResponse(
    await request("", {
      method: "PUT",
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    })
  );
}

export async function checkoutCart(addressId?: string): Promise<CheckoutResponse> {
  return normalizeCheckoutResponse(
    await request("/checkout", {
      method: "POST",
      body: JSON.stringify(addressId ? { addressId } : {}),
    })
  );
}
