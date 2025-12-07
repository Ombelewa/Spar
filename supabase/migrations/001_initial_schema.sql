-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create enum types
create type user_role as enum ('customer', 'admin', 'super_admin');
create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type delivery_method as enum ('pickup', 'delivery');

-- Create profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  role user_role default 'customer',
  address text,
  city text,
  postal_code text,
  date_of_birth date,
  avatar_url text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create products table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  compare_price decimal(10,2), -- original price for discounts
  cost_price decimal(10,2), -- for profit calculations
  sku text unique,
  barcode text,
  category_id uuid references public.categories(id),
  brand text,
  unit text default 'piece', -- kg, lbs, piece, pack, etc.
  weight decimal(8,3),
  dimensions jsonb, -- {length, width, height}
  stock_quantity integer default 0,
  min_stock_level integer default 5, -- for alerts
  max_stock_level integer,
  is_active boolean default true,
  is_featured boolean default false,
  images text[] default '{}',
  tags text[] default '{}',
  nutritional_info jsonb,
  allergen_info text[],
  expiry_date date,
  supplier_info jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create coupons table
create table public.coupons (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  description text,
  discount_type text check (discount_type in ('percentage', 'fixed_amount')),
  discount_value decimal(10,2) not null,
  minimum_order_amount decimal(10,2) default 0,
  maximum_discount_amount decimal(10,2),
  usage_limit integer,
  used_count integer default 0,
  valid_from timestamp with time zone default now(),
  valid_until timestamp with time zone,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Create orders table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null,
  customer_id uuid references public.profiles(id) not null,
  status order_status default 'pending',
  payment_status payment_status default 'pending',
  delivery_method delivery_method default 'delivery',

  -- Order totals
  subtotal decimal(10,2) not null,
  tax_amount decimal(10,2) default 0,
  delivery_fee decimal(10,2) default 0,
  discount_amount decimal(10,2) default 0,
  total_amount decimal(10,2) not null,

  -- Customer info
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,

  -- Delivery info
  delivery_address jsonb, -- {street, city, postal_code, instructions}
  delivery_date date,
  delivery_time_slot text,

  -- Payment info
  payment_method text,
  payment_reference text,
  payment_details jsonb,

  -- Coupon info
  coupon_id uuid references public.coupons(id),
  coupon_code text,

  -- Order notes
  customer_notes text,
  admin_notes text,

  -- Tracking
  estimated_delivery timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create order_items table
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null, -- snapshot at time of order
  product_price decimal(10,2) not null,
  quantity integer not null check (quantity > 0),
  total_price decimal(10,2) not null,
  product_details jsonb, -- snapshot of product details
  created_at timestamp with time zone default now()
);

-- Create cart table for persistent cart
create table public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(customer_id, product_id)
);

-- Create reviews table
create table public.product_reviews (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id),
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text,
  is_verified_purchase boolean default false,
  is_approved boolean default false,
  created_at timestamp with time zone default now(),
  unique(customer_id, product_id, order_id)
);

-- Create notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null, -- order_update, promotion, system, etc.
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Create delivery_zones table
create table public.delivery_zones (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  postal_codes text[] not null,
  delivery_fee decimal(10,2) not null,
  min_order_amount decimal(10,2) default 0,
  estimated_delivery_time interval default '2 hours',
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Create admin_settings table
create table public.admin_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamp with time zone default now()
);

