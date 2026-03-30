import {
  AdminAnalytics,
  AdminBestSeller,
  AdminCatalogSection,
  AdminOrder,
  AdminProduct,
  AdminSalesPoint,
  AdminUserRecord,
  DeliveryAgentSummary,
  NotificationItem,
  OrderItem,
  OrderShippingAddress,
  OrderStatus,
  Product,
  TrackingStep,
  type DeliveryEstimate,
  type AgentLocation,
} from '../types';
import { buildApiUrl } from './apiBase';
import { authHeaders } from './authService';

const REQUEST_TIMEOUT_MS = 10000;
const ADMIN_ENDPOINT = buildApiUrl('/api/admin');

export interface AdminProductFilters {
  q?: string;
  section?: AdminCatalogSection | 'All';
  minPrice?: number;
  maxPrice?: number;
  stock?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface AdminProductInput {
  name: string;
  price: number;
  section: AdminCatalogSection;
  category: string;
  description: string;
  stock: number;
  rating: number;
  location: Product['location'];
  images: string[];
  gender?: Product['gender'];
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

function isAdminCatalogSection(value: unknown): value is AdminCatalogSection {
  return value === 'Men' || value === 'Women' || value === 'Shoes' || value === 'Suit';
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
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  };
}

function normalizeShippingAddress(value: unknown): OrderShippingAddress | null {
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

  return {
    name: item.name,
    phone: item.phone,
    addressLine: item.addressLine,
    city: item.city as Product['location'],
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
    city: item.city as Product['location'],
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
    city: item.city as Product['location'],
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
    !Array.isArray(item.channels) ||
    !isNonEmptyString(item.createdAt)
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    message: item.message,
    status: item.status,
    channels: item.channels.filter(isNonEmptyString) as NotificationItem['channels'],
    createdAt: item.createdAt,
  };
}

function normalizeAdminProduct(value: unknown): AdminProduct | null {
  if (!value || typeof value !== 'object') {
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
    !isAdminCatalogSection(item.section) ||
    !isNumber(item.price) ||
    !isNumber(item.stock) ||
    !isNumber(item.rating) ||
    !isNumber(item.reviewsCount) ||
    !isNonEmptyString(item.createdAt) ||
    !isNonEmptyString(item.updatedAt)
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    section: item.section,
    gender: item.gender as Product['gender'],
    type: item.type as Product['type'],
    location: item.location as Product['location'],
    image: item.image,
    images: Array.isArray(item.images) ? item.images.filter(isNonEmptyString) : undefined,
    stock: item.stock,
    rating: item.rating,
    reviewsCount: item.reviewsCount,
    discountPercentage: isNumber(item.discountPercentage) ? item.discountPercentage : undefined,
    originalPrice: isNumber(item.originalPrice) ? item.originalPrice : undefined,
    badges: Array.isArray(item.badges) ? item.badges.filter(isNonEmptyString) as Product['badges'] : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeAdminOrder(value: unknown): AdminOrder | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.orderNumber) ||
    !isNonEmptyString(item.userId) ||
    !isNumber(item.subtotal) ||
    !isNumber(item.shipping) ||
    !isNumber(item.tax) ||
    !isNumber(item.total) ||
    !isOrderStatus(item.status) ||
    !Array.isArray(item.items) ||
    !isNumber(item.itemCount) ||
    !isNonEmptyString(item.createdAt) ||
    !isNonEmptyString(item.updatedAt)
  ) {
    return null;
  }

  const shippingAddress = normalizeShippingAddress(item.shippingAddress);
  const estimatedDelivery = normalizeEstimate(item.estimatedDelivery);
  if (!shippingAddress || !estimatedDelivery) {
    return null;
  }

  const customer =
    item.customer && typeof item.customer === 'object'
      ? (() => {
          const rawCustomer = item.customer as Record<string, unknown>;
          if (!isNonEmptyString(rawCustomer.id) || !isNonEmptyString(rawCustomer.name) || !isNonEmptyString(rawCustomer.email)) {
            return null;
          }

          return {
            id: rawCustomer.id,
            name: rawCustomer.name,
            email: rawCustomer.email,
            isBlocked: Boolean(rawCustomer.isBlocked),
          };
        })()
      : null;

  return {
    id: item.id,
    orderNumber: item.orderNumber,
    userId: item.userId,
    items: item.items.map(normalizeOrderItem).filter((entry): entry is OrderItem => entry !== null),
    subtotal: item.subtotal,
    shipping: item.shipping,
    tax: item.tax,
    total: item.total,
    status: item.status,
    shippingAddress,
    estimatedDelivery,
    deliveryAgent: normalizeDeliveryAgent(item.deliveryAgent),
    latestAgentLocation: normalizeAgentLocation(item.latestAgentLocation),
    trackingSteps: Array.isArray(item.trackingSteps)
      ? item.trackingSteps.map(normalizeTrackingStep).filter((entry): entry is TrackingStep => entry !== null)
      : [],
    notifications: Array.isArray(item.notifications)
      ? item.notifications.map(normalizeNotification).filter((entry): entry is NotificationItem => entry !== null)
      : [],
    customer,
    itemCount: item.itemCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeAdminUser(value: unknown): AdminUserRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.name) ||
    !isNonEmptyString(item.email) ||
    !isNonEmptyString(item.role) ||
    !isNumber(item.ordersCount) ||
    !isNumber(item.totalSpend) ||
    !isNonEmptyString(item.createdAt)
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role as AdminUserRecord['role'],
    isBlocked: Boolean(item.isBlocked),
    ordersCount: item.ordersCount,
    totalSpend: item.totalSpend,
    createdAt: item.createdAt,
    lastOrderAt: isNonEmptyString(item.lastOrderAt) ? item.lastOrderAt : null,
  };
}

