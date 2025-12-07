# Admin Access - Simple Explanation

## What is Admin Access?

**Admin access** is like being the **manager of the store**. When you have admin access, you can:

- ✅ **Manage Products** - Add new products, change prices, update descriptions
- ✅ **Process Orders** - See customer orders, mark them as ready/delivered
- ✅ **View Sales Data** - See how much money you're making, best-selling items
- ✅ **Manage Customers** - View customer information and order history
- ✅ **Control Store Settings** - Change store hours, delivery zones, tax rates

**Without admin access**, you're just a regular customer who can shop and place orders.

## How to Get Admin Access (Simple Steps)

### Step 1: Create a Regular Account First
1. Go to your website: `http://localhost:5173/auth`
2. Click "Sign Up" 
3. Enter your email and password (like `admin@mystore.com`)
4. Verify your email if needed
5. **You now have a customer account**

### Step 2: Make Yourself an Admin
1. Go to [Supabase Dashboard](https://app.supabase.com) 
2. Open your project
3. Click "SQL Editor" on the left
4. Copy and paste this code (replace the email with yours):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

5. Click "Run"
6. **You now have admin access!**

### Step 3: Login to Admin Dashboard
1. Go to: `http://localhost:5173/admin-login`
2. Enter the same email and password from Step 1
3. **You're now in the admin dashboard!**

## What Each Admin Page Does

### 📊 **Dashboard** (`/admin`)
- Shows overview of your business
- Total sales, number of orders, customer count
- Like the "homepage" for admins

### 🛒 **Products** (`/admin/products`)
- Add new products to sell
- Change prices and descriptions
- Upload product photos
- Mark products as available/sold out

### 📦 **Orders** (`/admin/orders`)
- See all customer orders
- Update order status (preparing → ready → delivered)
- Add notes for customers

### 👥 **Customers** (`/admin/customers`)
- View customer information
- See their order history
- Manage customer accounts

### 📍 **Delivery Zones** (`/admin/delivery`)
- Set up areas where you deliver
- Set delivery fees for different areas
- Control minimum order amounts

### 🎫 **Coupons** (`/admin/coupons`)
- Create discount codes
- Set percentage or dollar discounts
- Control when coupons expire

## Common Questions

### Q: Why can't I access admin pages?
**A:** You need admin access. Follow the 3 steps above to get it.

### Q: I forgot my admin password, what do I do?
**A:** Go to the regular login page (`/auth`) and use "Forgot Password" - it's the same account.

### Q: Can I have multiple admins?
**A:** Yes! Just repeat Step 2 with different email addresses.

### Q: What's the difference between admin and super admin?
**A:** 
- **Admin**: Can manage products, orders, customers
- **Super Admin**: Can do everything admin can do + change store settings and create other admins

### Q: Is this secure?
**A:** Yes! The system checks your role every time you try to access admin pages.

## Quick Test

1. **Customer Test**: Go to `http://localhost:5173` - you should see the store
2. **Admin Test**: Go to `http://localhost:5173/admin-login` - sign in with admin email
3. **Success**: You should see the admin dashboard with charts and data

## Troubleshooting

**Problem**: "Access Denied" when trying to login
**Solution**: Make sure you ran the SQL command to make yourself an admin

**Problem**: Can't find SQL Editor in Supabase
**Solution**: Look for "SQL Editor" in the left sidebar of your Supabase project

**Problem**: Admin dashboard shows no data
**Solution**: Add some test products and create test orders to see data

---

## Summary

**Admin access = Store manager privileges**

1. Sign up as regular user
2. Run SQL to become admin  
3. Login to admin dashboard
4. Manage your store!

That's it! Simple as that. 🎉