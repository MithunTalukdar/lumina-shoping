import { Order, OrderItem, OrderStatus, Product } from '../types';
import { buildApiUrl } from './apiBase';
import { authHeaders } from './authService';

const REQUEST_TIMEOUT_MS = 8000;

interface OrdersResponse {
  orders: Order[];
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  message: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === 'pending' || value === 'delivered' || value === 'cancelled';
}

function normalizeOrderItem(value: unknown): OrderItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.productId) ||
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.description) ||
    !isNonEmptyString(item.image) ||
    !isNonEmptyString(item.category) ||
    !isNonEmptyString(item.location) ||
    !isNumber(item.price) ||
    !isNumber(item.quantity) ||
    !isNumber(item.lineTotal)
  ) {
    return null;
  }

  return {
    productId: item.productId,
    name: item.name,
    description: item.description,
    image: item.image,
    category: item.category,
    location: item.location as Product['location'],
    price: item.price,
    quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
    lineTotal: item.lineTotal,
  };
}

function normalizeOrder(value: unknown): Order | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const order = value as Record<string, unknown>;
  if (
    !isNonEmptyString(order.id) ||
    !isNonEmptyString(order.userId) ||
    !isNumber(order.subtotal) ||
    !isNumber(order.shipping) ||
    !isNumber(order.tax) ||
    !isNumber(order.total) ||
    !isOrderStatus(order.status) ||
    !isNonEmptyString(order.createdAt) ||
    !Array.isArray(order.items)
  ) {
    return null;
  }

  return {
    id: order.id,
    userId: order.userId,
    items: order.items.map(normalizeOrderItem).filter((item): item is OrderItem => item !== null),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  };
}

async function request<T>(path: string, options: RequestInit = {}, fallbackMessage: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(path), {
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
          : fallbackMessage;

      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Profile request timed out.');
    }

    throw error instanceof Error ? error : new Error(fallbackMessage);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getOrders(): Promise<Order[]> {
  const payload = await request<OrdersResponse>('/api/orders', { method: 'GET' }, 'Unable to load orders.');
  return Array.isArray(payload.orders)
    ? payload.orders.map(normalizeOrder).filter((order): order is Order => order !== null)
    : [];
}

export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
  return request<ChangePasswordResponse>(
    '/api/change-password',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    'Unable to change password.'
  );
}