function normalizeSalesPoint(value: unknown): AdminSalesPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (!isNonEmptyString(item.label) || !isNumber(item.revenue) || !isNumber(item.orders)) {
    return null;
  }

  return {
    label: item.label,
    revenue: item.revenue,
    orders: item.orders,
  };
}

function normalizeBestSeller(value: unknown): AdminBestSeller | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (!isNonEmptyString(item.productId) || !isNonEmptyString(item.name) || !isNumber(item.unitsSold) || !isNumber(item.revenue)) {
    return null;
  }

  return {
    productId: item.productId,
    name: item.name,
    unitsSold: item.unitsSold,
    revenue: item.revenue,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ADMIN_ENDPOINT}${path}`, {
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
          : 'Admin request failed.';

      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Admin request timed out.');
    }

    throw error instanceof Error ? error : new Error('Unable to complete admin request.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildProductsPath(filters: AdminProductFilters = {}) {
  const params = new URLSearchParams();

  if (isNonEmptyString(filters.q)) {
    params.set('q', filters.q.trim());
  }

  if (filters.section && filters.section !== 'All') {
    params.set('section', filters.section);
  }

  if (isNumber(filters.minPrice)) {
    params.set('minPrice', String(filters.minPrice));
  }

  if (isNumber(filters.maxPrice)) {
    params.set('maxPrice', String(filters.maxPrice));
  }

  if (filters.stock && filters.stock !== 'all') {
    params.set('stock', filters.stock);
  }

  const queryString = params.toString();
  return `/products${queryString ? `?${queryString}` : ''}`;
}

export async function getAdminProducts(filters: AdminProductFilters = {}): Promise<AdminProduct[]> {
  const payload = await request<{ products?: unknown }>(buildProductsPath(filters), { method: 'GET' });
  return Array.isArray(payload.products)
    ? payload.products.map(normalizeAdminProduct).filter((product): product is AdminProduct => product !== null)
    : [];
}

export async function createAdminProduct(input: AdminProductInput): Promise<AdminProduct> {
  const payload = await request<{ product?: unknown; message?: string }>('/product', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const product = normalizeAdminProduct(payload.product);
  if (!product) {
    throw new Error('Admin API returned an invalid product payload.');
  }

  return product;
}

export async function updateAdminProduct(productId: string, input: AdminProductInput): Promise<AdminProduct> {
  const payload = await request<{ product?: unknown }>(`/product/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

  const product = normalizeAdminProduct(payload.product);
  if (!product) {
    throw new Error('Admin API returned an invalid product payload.');
  }

  return product;
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  await request<{ message?: string }>(`/product/${productId}`, {
    method: 'DELETE',
  });
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const payload = await request<{ orders?: unknown }>('/orders', { method: 'GET' });
  return Array.isArray(payload.orders)
    ? payload.orders.map(normalizeAdminOrder).filter((order): order is AdminOrder => order !== null)
    : [];
}

export async function updateAdminOrderStatus(orderId: string, status: Extract<OrderStatus, 'packed' | 'shipped' | 'out_for_delivery' | 'delivered'>): Promise<AdminOrder> {
  const payload = await request<{ order?: unknown }>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  const order = normalizeAdminOrder(payload.order);
  if (!order) {
    throw new Error('Admin API returned an invalid order payload.');
  }

  return order;
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  const payload = await request<{ users?: unknown }>('/users', { method: 'GET' });
  return Array.isArray(payload.users)
    ? payload.users.map(normalizeAdminUser).filter((user): user is AdminUserRecord => user !== null)
    : [];
}

export async function setAdminUserBlocked(userId: string, blocked: boolean): Promise<AdminUserRecord> {
  const payload = await request<{ user?: unknown }>(`/users/${userId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ blocked }),
  });

  const user = normalizeAdminUser(payload.user);
  if (!user) {
    throw new Error('Admin API returned an invalid user payload.');
  }

  return user;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const payload = await request<{
    summary?: unknown;
    recentOrders?: unknown;
    newUsers?: unknown;
    salesOverTime?: unknown;
    weeklySales?: unknown;
    bestSellingProducts?: unknown;
  }>('/analytics', { method: 'GET' });

  const summary = payload.summary && typeof payload.summary === 'object' ? (payload.summary as Record<string, unknown>) : {};
  if (!isNumber(summary.totalUsers) || !isNumber(summary.totalOrders) || !isNumber(summary.totalRevenue) || !isNumber(summary.totalProducts)) {
    throw new Error('Admin analytics payload is invalid.');
  }

  return {
    summary: {
      totalUsers: summary.totalUsers,
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      totalProducts: summary.totalProducts,
    },
    recentOrders: Array.isArray(payload.recentOrders)
      ? payload.recentOrders.map(normalizeAdminOrder).filter((order): order is AdminOrder => order !== null)
      : [],
    newUsers: Array.isArray(payload.newUsers)
      ? payload.newUsers.map(normalizeAdminUser).filter((user): user is AdminUserRecord => user !== null)
      : [],
    salesOverTime: Array.isArray(payload.salesOverTime)
      ? payload.salesOverTime.map(normalizeSalesPoint).filter((point): point is AdminSalesPoint => point !== null)
      : [],
    weeklySales: Array.isArray(payload.weeklySales)
      ? payload.weeklySales.map(normalizeSalesPoint).filter((point): point is AdminSalesPoint => point !== null)
      : [],
    bestSellingProducts: Array.isArray(payload.bestSellingProducts)
      ? payload.bestSellingProducts.map(normalizeBestSeller).filter((item): item is AdminBestSeller => item !== null)
      : [],
  };
}
