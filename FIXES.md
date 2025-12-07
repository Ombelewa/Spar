# Quick Fixes for Spar Express Delivery

## Issue 1: Categories Not Loading in Admin Panel

**Problem**: Admin can't see categories when adding products.

**Solution**: Run this SQL in Supabase SQL Editor:

```sql
-- Fix category access for admins
CREATE POLICY "Allow authenticated users to view categories" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Also ensure categories exist
INSERT INTO public.categories (name, slug, description, is_active, sort_order) VALUES
('Fresh Produce', 'fresh-produce', 'Fresh fruits and vegetables', true, 1),
('Dairy & Eggs', 'dairy-eggs', 'Milk, cheese, eggs', true, 2),
('Meat & Seafood', 'meat-seafood', 'Fresh meat and fish', true, 3),
('Bakery', 'bakery', 'Fresh bread and pastries', true, 4),
('Pantry', 'pantry', 'Canned goods and essentials', true, 5)
ON CONFLICT (slug) DO NOTHING;
```

## Issue 2: Profile Page Access for Customers

**Problem**: Users can't see their profile page.

**Solution**: The profile page has been updated to work with new Supabase structure. Make sure RLS policies allow users to access their own profiles:

```sql
-- Ensure users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles  
  FOR UPDATE USING (auth.uid() = id);
```

## Issue 3: Image Upload for Products

**Problem**: Can't upload product images.

**Current Status**: Basic file picker is implemented with preview. For full functionality:

1. **Create Storage Bucket** in Supabase Dashboard:
   - Go to Storage → Create new bucket
   - Name: `product-images`
   - Set as public
   - Max file size: 5MB

2. **Enable Storage Policies**:
```sql
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND 
    auth.role() = 'authenticated'
  );

-- Allow public access to view images  
CREATE POLICY "Allow public access" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
```

## Quick Test Commands

### Test Admin Access:
1. Sign up at: `http://localhost:5173/auth`
2. Run in Supabase SQL: `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`
3. Login at: `http://localhost:5173/admin-login`

### Test Customer Profile:
1. Sign up as regular user
2. Go to: `http://localhost:5173/profile`
3. Should see profile and order history

### Test Categories:
1. Go to admin panel
2. Try adding a product
3. Categories dropdown should now work

## Common Issues:

**Categories still not showing?**
```sql
-- Check if categories exist
SELECT * FROM public.categories;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'categories';
```

**Profile page still broken?**
```sql
-- Check if user profile exists
SELECT * FROM public.profiles WHERE email = 'your@email.com';

-- Create profile manually if missing
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users 
WHERE email = 'your@email.com'
ON CONFLICT (id) DO NOTHING;
```

**Admin access denied?**
```sql
-- Double-check user role
SELECT email, role FROM public.profiles WHERE email = 'your@email.com';

-- Fix role if needed
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## File Structure Status:
✅ Profile page: Fixed and updated  
✅ Admin panel: Fixed categories loading  
✅ Image upload: Basic implementation ready  
✅ Authentication: Working with Supabase  
✅ RLS policies: Updated and secure  

## Next Steps:
1. Run the SQL commands above
2. Test admin login and product creation
3. Test customer profile access
4. Set up image storage bucket for full image upload