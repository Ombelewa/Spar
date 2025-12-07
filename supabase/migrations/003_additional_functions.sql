-- Additional helper functions for the application

-- Function to increment coupon usage count
create or replace function public.increment_coupon_usage(coupon_code text)
returns void as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where code = coupon_code and is_active = true;
end;
$$ language plpgsql security definer;

-- Function to get product stock status
create or replace function public.get_stock_status(product_id uuid)
returns text as $$
declare
  product_record public.products%ROWTYPE;
begin
  select * into product_record from public.products where id = product_id;

  if not found then
    return 'not_found';
  end if;

  if product_record.stock_quantity <= 0 then
    return 'out_of_stock';
  elsif product_record.stock_quantity <= product_record.min_stock_level then
    return 'low_stock';
  else
    return 'in_stock';
  end if;
end;
$$ language plpgsql security definer;

-- Function to calculate order totals
create or replace function public.calculate_order_totals(
  p_subtotal decimal,
  p_coupon_code text default null,
  p_delivery_zone_id uuid default null,
  p_delivery_method text default 'delivery'
)
returns json as $$
declare
  v_discount_amount decimal := 0;
  v_delivery_fee decimal := 0;
  v_tax_amount decimal := 0;
  v_total_amount decimal := 0;
  v_tax_rate decimal := 0;
  v_coupon public.coupons%ROWTYPE;
  v_delivery_zone public.delivery_zones%ROWTYPE;
  v_result json;
begin
  -- Get tax rate from settings
  select (value::decimal) into v_tax_rate
  from public.admin_settings
  where key = 'tax_rate'
  limit 1;

  if v_tax_rate is null then
    v_tax_rate := 0;
  end if;

  -- Apply coupon if provided
  if p_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where code = p_coupon_code
      and is_active = true
      and valid_from <= now()
      and (valid_until is null or valid_until >= now())
      and p_subtotal >= minimum_order_amount
      and (usage_limit is null or used_count < usage_limit);

    if found then
      if v_coupon.discount_type = 'percentage' then
        v_discount_amount := p_subtotal * v_coupon.discount_value / 100;
      else
        v_discount_amount := v_coupon.discount_value;
      end if;

      -- Apply maximum discount limit if set
      if v_coupon.maximum_discount_amount is not null and v_discount_amount > v_coupon.maximum_discount_amount then
        v_discount_amount := v_coupon.maximum_discount_amount;
      end if;
    end if;
  end if;

  -- Calculate delivery fee
  if p_delivery_method = 'delivery' and p_delivery_zone_id is not null then
    select * into v_delivery_zone
    from public.delivery_zones
    where id = p_delivery_zone_id and is_active = true;

    if found then
      v_delivery_fee := v_delivery_zone.delivery_fee;
      -- Waive delivery fee if order meets minimum
      if p_subtotal >= v_delivery_zone.min_order_amount then
        v_delivery_fee := 0;
      end if;
    end if;
  end if;

  -- Calculate tax (on subtotal minus discount)
  v_tax_amount := (p_subtotal - v_discount_amount) * v_tax_rate;

  -- Calculate total
  v_total_amount := p_subtotal - v_discount_amount + v_delivery_fee + v_tax_amount;

  -- Build result
  v_result := json_build_object(
    'subtotal', p_subtotal,
    'discount_amount', v_discount_amount,
    'delivery_fee', v_delivery_fee,
    'tax_amount', v_tax_amount,
    'total_amount', v_total_amount,
    'coupon_valid', v_coupon.id is not null,
    'coupon_id', v_coupon.id
  );

  return v_result;
end;
$$ language plpgsql security definer;

-- Function to check delivery availability
create or replace function public.check_delivery_availability(postal_code text)
returns json as $$
declare
  v_zone public.delivery_zones%ROWTYPE;
  v_result json;
begin
  select * into v_zone
  from public.delivery_zones
  where postal_codes @> array[postal_code]
    and is_active = true
  limit 1;

  if found then
    v_result := json_build_object(
      'available', true,
      'zone_id', v_zone.id,
      'zone_name', v_zone.name,
      'delivery_fee', v_zone.delivery_fee,
      'min_order_amount', v_zone.min_order_amount,
      'estimated_delivery_time', v_zone.estimated_delivery_time
    );
  else
    v_result := json_build_object(
      'available', false,
      'message', 'Delivery not available in this area'
    );
  end if;

  return v_result;
