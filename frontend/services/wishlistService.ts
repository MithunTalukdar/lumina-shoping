import { Product } from '../types';
import { buildApiUrl } from './apiBase';
import { authHeaders } from './authService';

const WISHLIST_ENDPOINT = buildApiUrl('/api/wishlist');
const REQUEST_TIMEOUT_MS = 8000;

interface WishlistResponse {
  items: Product[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') {
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
    gender: isNonEmptyString(item.gender) ? item.gender as Product['gender'] : 'men',
    type: isNonEmptyString(item.type) ? item.type as Product['type'] : 'clothing',
    location: isNonEmptyString(item.location) ? item.location as Product['location'] : 'India',
    image: item.image,
    stock: item.stock,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
  };
}

function normalizeWishlistResponse(value: unknown): WishlistResponse {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    items: Array.isArray(payload.items)
      ? payload.items.map(normalizeProduct).filter((item): item is Product => item !== null)
      : [],
  };
}

async function request(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${WISHLIST_ENDPOINT}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data && typeof data === 'object' && 'message' in data && isNonEmptyString(data.message)
          ? data.message
          : 'Wishlist request failed.';

      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Wishlist request timed out.');
    }

    throw error instanceof Error ? error : new Error('Unable to complete wishlist request.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getWishlist(): Promise<WishlistResponse> {
  return normalizeWishlistResponse(await request('', { method: 'GET' }));
}

export async function saveWishlist(items: Product[]): Promise<WishlistResponse> {
  return normalizeWishlistResponse(
    await request('', {
      method: 'PUT',
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.id,
        })),
      }),
    })
  );
}
