# Getting Started - Spar Express Delivery

## Quick Start (5 Minutes)

### 1. Install & Run
```bash
npm install
npm run dev
```

Visit: `http://localhost:5173`

### 2. Create Admin Account

**Step 1**: Sign up at `http://localhost:5173/auth`
- Use email: `admin@test.com`
- Password: `password123`

**Step 2**: Make yourself admin
- Go to [Supabase Dashboard](https://app.supabase.com)
- Click "SQL Editor"
- Run this:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com';
```

**Step 3**: Login to admin
- Go to: `http://localhost:5173/admin-login`
- Use same email/password from Step 1
- ✅ You're now an admin!

## What You Can Do

### 🛒 **As Customer** (No login needed)
- Browse products: `http://localhost:5173/products`
- Add to cart
- Checkout & pay

### 👨‍💼 **As Admin** (After steps above)
- Admin dashboard: `http://localhost:5173/admin`
- Manage products
- Process orders
- View sales data

## Need Help?

### Database Setup Issues?
1. Make sure Supabase is connected
2. Check your `.env` file has correct keys
3. Run database migrations if needed

### Can't Login as Admin?
1. Make sure you ran the SQL command
2. Check the email matches exactly
3. Try refreshing the page

### No Products Showing?
1. Go to admin dashboard
2. Add some test products
3. Or run: `supabase db seed`

## Files to Check

- **Database setup**: Check `supabase/` folder
- **Admin help**: Read `ADMIN_ACCESS_SIMPLE.md`
- **Full deployment**: Check `DEPLOYMENT.md`

## Common URLs

- **Store Homepage**: `http://localhost:5173/`
- **Customer Signup**: `http://localhost:5173/auth`
- **Admin Login**: `http://localhost:5173/admin-login`
- **Admin Dashboard**: `http://localhost:5173/admin`

That's it! You should be up and running in 5 minutes. 🎉