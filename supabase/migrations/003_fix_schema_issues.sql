-- Migration: Fix schema issues for profiles and add addresses table
-- Date: 2024-12-07

-- 1. Add missing columns to profiles table
alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text;

-- 2. Create addresses table
create table if not exists public.addresses (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('home', 'work', 'other')) default 'home',
  street_address text not null,
  apartment text,
  city text not null,
  state text,
  postal_code text not null,
  country text default 'South Africa',
  is_default boolean default false,
  delivery_instructions text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Create delivery_zones table if it doesn't exist
create table if not exists public.delivery_zones (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  postal_codes text[] not null default '{}',
  delivery_fee decimal(8,2) not null default 0,
  min_order_amount decimal(8,2) not null default 0,
  estimated_delivery_time text default '60 minutes',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Create admin_settings table if it doesn't exist
create table if not exists public.admin_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamp with time zone default now()
);

-- 5. Create notifications table if it doesn't exist
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
  data jsonb default '{}',
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. Create inventory_movements table if it doesn't exist
create table if not exists public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  movement_type text check (movement_type in ('in', 'out', 'adjustment', 'damaged', 'expired')) not null,
  quantity integer not null,
  reference_type text, -- 'order', 'manual', 'supplier', etc.
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- 7. Add indexes for better performance
create index if not exists idx_addresses_customer_id on public.addresses(customer_id);
create index if not exists idx_addresses_is_default on public.addresses(customer_id, is_default) where is_default = true;
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_inventory_movements_product_id on public.inventory_movements(product_id);
create index if not exists idx_delivery_zones_active on public.delivery_zones(is_active) where is_active = true;

-- 8. Enable RLS on new tables
alter table public.addresses enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.admin_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.inventory_movements enable row level security;

-- 9. Create RLS policies for addresses
create policy "Users can view their own addresses" on public.addresses
  for select using (customer_id = auth.uid());

create policy "Users can insert their own addresses" on public.addresses
  for insert with check (customer_id = auth.uid());

create policy "Users can update their own addresses" on public.addresses
  for update using (customer_id = auth.uid());

create policy "Users can delete their own addresses" on public.addresses
  for delete using (customer_id = auth.uid());

create policy "Admins can manage all addresses" on public.addresses
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- 10. Create RLS policies for delivery_zones
create policy "Everyone can view active delivery zones" on public.delivery_zones
  for select using (is_active = true);

create policy "Admins can manage delivery zones" on public.delivery_zones
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- 11. Create RLS policies for admin_settings
create policy "Admins can manage admin settings" on public.admin_settings
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- 12. Create RLS policies for notifications
create policy "Users can view their own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users can update their own notifications" on public.notifications
  for update using (user_id = auth.uid());

create policy "Admins can create notifications for users" on public.notifications
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- 13. Create RLS policies for inventory_movements
create policy "Admins can view all inventory movements" on public.inventory_movements
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can create inventory movements" on public.inventory_movements
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- 14. Create trigger to ensure only one default address per customer
create or replace function ensure_single_default_address()
returns trigger as $$
begin
  if NEW.is_default = true then
    -- Set all other addresses for this customer to not default
    update public.addresses
    set is_default = false
    where customer_id = NEW.customer_id and id != NEW.id;
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trigger_ensure_single_default_address
  before insert or update on public.addresses
  for each row execute function ensure_single_default_address();

-- 15. Insert some default delivery zones for South Africa
insert into public.delivery_zones (name, postal_codes, delivery_fee, min_order_amount, estimated_delivery_time)
values
  ('Cape Town Central', array['8001', '8002', '8003', '8004', '8005'], 25.00, 150.00, '45-60 minutes'),
  ('Cape Town Northern Suburbs', array['7441', '7500', '7530', '7550', '7560'], 35.00, 200.00, '60-90 minutes'),
  ('Cape Town Southern Suburbs', array['7700', '7708', '7800', '7925', '7945'], 30.00, 175.00, '60-75 minutes'),
  ('Johannesburg Central', array['2000', '2001', '2017', '2092', '2196'], 30.00, 200.00, '60-90 minutes'),
  ('Johannesburg Sandton', array['2146', '2152', '2191', '2196'], 25.00, 150.00, '45-60 minutes'),
  ('Durban Central', array['4001', '4013', '4051', '4052'], 25.00, 175.00, '60-75 minutes')
on conflict do nothing;

-- 16. Insert default admin settings
insert into public.admin_settings (key, value, description)
values
  ('store_name', '"SPAR Express Delivery"', 'Name of the store'),
  ('store_email', '"support@spardelivery.co.za"', 'Store contact email'),
  ('store_phone', '"+27 21 123 4567"', 'Store contact phone'),
  ('delivery_fee', '25.00', 'Default delivery fee in ZAR'),
  ('free_delivery_threshold', '200.00', 'Minimum order amount for free delivery'),
  ('tax_rate', '0.15', 'VAT rate (15% in South Africa)'),
  ('currency', '"ZAR"', 'Store currency'),
  ('timezone', '"Africa/Johannesburg"', 'Store timezone'),
  ('business_hours', '{"monday": "08:00-20:00", "tuesday": "08:00-20:00", "wednesday": "08:00-20:00", "thursday": "08:00-20:00", "friday": "08:00-20:00", "saturday": "08:00-18:00", "sunday": "09:00-17:00"}', 'Business operating hours')
on conflict (key) do nothing;

-- 17. Update triggers for updated_at columns
create or replace function update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_addresses_updated_at before update on public.addresses for each row execute function update_updated_at_column();
create trigger trigger_delivery_zones_updated_at before update on public.delivery_zones for each row execute function update_updated_at_column();
create trigger trigger_admin_settings_updated_at before update on public.admin_settings for each row execute function update_updated_at_column();
