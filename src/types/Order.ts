// ==========================================
// Enums
// ==========================================

export enum OrderStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Shipped = 'SHIPPED',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
  Refunded = 'REFUNDED'
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Authorized = 'AUTHORIZED',
  Paid = 'PAID',
  Failed = 'FAILED',
  Refunded = 'REFUNDED'
}

export enum PaymentMethod {
  CreditCard = 'CREDIT_CARD',
  PayPal = 'PAYPAL',
  ApplePay = 'APPLE_PAY',
  Crypto = 'CRYPTO'
}

// ==========================================
// Supporting Interfaces
// ==========================================

export interface Address {
  fullName: string;
  streetAddress: string;
  apartmentOrSuite?: string; // Optional field
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount?: number;        // Optional field
  selectedAttributes?: {    // Optional nested record for things like size/color
    [key: string]: string;
  };
}

export interface PaymentDetails {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;   // Optional until payment is processed
  paidAt?: Date;            // Optional timestamp
}

export interface ShippingDetails {
  carrier: string;
  trackingNumber?: string;  // Optional until shipped
  estimatedDelivery?: Date; // Optional
  shippingCost: number;
}

// ==========================================
// Main Order Interface
// ==========================================

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];        // Array of objects
  status: OrderStatus;       // Enum
  payment: PaymentDetails;   // Nested object
  shippingAddress: Address;  // Nested object
  billingAddress: Address;   // Nested object
  shipping: ShippingDetails; // Nested object
  
  // Financial Breakdowns
  subtotal: number;
  tax: number;
  total: number;
  
  // Metadata / Timestamps
  notes?: string;            // Optional customer note
  createdAt: Date;
  updatedAt: Date;
}