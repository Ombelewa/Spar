import {
  supabase,
  type Product,
  type Order,
  type Profile,
  type Category,
  type CartItem,
  type OrderItem,
  type Coupon,
  type DeliveryZone,
  type AdminSetting,
  type Notification,
} from "@/supabase";
import { toast } from "@/components/ui/use-toast";

// Error handling utility
const handleError = (error: any, operation: string) => {
  console.error(`Error in ${operation}:`, error);
  const message = error?.message || `Failed to ${operation}`;
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
  throw new Error(message);
};

// Success notification utility
const showSuccess = (message: string) => {
  toast({
    title: "Success",
    description: message,
    variant: "default",
  });
};

// AUTHENTICATION SERVICES
export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) handleError(error, "sign up");

    if (data.user) {
      showSuccess(
        "Account created successfully! Please check your email to verify your account.",
      );
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) handleError(error, "sign in");

    if (data.user) {
      showSuccess("Signed in successfully!");
    }

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) handleError(error, "sign out");

    // Clear any local storage
    localStorage.removeItem("adminToken");
    showSuccess("Signed out successfully!");
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) handleError(error, "get current user");
    return user;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) handleError(error, "reset password");
    showSuccess("Password reset email sent! Check your inbox.");
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) handleError(error, "update password");
    showSuccess("Password updated successfully!");
  },
};

// PROFILE SERVICES
export const profileService = {
  async getCurrentProfile() {
    const user = await authService.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) handleError(error, "get current profile");
    return data;
  },

  async updateProfile(updates: Partial<Profile>) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) handleError(error, "update profile");
    showSuccess("Profile updated successfully!");
    return data;
  },

  async isAdmin() {
    const profile = await this.getCurrentProfile();
    return profile?.role === "admin" || profile?.role === "super_admin";
  },

  async isSuperAdmin() {
    const profile = await this.getCurrentProfile();
    return profile?.role === "super_admin";
  },

  async getAllProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) handleError(error, "get all profiles");
    return data || [];
  },

  async updateUserRole(
    userId: string,
    role: "customer" | "admin" | "super_admin",
  ) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (error) handleError(error, "update user role");
    showSuccess(`User role updated to ${role}`);
    return data;
  },
};

// CATEGORY SERVICES
export const categoryService = {
  async getCategories(activeOnly = true) {
    let query = supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) handleError(error, "get categories");
    return data || [];
  },

  async getCategoryBySlug(slug: string) {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) handleError(error, "get category by slug");
    return data;
  },

  async createCategory(
    category: Omit<Category, "id" | "created_at" | "updated_at">,
  ) {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) handleError(error, "create category");
    showSuccess("Category created successfully!");
    return data;
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) handleError(error, "update category");
    showSuccess("Category updated successfully!");
    return data;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) handleError(error, "delete category");
    showSuccess("Category deleted successfully!");
  },
};

// PRODUCT SERVICES
export const productService = {
  async getProducts(
    filters: {
      categoryId?: string;
      search?: string;
      featured?: boolean;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    let query = supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .order("created_at", { ascending: false });

    if (filters.activeOnly !== false) {
      query = query.eq("is_active", true);
    }

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    if (filters.featured) {
      query = query.eq("is_featured", true);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1,
      );
    }

    const { data, error } = await query;
    if (error) handleError(error, "get products");
    return data || [];
  },

  async getProduct(id: string) {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) handleError(error, "get product");
    return data;
  },

  async createProduct(
    product: Omit<Product, "id" | "created_at" | "updated_at">,
  ) {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .single();

    if (error) handleError(error, "create product");
    showSuccess("Product created successfully!");
    return data;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .single();

    if (error) handleError(error, "update product");
    showSuccess("Product updated successfully!");
    return data;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) handleError(error, "delete product");
    showSuccess("Product deleted successfully!");
  },

  async updateStock(
    productId: string,
    quantity: number,
    reason: string,
    notes?: string,
  ) {
    const currentProduct = await this.getProduct(productId);
    if (!currentProduct) throw new Error("Product not found");

    const newStock = Math.max(0, currentProduct.stock_quantity + quantity);

    // Update product stock
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", productId);

    if (updateError) handleError(updateError, "update stock");

    // Log inventory movement
    const { error: logError } = await supabase
      .from("inventory_movements")
      .insert({
        product_id: productId,
        movement_type: quantity > 0 ? "in" : "out",
        quantity: Math.abs(quantity),
        previous_stock: currentProduct.stock_quantity,
        new_stock: newStock,
        reason,
        notes,
      });

    if (logError) handleError(logError, "log inventory movement");
    showSuccess("Stock updated successfully!");
  },

  async getLowStockProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .lte("stock_quantity", "min_stock_level")
      .eq("is_active", true);

    if (error) handleError(error, "get low stock products");
    return data || [];
  },
};

