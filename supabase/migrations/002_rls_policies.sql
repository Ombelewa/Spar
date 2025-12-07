-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.inventory_movements enable row level security;

-- Helper functions for policies
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_super_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from public.profiles
    where id = user_id and role = 'super_admin'
  );
end;
$$ language plpgsql security definer;

-- PROFILES TABLE POLICIES
-- Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin(auth.uid()));

-- Admins can update user profiles (but not change roles unless super admin)
create policy "Admins can update profiles" on public.profiles
  for update using (
    public.is_admin(auth.uid()) and
    (public.is_super_admin(auth.uid()) or role = old.role)
  );

-- Super admins can insert new admin profiles
create policy "Super admins can create admin profiles" on public.profiles
  for insert with check (public.is_super_admin(auth.uid()));

-- CATEGORIES TABLE POLICIES
-- Everyone can view active categories
create policy "Everyone can view active categories" on public.categories
  for select using (is_active = true);

-- Admins can view all categories
create policy "Admins can view all categories" on public.categories
  for select using (public.is_admin(auth.uid()));

-- Admins can manage categories
create policy "Admins can insert categories" on public.categories
  for insert with check (public.is_admin(auth.uid()));

create policy "Admins can update categories" on public.categories
  for update using (public.is_admin(auth.uid()));

create policy "Admins can delete categories" on public.categories
  for delete using (public.is_admin(auth.uid()));

-- PRODUCTS TABLE POLICIES
-- Everyone can view active products
create policy "Everyone can view active products" on public.products
  for select using (is_active = true);

-- Admins can view all products
create policy "Admins can view all products" on public.products
  for select using (public.is_admin(auth.uid()));

-- Admins can manage products
create policy "Admins can insert products" on public.products
  for insert with check (public.is_admin(auth.uid()));

create policy "Admins can update products" on public.products
  for update using (public.is_admin(auth.uid()));

create policy "Admins can delete products" on public.products
  for delete using (public.is_admin(auth.uid()));

-- COUPONS TABLE POLICIES
-- Authenticated users can view active coupons they're entitled to use
create policy "Users can view active coupons" on public.coupons
  for select using (is_active = true and auth.role() = 'authenticated');

-- Admins can manage all coupons
create policy "Admins can view all coupons" on public.coupons
  for select using (public.is_admin(auth.uid()));

create policy "Admins can insert coupons" on public.coupons
  for insert with check (public.is_admin(auth.uid()));

create policy "Admins can update coupons" on public.coupons
  for update using (public.is_admin(auth.uid()));

create policy "Admins can delete coupons" on public.coupons
  for delete using (public.is_admin(auth.uid()));

-- ORDERS TABLE POLICIES
-- Users can view their own orders
create policy "Users can view own orders" on public.orders
  for select using (customer_id = auth.uid());

-- Users can create their own orders
create policy "Users can create own orders" on public.orders
  for insert with check (customer_id = auth.uid());

-- Users can update their own pending orders
create policy "Users can update own pending orders" on public.orders
  for update using (
    customer_id = auth.uid() and
    status = 'pending' and
    old.status = 'pending'
  );

-- Admins can view all orders
create policy "Admins can view all orders" on public.orders
  for select using (public.is_admin(auth.uid()));

-- Admins can update all orders
create policy "Admins can update all orders" on public.orders
  for update using (public.is_admin(auth.uid()));

-- ORDER_ITEMS TABLE POLICIES
-- Users can view order items for their orders
create policy "Users can view own order items" on public.order_items
  for select using (
    exists(
      select 1 from public.orders
      where id = order_id and customer_id = auth.uid()
    )
  );

-- Users can create order items for their orders
create policy "Users can create order items for own orders" on public.order_items
  for insert with check (
    exists(
      select 1 from public.orders
      where id = order_id and customer_id = auth.uid() and status = 'pending'
    )
  );

-- Admins can view all order items
create policy "Admins can view all order items" on public.order_items
  for select using (public.is_admin(auth.uid()));

