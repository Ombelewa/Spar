import { createClient } from "@supabase/supabase-js";

// Get environment variables with fallback to development values
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://seeauhltrvdxhlalgjpn.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWF1aGx0cnZkeGhsYWxnanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA5MDUsImV4cCI6MjA3NjcxNjkwNX0.evcsZ8u_Of5Ph4y7QECuuTqXGxQVG4b222fsxVCs8xM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types for TypeScript
export type Profile = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "customer" | "admin" | "super_admin";
  address?: string;
  city?: string;
  postal_code?: string;
  date_of_birth?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  category_id?: string;
  brand?: string;
  unit: string;
  weight?: number;
  dimensions?: any;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level?: number;
  is_active: boolean;
  is_featured: boolean;
  images: string[];
  tags: string[];
  nutritional_info?: any;
  allergen_info?: string[];
  expiry_date?: string;
  supplier_info?: any;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  delivery_method: "pickup" | "delivery";
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address?: any;
  delivery_date?: string;
  delivery_time_slot?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_details?: any;
  coupon_id?: string;
  coupon_code?: string;
  customer_notes?: string;
  admin_notes?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profile?: Profile;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total_price: number;
  product_details?: any;
  created_at: string;
  product?: Product;
};

export type CartItem = {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
};

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
};

export type DeliveryZone = {
  id: string;
  name: string;
  postal_codes: string[];
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time: string;
  is_active: boolean;
  created_at: string;
};

export type AdminSetting = {
  id: string;
  key: string;
  value: any;
  description?: string;
  updated_by?: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
};

// Helper functions for common operations
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
};

export const isAdmin = async () => {
  const profile = await getCurrentProfile();
  return profile?.role === "admin" || profile?.role === "super_admin";
};

export const isSuperAdmin = async () => {
  const profile = await getCurrentProfile();
  return profile?.role === "super_admin";
};

// Auth helpers
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (
  email: string,
  password: string,
  metadata?: any,
) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

// Real-time subscriptions
export const subscribeToOrders = (callback: (payload: any) => void) => {
  return supabase
    .channel("orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      callback,
    )
    .subscribe();
};

export const subscribeToNotifications = (
  userId: string,
  callback: (payload: any) => void,
) => {
  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      callback,
    )
    .subscribe();
};