// CART SERVICES
export const cartService = {
  async getCart() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        *,
        product:products(*)
      `,
      )
      .eq("customer_id", user.id);

    if (error) handleError(error, "get cart");
    return data || [];
  },

  async addToCart(productId: string, quantity: number) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Check if item already exists in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("*")
      .eq("customer_id", user.id)
      .eq("product_id", productId)
      .single();

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id)
        .select(
          `
          *,
          product:products(*)
        `,
        )
        .single();

      if (error) handleError(error, "update cart item");
      showSuccess("Cart updated successfully!");
      return data;
    } else {
      // Add new item
      const { data, error } = await supabase
        .from("cart_items")
        .insert({
          customer_id: user.id,
          product_id: productId,
          quantity,
        })
        .select(
          `
          *,
          product:products(*)
        `,
        )
        .single();

      if (error) handleError(error, "add to cart");
      showSuccess("Added to cart successfully!");
      return data;
    }
  },

  async updateCartItem(itemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeFromCart(itemId);
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .select(
        `
        *,
        product:products(*)
      `,
      )
      .single();

    if (error) handleError(error, "update cart item");
    showSuccess("Cart updated successfully!");
    return data;
  },

  async removeFromCart(itemId: string) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) handleError(error, "remove from cart");
    showSuccess("Item removed from cart!");
  },

  async clearCart() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("customer_id", user.id);

    if (error) handleError(error, "clear cart");
  },
};

// ORDER SERVICES
export const orderService = {
  async createOrder(orderData: {
    items: { product_id: string; quantity: number; price: number }[];
    delivery_method: "pickup" | "delivery";
    delivery_address?: any;
    delivery_date?: string;
    delivery_time_slot?: string;
    payment_method: string;
    coupon_code?: string;
    customer_notes?: string;
  }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const profile = await profileService.getCurrentProfile();
    if (!profile) throw new Error("Profile not found");

    // Calculate totals
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    let discount_amount = 0;
    let coupon_id = null;

    // Apply coupon if provided
    if (orderData.coupon_code) {
      const coupon = await couponService.validateCoupon(
        orderData.coupon_code,
        subtotal,
      );
      if (coupon) {
        coupon_id = coupon.id;
        discount_amount =
          coupon.discount_type === "percentage"
            ? (subtotal * coupon.discount_value) / 100
            : coupon.discount_value;

        if (
          coupon.maximum_discount_amount &&
          discount_amount > coupon.maximum_discount_amount
        ) {
          discount_amount = coupon.maximum_discount_amount;
        }
      }
    }

    // Calculate delivery fee
    let delivery_fee = 0;
    if (
      orderData.delivery_method === "delivery" &&
      orderData.delivery_address?.postal_code
    ) {
      const zone = await deliveryService.getDeliveryZone(
        orderData.delivery_address.postal_code,
      );
      if (zone) {
        delivery_fee =
          subtotal >= zone.min_order_amount
            ? zone.delivery_fee
            : zone.delivery_fee;
      }
    }

    // Calculate tax (get from settings)
    const settings = await adminService.getSettings();
    const taxRate = settings.tax_rate || 0;
    const tax_amount = (subtotal - discount_amount) * taxRate;

    const total_amount = subtotal + tax_amount + delivery_fee - discount_amount;

    // Generate order number
    const { data: orderNumberData } = await supabase.rpc(
      "generate_order_number",
    );
    const order_number = orderNumberData || `SPR${Date.now()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number,
        customer_id: user.id,
        delivery_method: orderData.delivery_method,
        subtotal,
        tax_amount,
        delivery_fee,
        discount_amount,
        total_amount,
        customer_name: profile.full_name || profile.email,
        customer_email: profile.email,
        customer_phone: profile.phone || "",
        delivery_address: orderData.delivery_address,
        delivery_date: orderData.delivery_date,
        delivery_time_slot: orderData.delivery_time_slot,
        payment_method: orderData.payment_method,
        coupon_id,
        coupon_code: orderData.coupon_code,
        customer_notes: orderData.customer_notes,
      })
      .select()
      .single();

    if (orderError) handleError(orderError, "create order");

    // Create order items
    const orderItems = orderData.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) handleError(itemsError, "create order items");

    // Clear cart after successful order
    await cartService.clearCart();

    showSuccess("Order created successfully!");
    return order;
  },

  async getOrders(
    filters: {
      status?: string;
      customer_id?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          product:products(*)
        ),
        profile:profiles(full_name, email, phone)
      `,
      )
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1,
      );
    }

    const { data, error } = await query;
    if (error) handleError(error, "get orders");
    return data || [];
  },

  async getOrder(id: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          product:products(*)
        ),
        profile:profiles(full_name, email, phone)
      `,
      )
      .eq("id", id)
      .single();

    if (error) handleError(error, "get order");
    return data;
  },

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    const updates: any = { status };

    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    } else if (status === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = notes;
    }

    if (notes && status !== "cancelled") {
      updates.admin_notes = notes;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select()
      .single();

    if (error) handleError(error, "update order status");

    // Create notification for customer
    await notificationService.createNotification(
      data.customer_id,
      "Order Update",
      `Your order ${data.order_number} status has been updated to: ${status}`,
      "order_update",
      { order_id: orderId, status },
    );

    showSuccess("Order status updated successfully!");
    return data;
  },

  async getMyOrders() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    return this.getOrders({ customer_id: user.id });
  },

  async getOrderStats() {
    const { data, error } = await supabase
      .from("orders")
      .select("total_amount, status, created_at");

    if (error) handleError(error, "get order stats");

    const stats = {
      total_orders: data?.length || 0,
      total_revenue:
        data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0,
      pending_orders:
        data?.filter((order) => order.status === "pending").length || 0,
      completed_orders:
        data?.filter((order) => order.status === "delivered").length || 0,
    };

    return stats;
  },
};

