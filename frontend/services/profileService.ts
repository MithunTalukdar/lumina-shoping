import { io } from 'socket.io-client';
import {
  AgentLocation,
  DeliveryAgentSummary,
  DeliveryEstimate,
  NotificationItem,
  Order,
  OrderItem,
  OrderShippingAddress,
  OrderStatus,
  Product,
  ShippingAddress,
  TrackingStep,
} from '../types';
import { ShippingAddressInput, getIndianLocationMeta } from '../utils/india';
import { buildApiUrl, getApiOrigin } from './apiBase';
import { authHeaders, getAuthToken } from './authService';

const REQUEST_TIMEOUT_MS = 8000;

interface OrdersResponse {
  orders: Order[];
}

interface OrderResponse {
  order: Order;
}

interface AddressResponse {
  message?: string;
  addresses: ShippingAddress[];
}

export interface ChangePasswordInput {
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
  return value === 'placed' || value === 'packed' || value === 'shipped' || value === 'out_for_delivery' || value === 'delivered' || value === 'cancelled';
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

function normalizeAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.phone) ||
    !isNonEmptyString(item.addressLine) ||
    !isNonEmptyString(item.city) ||
    !isNonEmptyString(item.state) ||
    !isNonEmptyString(item.pincode)
  ) {
    return null;
  }

  const cityMeta = getIndianLocationMeta(item.city);
  return {
    id: item.id,
    name: item.name,
    phone: item.phone,
    addressLine: item.addressLine,
    city: (cityMeta?.city ?? item.city) as ShippingAddress['city'],
    state: item.state,
    pincode: item.pincode,
    isDefault: Boolean(item.isDefault),
  };
}

function normalizeOrderShippingAddress(value: unknown): OrderShippingAddress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.phone) ||
    !isNonEmptyString(item.addressLine) ||
    !isNonEmptyString(item.city) ||
    !isNonEmptyString(item.state) ||
    !isNonEmptyString(item.pincode)
  ) {
    return null;
  }

  const cityMeta = getIndianLocationMeta(item.city);
  return {
    name: item.name,
    phone: item.phone,
    addressLine: item.addressLine,
    city: (cityMeta?.city ?? item.city) as OrderShippingAddress['city'],
    state: item.state,
    pincode: item.pincode,
  };
}

function normalizeEstimate(value: unknown): DeliveryEstimate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.city) ||
    !isNonEmptyString(item.state) ||
    !isNumber(item.minDays) ||
    !isNumber(item.maxDays) ||
    !isNonEmptyString(item.label) ||
    !isNonEmptyString(item.etaStart) ||
    !isNonEmptyString(item.etaEnd)
  ) {
    return null;
  }

  return {
    city: item.city as DeliveryEstimate['city'],
    state: item.state,
    minDays: item.minDays,
    maxDays: item.maxDays,
    label: item.label,
    etaStart: item.etaStart,
    etaEnd: item.etaEnd,
  };
}

function normalizeDeliveryAgent(value: unknown): DeliveryAgentSummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name) || !isNonEmptyString(item.email) || !isNonEmptyString(item.phone)) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
  };
}

function normalizeAgentLocation(value: unknown): AgentLocation | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (!isNumber(item.lat) || !isNumber(item.lng) || !isNonEmptyString(item.city) || !isNonEmptyString(item.state) || !isNonEmptyString(item.updatedAt)) {
    return null;
  }

  return {
    lat: item.lat,
    lng: item.lng,
    city: item.city as AgentLocation['city'],
    state: item.state,
    updatedAt: item.updatedAt,
    label: isNonEmptyString(item.label) ? item.label : 'Live location',
  };
}

function normalizeTrackingStep(value: unknown): TrackingStep | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (!isNonEmptyString(item.status) || !isNonEmptyString(item.label) || !isNonEmptyString(item.description)) {
    return null;
  }

  return {
    status: item.status as TrackingStep['status'],
    label: item.label,
    description: item.description,
    completedAt: isNonEmptyString(item.completedAt) ? item.completedAt : null,
  };
}

function normalizeNotification(value: unknown): NotificationItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.title) ||
    !isNonEmptyString(item.message) ||
    !isOrderStatus(item.status) ||
    !isNonEmptyString(item.createdAt) ||
    !Array.isArray(item.channels)
  ) {
    return null;
  }

  return {
    id: item.id,
    status: item.status,
    title: item.title,
    message: item.message,
    channels: item.channels.filter(isNonEmptyString) as NotificationItem['channels'],
    createdAt: item.createdAt,
  };
}

