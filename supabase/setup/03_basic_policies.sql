-- Step 3: Create basic RLS policies
-- Run this after creating helper functions

-- PROFILES TABLE POLICIES
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin(auth.uid()));

create policy "Super admins can manage profiles" on public.profiles
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- CATEGORIES TABLE POLICIES
create policy "Everyone can view active categories" on public.categories
  for select using (is_active = true);

create policy "Admins can view all categories" on public.categories
  for select using (public.is_admin(auth.uid()));

create policy "Admins can manage categories" on public.categories
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- PRODUCTS TABLE POLICIES
create policy "Everyone can view active products" on public.products
  for select using (is_active = true);

create policy "Admins can view all products" on public.products
  for select using (public.is_admin(auth.uid()));

create policy "Admins can manage products" on public.products
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- DELIVERY ZONES TABLE POLICIES
create policy "Everyone can view active delivery zones" on public.delivery_zones
  for select using (is_active = true);

create policy "Admins can manage delivery zones" on public.delivery_zones
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ADMIN SETTINGS TABLE POLICIES
create policy "Admins can view settings" on public.admin_settings
  for select using (public.is_admin(auth.uid()));

create policy "Super admins can manage settings" on public.admin_settings
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));