-- CART_ITEMS TABLE POLICIES
-- Users can manage their own cart items
create policy "Users can manage own cart items" on public.cart_items
  for all using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Admins can view all cart items
create policy "Admins can view all cart items" on public.cart_items
  for select using (public.is_admin(auth.uid()));

-- PRODUCT_REVIEWS TABLE POLICIES
-- Everyone can view approved reviews
create policy "Everyone can view approved reviews" on public.product_reviews
  for select using (is_approved = true);

-- Users can view their own reviews (approved or not)
create policy "Users can view own reviews" on public.product_reviews
  for select using (customer_id = auth.uid());

-- Users can create reviews for products they've purchased
create policy "Users can create reviews for purchased products" on public.product_reviews
  for insert with check (
    customer_id = auth.uid() and
    exists(
      select 1 from public.order_items oi
      join public.orders o on oi.order_id = o.id
      where o.customer_id = auth.uid()
      and oi.product_id = product_reviews.product_id
      and o.status = 'delivered'
    )
  );

-- Users can update their own reviews
create policy "Users can update own reviews" on public.product_reviews
  for update using (customer_id = auth.uid());

-- Admins can view and manage all reviews
create policy "Admins can view all reviews" on public.product_reviews
  for select using (public.is_admin(auth.uid()));

create policy "Admins can update all reviews" on public.product_reviews
  for update using (public.is_admin(auth.uid()));

-- NOTIFICATIONS TABLE POLICIES
-- Users can view their own notifications
create policy "Users can view own notifications" on public.notifications
  for select using (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications" on public.notifications
  for update using (user_id = auth.uid());

-- Admins can create notifications for users
create policy "Admins can create notifications" on public.notifications
  for insert with check (public.is_admin(auth.uid()));

-- Admins can view all notifications
create policy "Admins can view all notifications" on public.notifications
  for select using (public.is_admin(auth.uid()));

-- DELIVERY_ZONES TABLE POLICIES
-- Everyone can view active delivery zones
create policy "Everyone can view active delivery zones" on public.delivery_zones
  for select using (is_active = true);

-- Admins can view all delivery zones
create policy "Admins can view all delivery zones" on public.delivery_zones
  for select using (public.is_admin(auth.uid()));

-- Admins can manage delivery zones
create policy "Admins can manage delivery zones" on public.delivery_zones
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ADMIN_SETTINGS TABLE POLICIES
-- Admins can view settings
create policy "Admins can view settings" on public.admin_settings
  for select using (public.is_admin(auth.uid()));

-- Super admins can manage settings
create policy "Super admins can manage settings" on public.admin_settings
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- AUDIT_LOGS TABLE POLICIES
-- Admins can view audit logs
create policy "Admins can view audit logs" on public.audit_logs
  for select using (public.is_admin(auth.uid()));

-- System can create audit logs (no user restrictions)
create policy "System can create audit logs" on public.audit_logs
  for insert with check (true);

-- INVENTORY_MOVEMENTS TABLE POLICIES
-- Admins can view all inventory movements
create policy "Admins can view inventory movements" on public.inventory_movements
  for select using (public.is_admin(auth.uid()));

-- Admins can create inventory movements
create policy "Admins can create inventory movements" on public.inventory_movements
  for insert with check (public.is_admin(auth.uid()));

-- System can create inventory movements (for automatic stock updates)
create policy "System can create inventory movements" on public.inventory_movements
  for insert with check (created_by is null);

-- Create function to automatically create profile after user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create function to log admin actions
create or replace function public.log_admin_action()
returns trigger as $$
begin
  if public.is_admin(auth.uid()) then
    insert into public.audit_logs (
      user_id, action, resource_type, resource_id, old_values, new_values
    ) values (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      coalesce(new.id, old.id),
      case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Create audit triggers for important tables
create trigger audit_products_trigger
  after insert or update or delete on public.products
  for each row execute function public.log_admin_action();

create trigger audit_orders_trigger
  after update on public.orders
  for each row execute function public.log_admin_action();

create trigger audit_categories_trigger
  after insert or update or delete on public.categories
  for each row execute function public.log_admin_action();