function normalizeOrder(value: unknown): Order | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const order = value as Record<string, unknown>;
  if (
    !isNonEmptyString(order.id) ||
    !isNonEmptyString(order.orderNumber) ||
    !isNonEmptyString(order.userId) ||
    !isNumber(order.subtotal) ||
    !isNumber(order.shipping) ||
    !isNumber(order.tax) ||
    !isNumber(order.total) ||
    !isOrderStatus(order.status) ||
    !isNonEmptyString(order.createdAt) ||
    !isNonEmptyString(order.updatedAt) ||
    !Array.isArray(order.items)
  ) {
    return null;
  }

  const shippingAddress = normalizeOrderShippingAddress(order.shippingAddress);
  const estimatedDelivery = normalizeEstimate(order.estimatedDelivery);
  if (!shippingAddress || !estimatedDelivery) {
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    items: order.items.map(normalizeOrderItem).filter((item): item is OrderItem => item !== null),
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    status: order.status,
    shippingAddress,
    estimatedDelivery,
    deliveryAgent: normalizeDeliveryAgent(order.deliveryAgent),
    latestAgentLocation: normalizeAgentLocation(order.latestAgentLocation),
    trackingSteps: Array.isArray(order.trackingSteps)
      ? order.trackingSteps.map(normalizeTrackingStep).filter((step): step is TrackingStep => step !== null)
      : [],
    notifications: Array.isArray(order.notifications)
      ? order.notifications.map(normalizeNotification).filter((item): item is NotificationItem => item !== null)
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
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

export async function getAddresses(): Promise<ShippingAddress[]> {
  const payload = await request<AddressResponse>('/api/account/addresses', { method: 'GET' }, 'Unable to load shipping addresses.');
  return Array.isArray(payload.addresses)
    ? payload.addresses.map(normalizeAddress).filter((address): address is ShippingAddress => address !== null)
    : [];
}

export async function createAddress(input: ShippingAddressInput): Promise<ShippingAddress[]> {
  const payload = await request<AddressResponse>(
    '/api/account/addresses',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    'Unable to save shipping address.'
  );

  return Array.isArray(payload.addresses)
    ? payload.addresses.map(normalizeAddress).filter((address): address is ShippingAddress => address !== null)
    : [];
}

export async function updateAddress(addressId: string, input: ShippingAddressInput): Promise<ShippingAddress[]> {
  const payload = await request<AddressResponse>(
    `/api/account/addresses/${addressId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
    'Unable to update shipping address.'
  );

  return Array.isArray(payload.addresses)
    ? payload.addresses.map(normalizeAddress).filter((address): address is ShippingAddress => address !== null)
    : [];
}

export async function deleteAddress(addressId: string): Promise<ShippingAddress[]> {
  const payload = await request<AddressResponse>(
    `/api/account/addresses/${addressId}`,
    {
      method: 'DELETE',
    },
    'Unable to remove shipping address.'
  );

  return Array.isArray(payload.addresses)
    ? payload.addresses.map(normalizeAddress).filter((address): address is ShippingAddress => address !== null)
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

export function subscribeToOrderTracking(orderId: string, onOrder: (order: Order) => void, onError?: (message: string) => void) {
  const token = getAuthToken();
  if (!token) {
    onError?.('Missing auth token.');
    return () => undefined;
  }

  const socket = io(getApiOrigin(), {
    autoConnect: false,
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket.emit('orders:subscribe', { orderId });
  });

  socket.on('orders:update', (payload: OrderResponse) => {
    try {
      const normalizedOrder = normalizeOrder(payload.order);

      if (normalizedOrder?.id === orderId) {
        onOrder(normalizedOrder);
      }
    } catch (error) {
      onError?.('Unable to process tracking update.');
    }
  });

  socket.on('orders:error', (payload: { message?: string; orderId?: string }) => {
    if (!payload?.orderId || payload.orderId === orderId) {
      onError?.(isNonEmptyString(payload?.message) ? payload.message : 'Live tracking connection was interrupted.');
    }
  });

  socket.on('connect_error', (error: Error) => {
    onError?.(error.message || 'Live tracking connection was interrupted.');
  });

  socket.connect();

  return () => {
    socket.emit('orders:unsubscribe', { orderId });
    socket.disconnect();
  };
}
