import type { IndianCatalogLocation } from './utils/india';

export type ProductBadge = 'New' | 'Trending' | 'Out of Stock';
export type AdminCatalogSection = 'Men' | 'Women' | 'Shoes' | 'Suit';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  gender: 'men' | 'women';
  type: 'clothing' | 'shoes';
  location: IndianCatalogLocation;
  image: string;
  images?: string[];
  stock: number;
  rating: number;
  reviewsCount: number;
  discountPercentage?: number;
  originalPrice?: number;
  badges?: ProductBadge[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface ShippingAddress {
  id: string;
  name: string;
  phone: string;
  addressLine: string;
  city: IndianCatalogLocation;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderShippingAddress {
  name: string;
  phone: string;
  addressLine: string;
  city: IndianCatalogLocation;
  state: string;
  pincode: string;
}

export type UserRole = 'user' | 'admin' | 'delivery_agent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  addresses?: ShippingAddress[];
}

export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  location: Product['location'];
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface DeliveryEstimate {
  city: IndianCatalogLocation;
  state: string;
  minDays: number;
  maxDays: number;
  label: string;
  etaStart: string;
  etaEnd: string;
}

export interface DeliveryAgentSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AgentLocation {
  lat: number;
  lng: number;
  city: IndianCatalogLocation;
  state: string;
  updatedAt: string;
  label: string;
}

export interface TrackingStep {
  status: Exclude<OrderStatus, 'cancelled'>;
  label: string;
  description: string;
  completedAt: string | null;
}

export interface NotificationItem {
  id: string;
  status: OrderStatus;
  title: string;
  message: string;
  channels: Array<'email' | 'sms' | 'push'>;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  shippingAddress: OrderShippingAddress;
  estimatedDelivery: DeliveryEstimate;
  deliveryAgent: DeliveryAgentSummary | null;
  latestAgentLocation: AgentLocation | null;
  trackingSteps: TrackingStep[];
  notifications: NotificationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends Product {
  section: AdminCatalogSection;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomerSummary {
  id: string;
  name: string;
  email: string;
  isBlocked: boolean;
}

export interface AdminOrder extends Order {
  customer: AdminCustomerSummary | null;
  itemCount: number;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  ordersCount: number;
  totalSpend: number;
  createdAt: string;
  lastOrderAt: string | null;
}

export interface AdminAnalyticsSummary {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

export interface AdminSalesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface AdminBestSeller {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface AdminAnalytics {
  summary: AdminAnalyticsSummary;
  recentOrders: AdminOrder[];
  newUsers: AdminUserRecord[];
  salesOverTime: AdminSalesPoint[];
  weeklySales: AdminSalesPoint[];
  bestSellingProducts: AdminBestSeller[];
}

export type AppView = 'home' | 'shop' | 'product' | 'cart' | 'wishlist' | 'profile' | 'admin';
