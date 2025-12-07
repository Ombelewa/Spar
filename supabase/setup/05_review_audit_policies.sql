-- Step 5: Create review and audit RLS policies
-- Run this after creating customer policies

-- PRODUCT REVIEWS TABLE POLICIES
create policy "Everyone can view approved reviews" on public.product_reviews
  for select using (is_approved = true);

create policy "Users can view own reviews" on public.product_reviews
  for select using (customer_id = auth.uid());

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

create policy "Users can update own reviews" on public.product_reviews
  for update using (customer_id = auth.uid());

create policy "Admins can view all reviews" on public.product_reviews
  for select using (public.is_admin(auth.uid()));

create policy "Admins can manage all reviews" on public.product_reviews
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- AUDIT LOGS TABLE POLICIES
create policy "Admins can view audit logs" on public.audit_logs
  for select using (public.is_admin(auth.uid()));

create policy "System can create audit logs" on public.audit_logs
  for insert with check (true);

-- INVENTORY MOVEMENTS TABLE POLICIES
create policy "Admins can view inventory movements" on public.inventory_movements
  for select using (public.is_admin(auth.uid()));

create policy "Admins can create inventory movements" on public.inventory_movements
  for insert with check (public.is_admin(auth.uid()));

create policy "System can create inventory movements" on public.inventory_movements
  for insert with check (created_by is null or public.is_admin(auth.uid()));

-- Create audit logging function (simplified to avoid OLD/NEW issues)
create or replace function public.log_admin_action()
returns trigger as $$
declare
  current_user_id uuid;
  resource_id_val uuid;
begin
  current_user_id := auth.uid();

  -- Only log if user is admin
  if current_user_id is not null and public.is_admin(current_user_id) then
    -- Get resource ID safely
    if TG_OP = 'DELETE' then
      resource_id_val := (to_jsonb(OLD)->>'id')::uuid;
    else
      resource_id_val := (to_jsonb(NEW)->>'id')::uuid;
    end if;

    -- Insert audit log
    insert into public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values
    ) values (
      current_user_id,
      TG_OP,
      TG_TABLE_NAME,
      resource_id_val,
      case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
      case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
    );
  end if;

  -- Always return the row to continue the operation
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;

exception
  when others then
    -- Don't fail the main operation if audit logging fails
    if TG_OP = 'DELETE' then
      return OLD;
    else
      return NEW;
    end if;
end;
$$ language plpgsql security definer;

-- Create audit triggers for important tables
drop trigger if exists audit_products_trigger on public.products;
create trigger audit_products_trigger
  after insert or update or delete on public.products
  for each row execute function public.log_admin_action();

drop trigger if exists audit_orders_trigger on public.orders;
create trigger audit_orders_trigger
  after update on public.orders
  for each row execute function public.log_admin_action();

drop trigger if exists audit_categories_trigger on public.categories;
create trigger audit_categories_trigger
  after insert or update or delete on public.categories
  for each row execute function public.log_admin_action();
