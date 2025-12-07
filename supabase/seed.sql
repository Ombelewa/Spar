-- Insert sample products for testing
insert into public.products (name, description, price, compare_price, sku, category_id, brand, unit, weight, stock_quantity, min_stock_level, is_active, is_featured, images, tags) values
-- Fresh Produce
('Organic Bananas', 'Fresh organic bananas, perfect for breakfast or snacking', 2.99, 3.49, 'BANANA001', (select id from public.categories where slug = 'fresh-produce'), 'Organic Valley', 'bunch', 1.2, 50, 10, true, true, array['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e'], array['organic', 'fresh', 'healthy']),
('Red Apples', 'Crisp and sweet red apples, great for snacking', 4.99, null, 'APPLE001', (select id from public.categories where slug = 'fresh-produce'), 'Local Farm', 'bag (2lbs)', 2.0, 30, 5, true, false, array['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6'], array['fresh', 'local', 'crisp']),
('Fresh Spinach', 'Baby spinach leaves, perfect for salads', 3.49, null, 'SPINACH001', (select id from public.categories where slug = 'fresh-produce'), 'Green Fields', 'bag (5oz)', 0.3, 25, 8, true, false, array['https://images.unsplash.com/photo-1576045057995-568f588f82fb'], array['leafy', 'healthy', 'salad']),
('Avocados', 'Ripe avocados, ready to eat', 1.99, 2.49, 'AVOCADO001', (select id from public.categories where slug = 'fresh-produce'), 'Tropical Farms', 'each', 0.2, 40, 10, true, true, array['https://images.unsplash.com/photo-1549476464-37392f717541'], array['ripe', 'healthy', 'creamy']),

-- Dairy & Eggs
('Whole Milk', 'Fresh whole milk, locally sourced', 3.89, null, 'MILK001', (select id from public.categories where slug = 'dairy-eggs'), 'Dairy Fresh', 'gallon', 3.8, 20, 5, true, false, array['https://images.unsplash.com/photo-1563636619-e9143da7973b'], array['fresh', 'local', 'whole']),
('Organic Eggs', 'Free-range organic eggs, dozen pack', 5.99, 6.99, 'EGGS001', (select id from public.categories where slug = 'dairy-eggs'), 'Happy Hens', 'dozen', 1.5, 35, 8, true, true, array['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f'], array['organic', 'free-range', 'protein']),
('Sharp Cheddar Cheese', 'Aged sharp cheddar cheese block', 6.49, null, 'CHEESE001', (select id from public.categories where slug = 'dairy-eggs'), 'Artisan Dairy', '8oz block', 0.5, 15, 5, true, false, array['https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d'], array['aged', 'sharp', 'artisan']),
('Greek Yogurt', 'Creamy Greek yogurt, vanilla flavor', 4.99, null, 'YOGURT001', (select id from public.categories where slug = 'dairy-eggs'), 'Mediterranean', '32oz', 2.0, 25, 6, true, false, array['https://images.unsplash.com/photo-1571212515416-0da2ac4be8ce'], array['creamy', 'protein', 'vanilla']),

-- Meat & Seafood
('Ground Beef', 'Fresh lean ground beef, 80/20', 8.99, null, 'BEEF001', (select id from public.categories where slug = 'meat-seafood'), 'Prime Cuts', '1lb package', 1.0, 12, 3, true, false, array['https://images.unsplash.com/photo-1588347818023-0d7370d58a21'], array['fresh', 'lean', 'beef']),
('Chicken Breast', 'Boneless skinless chicken breast', 12.99, null, 'CHICKEN001', (select id from public.categories where slug = 'meat-seafood'), 'Farm Fresh', '2lb package', 2.0, 18, 4, true, true, array['https://images.unsplash.com/photo-1604503468506-a8da13d82791'], array['boneless', 'skinless', 'protein']),
('Atlantic Salmon', 'Fresh Atlantic salmon fillet', 15.99, null, 'SALMON001', (select id from public.categories where slug = 'meat-seafood'), 'Ocean Fresh', '1lb fillet', 1.0, 8, 2, true, true, array['https://images.unsplash.com/photo-1559847844-5315695dadae'], array['fresh', 'omega-3', 'fillet']),

