
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

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
}

export type AppView = 'home' | 'shop' | 'product' | 'cart' | 'wishlist' | 'admin' | 'orders';
