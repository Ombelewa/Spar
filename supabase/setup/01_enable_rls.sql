-- Step 1: Enable Row Level Security on all tables
-- Run this first to enable RLS on all tables

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