end;
$$ language plpgsql security definer;

-- Function to get dashboard statistics
create or replace function public.get_dashboard_stats()
returns json as $$
declare
  v_total_orders integer;
  v_pending_orders integer;
  v_total_revenue decimal;
  v_total_customers integer;
  v_low_stock_products integer;
  v_result json;
begin
  -- Get order counts
  select count(*) into v_total_orders from public.orders;
  select count(*) into v_pending_orders from public.orders where status = 'pending';

  -- Get revenue (only from delivered orders)
  select coalesce(sum(total_amount), 0) into v_total_revenue
  from public.orders
  where status = 'delivered';

  -- Get customer count
  select count(*) into v_total_customers
  from public.profiles
  where role = 'customer';

  -- Get low stock products count
  select count(*) into v_low_stock_products
  from public.products
  where stock_quantity <= min_stock_level
    and is_active = true;

  v_result := json_build_object(
    'total_orders', v_total_orders,
    'pending_orders', v_pending_orders,
    'total_revenue', v_total_revenue,
    'total_customers', v_total_customers,
    'low_stock_products', v_low_stock_products
  );

  return v_result;
end;
$$ language plpgsql security definer;

-- Function to search products with full-text search
create or replace function public.search_products(
  search_query text,
  category_filter uuid default null,
  price_min decimal default null,
  price_max decimal default null,
  in_stock_only boolean default true,
  limit_count integer default 50
)
returns setof public.products as $$
begin
  return query
  select p.*
  from public.products p
  left join public.categories c on p.category_id = c.id
  where p.is_active = true
    and (not in_stock_only or p.stock_quantity > 0)
    and (category_filter is null or p.category_id = category_filter)
    and (price_min is null or p.price >= price_min)
    and (price_max is null or p.price <= price_max)
    and (
      search_query is null or
      p.name ilike '%' || search_query || '%' or
      p.description ilike '%' || search_query || '%' or
      p.brand ilike '%' || search_query || '%' or
      search_query = any(p.tags)
    )
  order by
    case when p.name ilike search_query || '%' then 1 else 2 end,
    p.is_featured desc,
    p.name
  limit limit_count;
end;
$$ language plpgsql security definer;

-- Function to get sales data for analytics
create or replace function public.get_sales_analytics(
  period_days integer default 30
)
returns table(
  date_group date,
  total_orders bigint,
  total_revenue decimal,
  avg_order_value decimal
) as $$
begin
  return query
  select
    date_trunc('day', o.created_at)::date as date_group,
    count(*) as total_orders,
    sum(o.total_amount) as total_revenue,
    avg(o.total_amount) as avg_order_value
  from public.orders o
  where o.created_at >= (current_date - interval '1 day' * period_days)
    and o.status = 'delivered'
  group by date_trunc('day', o.created_at)
  order by date_group;
end;
$$ language plpgsql security definer;

-- Function to get top selling products
create or replace function public.get_top_products(
  period_days integer default 30,
  limit_count integer default 10
)
returns table(
  product_id uuid,
  product_name text,
  total_quantity bigint,
  total_revenue decimal,
  order_count bigint
) as $$
begin
  return query
  select
    oi.product_id,
    oi.product_name,
    sum(oi.quantity) as total_quantity,
    sum(oi.total_price) as total_revenue,
    count(distinct oi.order_id) as order_count
  from public.order_items oi
  join public.orders o on oi.order_id = o.id
  where o.created_at >= (current_date - interval '1 day' * period_days)
    and o.status = 'delivered'
  group by oi.product_id, oi.product_name
  order by total_revenue desc
  limit limit_count;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.increment_coupon_usage(text) to authenticated;
grant execute on function public.get_stock_status(uuid) to authenticated;
grant execute on function public.calculate_order_totals(decimal, text, uuid, text) to authenticated;
grant execute on function public.check_delivery_availability(text) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
grant execute on function public.search_products(text, uuid, decimal, decimal, boolean, integer) to authenticated;
grant execute on function public.get_sales_analytics(integer) to authenticated;
grant execute on function public.get_top_products(integer, integer) to authenticated;
