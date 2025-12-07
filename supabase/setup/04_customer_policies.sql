-- Step 4: Create customer-related RLS policies
-- Run this after creating basic policies

-- ORDERS TABLE POLICIES
create policy "Users can view own orders" on public.orders
  for select using (customer_id = auth.uid());

create policy "Users can create own orders" on public.orders
  for insert with check (customer_id = auth.uid());

create policy "Users can update own pending orders" on public.orders
  for update using (
    customer_id = auth.uid() and
    status = 'pending'
  );

create policy "Admins can view all orders" on public.orders
  for select using (public.is_admin(auth.uid()));

create policy "Admins can update all orders" on public.orders
  for update using (public.is_admin(auth.uid()));

-- ORDER ITEMS TABLE POLICIES
create policy "Users can view own order items" on public.order_items
  for select using (
    exists(
      select 1 from public.orders
      where id = order_id and customer_id = auth.uid()
    )
  );

create policy "Users can create order items for own orders" on public.order_items
  for insert with check (
    exists(
      select 1 from public.orders
      where id = order_id and customer_id = auth.uid() and status = 'pending'
    )
  );

create policy "Admins can view all order items" on public.order_items
  for select using (public.is_admin(auth.uid()));

-- CART ITEMS TABLE POLICIES
create policy "Users can view own cart items" on public.cart_items
  for select using (customer_id = auth.uid());

create policy "Users can manage own cart items" on public.cart_items
  for insert with check (customer_id = auth.uid());

create policy "Users can update own cart items" on public.cart_items
  for update using (customer_id = auth.uid());

create policy "Users can delete own cart items" on public.cart_items
  for delete using (customer_id = auth.uid());

create policy "Admins can view all cart items" on public.cart_items
  for select using (public.is_admin(auth.uid()));

-- COUPONS TABLE POLICIES
create policy "Users can view active coupons" on public.coupons
  for select using (is_active = true and auth.role() = 'authenticated');

create policy "Admins can view all coupons" on public.coupons
  for select using (public.is_admin(auth.uid()));

create policy "Admins can manage coupons" on public.coupons
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- NOTIFICATIONS TABLE POLICIES
create policy "Users can view own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users can update own notifications" on public.notifications
  for update using (user_id = auth.uid());

create policy "Admins can create notifications" on public.notifications
  for insert with check (public.is_admin(auth.uid()));

create policy "Admins can view all notifications" on public.notifications
  for select using (public.is_admin(auth.uid()));