-- Bakery
('Whole Wheat Bread', 'Fresh baked whole wheat bread loaf', 3.49, null, 'BREAD001', (select id from public.categories where slug = 'bakery'), 'Artisan Bakery', 'loaf', 1.5, 20, 5, true, false, array['https://images.unsplash.com/photo-1509440159596-0249088772ff'], array['whole-wheat', 'fresh', 'artisan']),
('Chocolate Croissants', 'Buttery croissants with chocolate filling', 7.99, null, 'CROISSANT001', (select id from public.categories where slug = 'bakery'), 'French Bakery', '4-pack', 0.8, 15, 3, true, true, array['https://images.unsplash.com/photo-1555507036-ab794f0aa5c8'], array['buttery', 'chocolate', 'french']),

-- Pantry Essentials
('Jasmine Rice', 'Premium jasmine rice, 5lb bag', 8.99, null, 'RICE001', (select id from public.categories where slug = 'pantry-essentials'), 'Golden Grain', '5lb bag', 5.0, 25, 5, true, false, array['https://images.unsplash.com/photo-1586201375761-83865001e31c'], array['premium', 'jasmine', 'grain']),
('Olive Oil', 'Extra virgin olive oil, cold pressed', 12.99, 14.99, 'OIL001', (select id from public.categories where slug = 'pantry-essentials'), 'Mediterranean Gold', '500ml bottle', 0.5, 30, 8, true, true, array['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5'], array['extra-virgin', 'cold-pressed', 'premium']),
('Pasta - Spaghetti', 'Italian durum wheat spaghetti', 2.49, null, 'PASTA001', (select id from public.categories where slug = 'pantry-essentials'), 'Bella Italia', '1lb box', 1.0, 40, 10, true, false, array['https://images.unsplash.com/photo-1551183053-bf91a1d81141'], array['italian', 'durum', 'spaghetti']),

-- Beverages
('Orange Juice', 'Fresh squeezed orange juice, no pulp', 4.99, null, 'JUICE001', (select id from public.categories where slug = 'beverages'), 'Sunshine', '64oz carton', 2.0, 20, 5, true, false, array['https://images.unsplash.com/photo-1621506289937-a8e4df240d0b'], array['fresh', 'no-pulp', 'vitamin-c']),
('Sparkling Water', 'Natural sparkling water, lime flavor', 3.99, null, 'WATER001', (select id from public.categories where slug = 'beverages'), 'Crystal Springs', '12-pack cans', 4.0, 35, 8, true, false, array['https://images.unsplash.com/photo-1544145945-f90425340c7e'], array['sparkling', 'lime', 'natural']),
('Coffee Beans', 'Premium arabica coffee beans, medium roast', 14.99, 16.99, 'COFFEE001', (select id from public.categories where slug = 'beverages'), 'Mountain Roasters', '1lb bag', 1.0, 18, 4, true, true, array['https://images.unsplash.com/photo-1559056199-641a0ac8b55e'], array['arabica', 'medium-roast', 'premium']),

-- Snacks & Candy
('Mixed Nuts', 'Roasted mixed nuts, lightly salted', 8.99, null, 'NUTS001', (select id from public.categories where slug = 'snacks-candy'), 'Nutty Delights', '12oz container', 0.75, 25, 6, true, false, array['https://images.unsplash.com/photo-1539049525737-b04ac5bdbd43'], array['roasted', 'mixed', 'salted']),
('Dark Chocolate', 'Premium dark chocolate bar, 70% cacao', 4.49, null, 'CHOC001', (select id from public.categories where slug = 'snacks-candy'), 'Cacao Premium', '3.5oz bar', 0.2, 30, 8, true, true, array['https://images.unsplash.com/photo-1511381939415-e44015466834'], array['dark', '70-percent', 'premium']),

-- Household
('Paper Towels', 'Ultra-absorbent paper towels, 6-pack', 12.99, null, 'PAPER001', (select id from public.categories where slug = 'household'), 'CleanUp', '6-pack rolls', 2.5, 20, 5, true, false, array['https://images.unsplash.com/photo-1583947215259-38e31be8751f'], array['absorbent', 'strong', 'household']),
('Dish Soap', 'Concentrated dish soap, lemon scent', 3.99, null, 'SOAP001', (select id from public.categories where slug = 'household'), 'Sparkling Clean', '24oz bottle', 0.75, 25, 6, true, false, array['https://images.unsplash.com/photo-1563453392212-326f5e854473'], array['concentrated', 'lemon', 'effective']),

