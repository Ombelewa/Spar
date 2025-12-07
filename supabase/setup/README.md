# Step-by-Step Supabase Setup Guide

This guide helps you set up your Supabase database without encountering RLS policy errors.

## Problem
You encountered this error: `ERROR: 42P01: missing FROM-clause entry for table "old"`

This happens when PostgreSQL can't resolve the `OLD` and `NEW` references in trigger functions or policies.

## Solution: Run Scripts Step by Step

Instead of running all migrations at once, follow these steps in order:

### Prerequisites
1. Make sure you've already run the initial schema migration (`001_initial_schema.sql`)
2. Have your Supabase project ready and linked

### Step 1: Enable RLS
```sql
-- Copy and paste this in Supabase SQL Editor:
```

Run the content of `01_enable_rls.sql`:
- This enables Row Level Security on all tables
- Must be done first before creating policies

### Step 2: Create Helper Functions
```sql
-- Copy and paste this in Supabase SQL Editor:
```

Run the content of `02_helper_functions.sql`:
- Creates `is_admin()` and `is_super_admin()` functions
- Creates user profile creation trigger
- These functions are used by the policies

### Step 3: Basic Policies
```sql
-- Copy and paste this in Supabase SQL Editor:
```

Run the content of `03_basic_policies.sql`:
- Creates policies for profiles, categories, products
- Basic admin and public access rules

### Step 4: Customer Policies
```sql
-- Copy and paste this in Supabase SQL Editor:
```

Run the content of `04_customer_policies.sql`:
- Creates policies for orders, cart items, coupons
- Customer-specific access rules

### Step 5: Review and Audit Policies
```sql
-- Copy and paste this in Supabase SQL Editor:
```

Run the content of `05_review_audit_policies.sql`:
- Creates policies for reviews, audit logs, inventory
- Audit logging triggers (fixed to avoid OLD/NEW errors)

## Alternative: Single Fixed Script

If you prefer to run everything at once, use the fixed script:
- `002_rls_policies_fixed.sql`

This version has the problematic `OLD` references fixed and should work without errors.

## Verification

After running all scripts, verify your setup:

```sql
-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check if policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test the helper functions
SELECT public.is_admin('00000000-0000-0000-0000-000000000000'::uuid);
SELECT public.is_super_admin('00000000-0000-0000-0000-000000000000'::uuid);
```

## Create Your First Admin User

1. Sign up through your app at `/auth`
2. Verify your email
3. Run this in Supabase SQL Editor (replace with your email):

```sql
-- Replace with your actual admin email
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'your-admin@example.com';
```

Or use the helper function:

```sql
-- Replace with your actual admin email
SELECT public.setup_initial_admin('your-admin@example.com');
```

## Troubleshooting

### If you still get OLD/NEW errors:
1. Check which trigger is causing the issue
2. Drop the problematic trigger: `DROP TRIGGER trigger_name ON table_name;`
3. Recreate it using the fixed version from step 5

### If policies aren't working:
1. Make sure RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check if the helper functions exist: `\df public.is_admin`
3. Verify user roles in the profiles table

### If functions don't exist:
```sql
-- Recreate helper functions manually
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Next Steps

After successfully setting up RLS:

1. Run the additional functions: `003_additional_functions.sql`
2. Seed your database with sample data
3. Test admin login at `/admin-login`
4. Configure your products and categories
5. Set up payment processing

## Support

If you encounter any issues:
1. Check the Supabase dashboard for error details
2. Verify all tables exist before applying policies
3. Make sure you're running scripts in the correct order
4. Check the browser console and network tab for frontend errors

Remember: RLS policies protect your data, so it's worth taking time to set them up correctly!