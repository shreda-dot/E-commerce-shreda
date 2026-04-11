export type UserRole = 'admin' | 'customer';
export type UserStatus = 'active' | 'suspended' | 'frozen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  profileImage?: string | null;
}

export interface Product {
  id: string;
  image: string;
  name: string;
  priceCents: number;
  stock: number;
  rating: {
    stars: number;
    count: number;
  };
}

export interface CartItem {
  id: number;
  productId: string;
  quantity: number;
  deliveryOptionId: string;
  product?: Product | null;
}

export interface PaymentSummary {
  totalItems: number;
  productCostCents: number;
  shippingCostCents: number;
  totalCostBeforeTaxCents: number;
  taxCents: number;
  totalCostCents: number;
}

export interface CheckoutLocationStateItem {
  productId: string;
  name: string;
  image?: string;
  quantity: number;
  lineTotalCents: number;
}

export interface CheckoutLocationState {
  draftOrderId: string;
  totalCostCents: number;
  subtotalCents: number;
  taxCents: number;
  deliveryZoneLabel: string;
  shippingLabel?: string;
  deliveryFeeCents: number;
  deliveryFeeNgn?: number;
  items: CheckoutLocationStateItem[];
}

export interface ShippingConfig {
  id: string;
  zoneKey: string;
  method: 'standard' | 'express';
  usdFeeCents: number;
  ngnFee: number;
}

export interface OrderProduct {
  productId: string;
  quantity: number;
  estimatedDeliveryTimeMs: number;
  product?: Product | null;
}

export interface Order {
  id: string;
  orderTimeMs: string;
  totalCostCents: number;
  userId: string | null;
  deliveryZone?: string | null;
  deliveryAddress?: string | null;
  shippingMethod?: 'standard' | 'express';
  shippingMethodFeeCents?: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  products: OrderProduct[];
}
