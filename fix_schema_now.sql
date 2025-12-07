-- Emergency fix for immediate schema issues
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mldubcsbumlrfrmqnhah/sql

-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Update existing profiles to populate first_name and last_name from full_name
UPDATE public.profiles
SET
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN full_name) > 0
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- 3. Create addresses table with correct schema
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('home', 'work', 'other')) DEFAULT 'home',
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'South Africa',
  is_default BOOLEAN DEFAULT false,
  delivery_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fix orders table if needed - add missing columns
DO $$
BEGIN
  -- Check if orders table exists and add missing columns if needed
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    -- Add order_number if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
      ALTER TABLE public.orders ADD COLUMN order_number TEXT;
      -- Generate order numbers for existing orders
      UPDATE public.orders SET order_number = 'ORD-' || extract(epoch from created_at)::bigint WHERE order_number IS NULL;
      -- Make it unique and not null
      ALTER TABLE public.orders ALTER COLUMN order_number SET NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
    END IF;

    -- Ensure correct column names exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
      ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
      ALTER TABLE public.orders ADD COLUMN customer_email TEXT;
      ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
      ALTER TABLE public.orders ADD COLUMN total_amount DECIMAL(10,2);
      ALTER TABLE public.orders ADD COLUMN subtotal DECIMAL(10,2);
      ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE public.orders ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE public.orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE public.orders ADD COLUMN delivery_address JSONB;
      ALTER TABLE public.orders ADD COLUMN payment_details JSONB;
    END IF;
  END IF;
END $$;

-- 5. Fix order_items table columns
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
    -- Add missing columns
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_name') THEN
      ALTER TABLE public.order_items ADD COLUMN product_name TEXT;
      ALTER TABLE public.order_items ADD COLUMN product_price DECIMAL(10,2);
      ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2);
    END IF;
  END IF;
END $$;

-- 6. Enable RLS on addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for addresses
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses" ON public.addresses
  FOR ALL USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses" ON public.addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 8. Create function to ensure single default address
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses
    SET is_default = FALSE
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for single default address
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON public.addresses;
CREATE TRIGGER trigger_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();

-- 10. Add updated_at trigger for addresses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_addresses_updated_at ON public.addresses;
CREATE TRIGGER trigger_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON public.addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON public.addresses(customer_id, is_default) WHERE is_default = TRUE;

-- 12. Grant necessary permissions
GRANT ALL ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;

-- 13. Fix RLS policies for order_items (critical for checkout)
-- Remove existing restrictive policies
DROP POLICY IF EXISTS "Users can create order items for own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- Create new, working RLS policies for order_items
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 14. Fix RLS policies for orders table as well
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Verification queries - uncomment to run and check results
-- SELECT 'Profiles with first_name' as check_type, count(*) as count FROM public.profiles WHERE first_name IS NOT NULL;
-- SELECT 'Addresses table exists' as check_type, count(*) as count FROM information_schema.tables WHERE table_name = 'addresses';
-- SELECT 'Orders table columns' as check_type, column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY column_name;
-- SELECT 'RLS policies for order_items' as check_type, count(*) as count FROM pg_policies WHERE tablename = 'order_items';

-- Success message
SELECT 'Schema fix completed successfully! All tables, columns, and RLS policies should now work for checkout.' as status;