// COUPON SERVICES
export const couponService = {
  async validateCoupon(code: string, orderAmount: number) {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .lte("valid_from", new Date().toISOString())
      .gte("valid_until", new Date().toISOString())
      .single();

    if (error) return null;

    if (data.minimum_order_amount > orderAmount) {
      throw new Error(
        `Minimum order amount for this coupon is $${data.minimum_order_amount}`,
      );
    }

    if (data.usage_limit && data.used_count >= data.usage_limit) {
      throw new Error("This coupon has reached its usage limit");
    }

    return data;
  },

  async applyCoupon(code: string) {
    const { error } = await supabase.rpc("increment_coupon_usage", {
      coupon_code: code,
    });

    if (error) handleError(error, "apply coupon");
  },

  async getCoupons() {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) handleError(error, "get coupons");
    return data || [];
  },

  async createCoupon(coupon: Omit<Coupon, "id" | "used_count" | "created_at">) {
    const { data, error } = await supabase
      .from("coupons")
      .insert(coupon)
      .select()
      .single();

    if (error) handleError(error, "create coupon");
    showSuccess("Coupon created successfully!");
    return data;
  },

  async updateCoupon(id: string, updates: Partial<Coupon>) {
    const { data, error } = await supabase
      .from("coupons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) handleError(error, "update coupon");
    showSuccess("Coupon updated successfully!");
    return data;
  },

  async deleteCoupon(id: string) {
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) handleError(error, "delete coupon");
    showSuccess("Coupon deleted successfully!");
  },
};