-- Create audit_logs table for tracking admin actions
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- Create inventory_movements table
create table public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  reference_id uuid, -- order_id or other reference
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Insert default categories
insert into public.categories (name, slug, description, sort_order) values
('Fresh Produce', 'fresh-produce', 'Fresh fruits and vegetables', 1),
('Dairy & Eggs', 'dairy-eggs', 'Milk, cheese, eggs and dairy products', 2),
('Meat & Seafood', 'meat-seafood', 'Fresh meat, poultry and seafood', 3),
('Bakery', 'bakery', 'Fresh bread, pastries and baked goods', 4),
('Pantry Essentials', 'pantry-essentials', 'Rice, pasta, canned goods and dry goods', 5),
('Beverages', 'beverages', 'Soft drinks, juices, water and beverages', 6),
('Snacks & Candy', 'snacks-candy', 'Chips, chocolate, candy and snacks', 7),
('Household', 'household', 'Cleaning supplies and household items', 8),
('Personal Care', 'personal-care', 'Health and beauty products', 9),
('Baby & Kids', 'baby-kids', 'Baby food, diapers and children products', 10);

-- Insert default delivery zones
insert into public.delivery_zones (name, postal_codes, delivery_fee, min_order_amount) values
('City Center', array['10001', '10002', '10003', '10004'], 5.99, 25.00),
('Suburbs', array['10010', '10011', '10012', '10013'], 7.99, 30.00),
('Extended Area', array['10020', '10021', '10022'], 12.99, 50.00);

-- Insert default admin settings
insert into public.admin_settings (key, value, description) values
('store_name', '"Spar Express Delivery"', 'Store name displayed to customers'),
('store_email', '"store@sparexpress.com"', 'Store contact email'),
('store_phone', '"+1-234-567-8900"', 'Store contact phone'),
('tax_rate', '0.08', 'Tax rate as decimal (8% = 0.08)'),
('currency', '"USD"', 'Store currency'),
('order_number_prefix', '"SPR"', 'Prefix for order numbers'),
('min_order_amount', '15.00', 'Minimum order amount for delivery'),
('store_hours', '{"monday": "8:00-22:00", "tuesday": "8:00-22:00", "wednesday": "8:00-22:00", "thursday": "8:00-22:00", "friday": "8:00-23:00", "saturday": "8:00-23:00", "sunday": "9:00-21:00"}', 'Store operating hours');

-- Create indexes for better performance
create index idx_products_category on public.products(category_id);
create index idx_products_active on public.products(is_active);
create index idx_products_featured on public.products(is_featured);
create index idx_products_stock on public.products(stock_quantity);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_order_items_order on public.order_items(order_id);
create index idx_cart_customer on public.cart_items(customer_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id, is_read);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger handle_updated_at before update on public.categories for each row execute function public.handle_updated_at();
create trigger handle_updated_at before update on public.products for each row execute function public.handle_updated_at();
create trigger handle_updated_at before update on public.orders for each row execute function public.handle_updated_at();
create trigger handle_updated_at before update on public.cart_items for each row execute function public.handle_updated_at();

-- Create function to generate order numbers
create or replace function public.generate_order_number()
returns text as $$
declare
  prefix text;
  counter integer;
  order_number text;
begin
  select value::text into prefix from public.admin_settings where key = 'order_number_prefix';
  prefix := coalesce(trim(both '"' from prefix), 'SPR');

  select count(*) + 1 into counter from public.orders where date_trunc('day', created_at) = date_trunc('day', now());

  order_number := prefix || to_char(now(), 'YYYYMMDD') || lpad(counter::text, 3, '0');

  return order_number;
end;
$$ language plpgsql;

-- Create function to update product stock
create or replace function public.update_product_stock()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    -- Decrease stock when order item is created
    update public.products
    set stock_quantity = stock_quantity - new.quantity
    where id = new.product_id;

    -- Log inventory movement
    insert into public.inventory_movements (
      product_id, movement_type, quantity, previous_stock, new_stock,
      reason, reference_id
    ) values (
      new.product_id, 'out', new.quantity,
      (select stock_quantity + new.quantity from public.products where id = new.product_id),
      (select stock_quantity from public.products where id = new.product_id),
      'Order item created', new.order_id
    );
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

-- Create trigger for stock updates
create trigger update_product_stock_trigger
  after insert on public.order_items
  for each row execute function public.update_product_stock();