-- Personal Care
('Shampoo', 'Moisturizing shampoo for all hair types', 7.99, null, 'SHAM001', (select id from public.categories where slug = 'personal-care'), 'Hair Care Pro', '16oz bottle', 0.5, 20, 5, true, false, array['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'], array['moisturizing', 'all-hair', 'gentle']),
('Toothpaste', 'Fluoride toothpaste with whitening', 4.49, null, 'TOOTH001', (select id from public.categories where slug = 'personal-care'), 'Bright Smile', '6oz tube', 0.2, 30, 8, true, false, array['https://images.unsplash.com/photo-1607613009820-a29f7bb81c04'], array['fluoride', 'whitening', 'fresh']),

-- Baby & Kids
('Baby Formula', 'Infant formula, stage 1, iron fortified', 24.99, null, 'FORM001', (select id from public.categories where slug = 'baby-kids'), 'Little Ones', '32oz can', 2.0, 15, 3, true, false, array['https://images.unsplash.com/photo-1587049016037-b48cf46b102a'], array['stage-1', 'iron', 'nutrition']),
('Diapers', 'Ultra-soft diapers, size 3, 84 count', 19.99, null, 'DIAPER001', (select id from public.categories where slug = 'baby-kids'), 'Comfort Baby', '84 count', 3.0, 12, 3, true, false, array['https://images.unsplash.com/photo-1564594985645-4427056e22e2'], array['ultra-soft', 'size-3', 'absorbent']);

-- Insert sample coupons
insert into public.coupons (code, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, usage_limit, valid_from, valid_until, created_by) values
('WELCOME10', 'Welcome offer: 10% off your first order', 'percentage', 10.00, 25.00, 10.00, 100, now(), now() + interval '30 days', null),
('SAVE5', 'Save $5 on orders over $50', 'fixed_amount', 5.00, 50.00, null, 500, now(), now() + interval '60 days', null),
('FRESH15', 'Fresh produce special: 15% off', 'percentage', 15.00, 30.00, 15.00, 200, now(), now() + interval '14 days', null);

-- Create a super admin user (this will be handled by the auth trigger)
-- You'll need to sign up through the UI first, then update the role manually or through the admin panel

-- Insert some sample notifications (these would normally be created by the system)
-- insert into public.notifications (user_id, title, message, type) values
-- ((select id from public.profiles limit 1), 'Welcome to Spar Express!', 'Thank you for joining us. Enjoy fast delivery and fresh products.', 'system');

-- Update admin settings with more realistic values
update public.admin_settings set value = '"Spar Express Delivery"' where key = 'store_name';
update public.admin_settings set value = '"support@sparexpress.com"' where key = 'store_email';
update public.admin_settings set value = '"+1 (555) 123-SPAR"' where key = 'store_phone';
update public.admin_settings set value = '0.0875' where key = 'tax_rate'; -- 8.75%
update public.admin_settings set value = '"USD"' where key = 'currency';
update public.admin_settings set value = '"SPAR"' where key = 'order_number_prefix';
update public.admin_settings set value = '25.00' where key = 'min_order_amount';

-- Insert sample inventory movements for some products (to test the system)
insert into public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason, notes) values
((select id from public.products where sku = 'BANANA001'), 'in', 100, 0, 50, 'Initial stock', 'Opening inventory - received from supplier'),
((select id from public.products where sku = 'APPLE001'), 'in', 50, 0, 30, 'Initial stock', 'Opening inventory - local farm delivery'),
((select id from public.products where sku = 'MILK001'), 'in', 40, 0, 20, 'Initial stock', 'Fresh delivery from Dairy Fresh'),
((select id from public.products where sku = 'EGGS001'), 'in', 60, 0, 35, 'Initial stock', 'Weekly delivery from Happy Hens'),
((select id from public.products where sku = 'COFFEE001'), 'in', 25, 0, 18, 'Initial stock', 'Premium coffee stock from Mountain Roasters');

-- Add some sample product reviews (these would normally be created by customers)
-- Note: These will fail initially because there are no customers or completed orders yet
-- They're included here as examples of the data structure

-- Create a function to setup initial admin user
create or replace function public.setup_initial_admin(admin_email text)
returns void as $$
begin
  update public.profiles
  set role = 'super_admin'
  where email = admin_email;

  if not found then
    raise exception 'User with email % not found. Please sign up first.', admin_email;
  end if;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, new_values)
  select id, 'UPDATE', 'profiles', id, jsonb_build_object('role', 'super_admin')
  from public.profiles where email = admin_email;
end;
$$ language plpgsql;

-- Example usage (uncomment and replace with actual admin email after signup):
-- select public.setup_initial_admin('admin@sparexpress.com');