// DELIVERY SERVICES
export const deliveryService = {
  async getDeliveryZones() {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("is_active", true)
      .order("delivery_fee", { ascending: true });

    if (error) handleError(error, "get delivery zones");
    return data || [];
  },

  async getDeliveryZone(postalCode: string) {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .contains("postal_codes", [postalCode])
      .eq("is_active", true)
      .single();

    if (error) return null;
    return data;
  },

  async createDeliveryZone(zone: Omit<DeliveryZone, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("delivery_zones")
      .insert(zone)
      .select()
      .single();

    if (error) handleError(error, "create delivery zone");
    showSuccess("Delivery zone created successfully!");
    return data;
  },

  async updateDeliveryZone(id: string, updates: Partial<DeliveryZone>) {
    const { data, error } = await supabase
      .from("delivery_zones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) handleError(error, "update delivery zone");
    showSuccess("Delivery zone updated successfully!");
    return data;
  },

  async deleteDeliveryZone(id: string) {
    const { error } = await supabase
      .from("delivery_zones")
      .delete()
      .eq("id", id);

    if (error) handleError(error, "delete delivery zone");
    showSuccess("Delivery zone deleted successfully!");
  },
};

// NOTIFICATION SERVICES
export const notificationService = {
  async getNotifications() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) handleError(error, "get notifications");
    return data || [];
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) handleError(error, "mark notification as read");
  },

  async markAllAsRead() {
    const user = await authService.getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) handleError(error, "mark all notifications as read");
  },

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any,
  ) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      data,
    });

    if (error) handleError(error, "create notification");
  },

  async getUnreadCount() {
    const user = await authService.getCurrentUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) handleError(error, "get unread count");
    return count || 0;
  },
};

