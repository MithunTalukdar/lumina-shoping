
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  gender: 'men' | 'women';
  type: 'clothing' | 'shoes';
  location: 'India' | 'NRI' | 'Dhaka';
  image: string;
  stock: number;
  rating: number;
  reviewsCount: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled';

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

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export type AppView = 'home' | 'shop' | 'product' | 'cart' | 'wishlist' | 'profile' | 'admin';