// ADMIN SERVICES
export const adminService = {
  async getSettings() {
    const { data, error } = await supabase.from("admin_settings").select("*");

    if (error) handleError(error, "get admin settings");

    // Convert to key-value object
    const settings: Record<string, any> = {};
    data?.forEach((setting) => {
      settings[setting.key] = JSON.parse(setting.value);
    });

    return settings;
  },

  async updateSetting(key: string, value: any, description?: string) {
    const { data, error } = await supabase
      .from("admin_settings")
      .upsert({
        key,
        value: JSON.stringify(value),
        description,
      })
      .select()
      .single();

    if (error) handleError(error, "update setting");
    showSuccess("Setting updated successfully!");
    return data;
  },

  async getDashboardStats() {
    const [orderStats, productCount, customerCount, lowStock] =
      await Promise.all([
        orderService.getOrderStats(),
        this.getProductCount(),
        this.getCustomerCount(),
        productService.getLowStockProducts(),
      ]);

    return {
      ...orderStats,
      total_products: productCount,
      total_customers: customerCount,
      low_stock_products: lowStock.length,
    };
  },

  async getProductCount() {
    const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) handleError(error, "get product count");
    return count || 0;
  },

  async getCustomerCount() {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer");

    if (error) handleError(error, "get customer count");
    return count || 0;
  },

  async getAuditLogs(limit = 100) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        *,
        profile:profiles(full_name, email)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) handleError(error, "get audit logs");
    return data || [];
  },

  async getInventoryMovements(productId?: string, limit = 100) {
    let query = supabase
      .from("inventory_movements")
      .select(
        `
        *,
        product:products(name, sku)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;
    if (error) handleError(error, "get inventory movements");
    return data || [];
  },
};

// FILE UPLOAD SERVICES
export const fileService = {
  async uploadFile(file: File, bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (error) handleError(error, "upload file");
    showSuccess("File uploaded successfully!");
    return data;
  },

  async getFileUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) handleError(error, "delete file");
  },

  async uploadProductImage(file: File, productId: string) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const data = await this.uploadFile(file, "product-images", filePath);
    const url = this.getFileUrl("product-images", filePath);

    return url;
  },
};

// REAL-TIME SERVICES
export const realtimeService = {
  subscribeToOrders(callback: (payload: any) => void) {
    return supabase
      .channel("orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        callback,
      )
      .subscribe();
  },

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
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
  },

  subscribeToProducts(callback: (payload: any) => void) {
    return supabase
      .channel("products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        callback,
      )
      .subscribe();
  },

  subscribeToCart(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel("cart")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `customer_id=eq.${userId}`,
        },
        callback,
      )
      .subscribe();
  },

  unsubscribe(channel: any) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },
};

// ANALYTICS SERVICES
export const analyticsService = {
  async getSalesData(period: "day" | "week" | "month" | "year" = "week") {
    let dateFormat = "%Y-%m-%d";
    let interval = "1 day";

    switch (period) {
      case "day":
        dateFormat = "%Y-%m-%d %H:00";
        interval = "1 hour";
        break;
      case "week":
        dateFormat = "%Y-%m-%d";
        interval = "1 day";
        break;
      case "month":
        dateFormat = "%Y-%m-%d";
        interval = "1 day";
        break;
      case "year":
        dateFormat = "%Y-%m";
        interval = "1 month";
        break;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("created_at, total_amount, status")
      .gte(
        "created_at",
        new Date(Date.now() - this.getPeriodMilliseconds(period)).toISOString(),
      )
      .eq("status", "delivered");

    if (error) handleError(error, "get sales data");

    // Group by date and calculate totals
    const salesByDate: Record<
      string,
      { date: string; revenue: number; orders: number }
    > = {};

    data?.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0];
      if (!salesByDate[date]) {
        salesByDate[date] = { date, revenue: 0, orders: 0 };
      }
      salesByDate[date].revenue += Number(order.total_amount);
      salesByDate[date].orders += 1;
    });

    return Object.values(salesByDate).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  },

  async getTopProducts(limit = 10) {
    const { data, error } = await supabase
      .from("order_items")
      .select(
        `
        product_id,
        product_name,
        quantity,
        total_price,
        product:products(name, images)
      `,
      )
      .limit(1000); // Get more data to aggregate

    if (error) handleError(error, "get top products");

    // Aggregate by product
    const productStats: Record<
      string,
      {
        product_id: string;
        name: string;
        image: string;
        total_quantity: number;
        total_revenue: number;
        order_count: number;
      }
    > = {};

    data?.forEach((item) => {
      if (!productStats[item.product_id]) {
        productStats[item.product_id] = {
          product_id: item.product_id,
          name: item.product_name,
          image: (item.product as any)?.images?.[0] || "",
          total_quantity: 0,
          total_revenue: 0,
          order_count: 0,
        };
      }

      productStats[item.product_id].total_quantity += item.quantity;
      productStats[item.product_id].total_revenue += Number(item.total_price);
      productStats[item.product_id].order_count += 1;
    });

    return Object.values(productStats)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  },

  async getCustomerStats() {
    const { data: customers, error: customersError } = await supabase
      .from("profiles")
      .select("id, created_at")
      .eq("role", "customer");

    if (customersError) handleError(customersError, "get customer stats");

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("customer_id, total_amount, created_at");

    if (ordersError) handleError(ordersError, "get customer orders");

    const totalCustomers = customers?.length || 0;
    const repeatCustomers = new Set(orders?.map((o) => o.customer_id)).size;
    const avgOrderValue = orders?.length
      ? orders.reduce((sum, order) => sum + Number(order.total_amount), 0) /
        orders.length
      : 0;

    return {
      total_customers: totalCustomers,
      repeat_customers: repeatCustomers,
      customer_retention_rate:
        totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
      average_order_value: avgOrderValue,
    };
  },

  getPeriodMilliseconds(period: string): number {
    switch (period) {
      case "day":
        return 24 * 60 * 60 * 1000;
      case "week":
        return 7 * 24 * 60 * 60 * 1000;
      case "month":
        return 30 * 24 * 60 * 60 * 1000;
      case "year":
        return 365 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  },
};

// SEARCH SERVICES
export const searchService = {
  async searchProducts(
    query: string,
    filters?: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
    },
  ) {
    let supabaseQuery = supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `,
      )
      .eq("is_active", true);

    // Text search
    if (query) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`,
      );
    }

    // Apply filters
    if (filters?.categoryId) {
      supabaseQuery = supabaseQuery.eq("category_id", filters.categoryId);
    }

    if (filters?.minPrice !== undefined) {
      supabaseQuery = supabaseQuery.gte("price", filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      supabaseQuery = supabaseQuery.lte("price", filters.maxPrice);
    }

    if (filters?.inStock) {
      supabaseQuery = supabaseQuery.gt("stock_quantity", 0);
    }

    const { data, error } = await supabaseQuery
      .order("name", { ascending: true })
      .limit(50);

    if (error) handleError(error, "search products");
    return data || [];
  },

  async getSearchSuggestions(query: string, limit = 5) {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from("products")
      .select("name")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) return [];
    return data?.map((p) => p.name) || [];
  },
};
