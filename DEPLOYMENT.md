# Deployment Guide - Spar Express Delivery

Complete deployment guide for setting up your Spar Express Delivery platform from development to production.

## 🚀 Quick Deployment Checklist

- [ ] Supabase project setup
- [ ] Database migrations applied
- [ ] Storage buckets configured
- [ ] Environment variables set
- [ ] Edge functions deployed
- [ ] Admin user created
- [ ] Payment providers configured
- [ ] Domain configured (optional)

## 📋 Prerequisites

### Required Accounts
- [Supabase Account](https://supabase.com) (free tier available)
- [Paystack Account](https://paystack.com) for payments
- [Netlify](https://netlify.com) or [Vercel](https://vercel.com) for hosting
- [PayPal Developer Account](https://developer.paypal.com) (optional)

### Required Software
- Node.js 18+ and npm
- Git
- Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase
```

## 🏗️ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and enter project details:
   - Name: `spar-express-delivery`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users

### 1.2 Get Project Credentials
From your Supabase project dashboard:
1. Go to Settings → API
2. Copy your project URL and anon key
3. Note your project reference ID

### 1.3 Configure Authentication
1. Go to Authentication → Settings
2. Configure these settings:
   - Enable email confirmations: `false` (for easier setup)
   - Enable email change confirmations: `true`
   - Secure email change: `true`

### 1.4 Setup Database
Clone and navigate to your project:
```bash
git clone <your-repo>
cd spar-express-delivery-main

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Seed the database with sample data
supabase db seed
```

### 1.5 Create Storage Buckets
In Supabase Dashboard → Storage:

1. Create `product-images` bucket:
   - Name: `product-images`
   - Public: `true`
   - File size limit: `5MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

2. Create `user-avatars` bucket:
   - Name: `user-avatars`
   - Public: `true`
   - File size limit: `2MB`
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

### 1.6 Deploy Edge Functions
```bash
# Deploy payment verification function
supabase functions deploy verify-payment

# Set environment secrets for edge functions
supabase secrets set PAYSTACK_SECRET_KEY=your_paystack_secret_key
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 💳 Step 2: Payment Setup

### 2.1 Paystack Configuration
1. Sign up at [Paystack](https://paystack.com)
2. Go to Settings → API Keys & Webhooks
3. Copy your test keys (use live keys for production):
   - Public Key: `pk_test_...`
   - Secret Key: `sk_test_...`

### 2.2 PayPal Configuration (Optional)
1. Go to [PayPal Developer](https://developer.paypal.com)
2. Create a new app
3. Get your Client ID for sandbox/live

## 🔧 Step 3: Environment Configuration

Create `.env` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Payment Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# App Configuration
VITE_APP_NAME=Spar Express Delivery
VITE_STORE_NAME=Spar Express Delivery
VITE_STORE_EMAIL=support@sparexpress.com
VITE_STORE_PHONE=+1 (555) 123-SPAR

# Production Environment
NODE_ENV=production
```

## 👥 Step 4: Create Admin User

### 4.1 Sign Up First User
1. Start your development server: `npm run dev`
2. Go to `/auth` and sign up with your admin email
3. Check your email and verify the account

### 4.2 Promote to Admin
In Supabase SQL Editor, run:
```sql
-- Replace with your actual admin email
SELECT public.setup_initial_admin('your-admin@example.com');
```

### 4.3 Verify Admin Access
1. Go to `/admin-login`
2. Sign in with your credentials
3. You should now have access to the admin dashboard

## 🌐 Step 5: Production Deployment

### Option A: Netlify Deployment

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

3. **Configure Environment Variables in Netlify:**
   - Go to Site Settings → Environment Variables
   - Add all your environment variables

4. **Configure Redirects:**
Create `public/_redirects`:
```
/*    /index.html   200
```

### Option B: Vercel Deployment

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all your environment variables

### Option C: Manual Hosting

1. **Build:**
```bash
npm run build
```

2. **Upload `dist/` folder to your web server**

3. **Configure web server for SPA routing**

## 🔐 Step 6: Security Configuration

### 6.1 Update Supabase Auth Settings
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth`

### 6.2 Configure CORS (if needed)
In Supabase Dashboard → API → CORS:
- Add your domain to allowed origins

### 6.3 Row Level Security
All RLS policies are already configured in migrations. Verify they're active:
```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
```

## 📊 Step 7: Configure Store Settings

### 7.1 Admin Settings
1. Log into admin dashboard
2. Go to Settings
3. Configure:
   - Store information
   - Tax rates
   - Currency
   - Business hours
   - Email settings

### 7.2 Add Categories and Products
1. Go to Products → Categories
2. Add your product categories
3. Go to Products → All Products
4. Add your products with images and details

### 7.3 Setup Delivery Zones
1. Go to Operations → Delivery Zones
2. Configure delivery areas and pricing
3. Set minimum order amounts

## 🧪 Step 8: Testing

### 8.1 Test Customer Flow
- [ ] User registration
- [ ] Product browsing
- [ ] Add to cart
- [ ] Checkout process
- [ ] Payment processing
- [ ] Order confirmation

### 8.2 Test Admin Flow
- [ ] Admin login
- [ ] Dashboard metrics
- [ ] Product management
- [ ] Order management
- [ ] Customer management

### 8.3 Test Payment
Use Paystack test cards:
- Success: `4084084084084081`
- Decline: `4084084084084083`

## 📈 Step 9: Go Live

### 9.1 Switch to Production Keys
Update environment variables with live keys:
- Paystack live keys
- PayPal live keys

### 9.2 Enable Email Confirmations
In Supabase Authentication settings:
- Enable email confirmations: `true`

### 9.3 Configure Email Templates
Customize email templates in Supabase → Authentication → Email Templates

### 9.4 Setup Monitoring
- Configure error tracking (e.g., Sentry)
- Setup uptime monitoring
- Enable analytics

## 🚨 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check your environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

**Admin Access Denied**
```sql
-- Check user role
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';

-- Fix role if needed
UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

**Payment Not Working**
- Verify Paystack keys are correct
- Check Edge Functions are deployed
- Verify webhook configurations

**Images Not Loading**
- Check Storage buckets are created
- Verify bucket policies are set to public
- Check CORS configuration

**Build Errors**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📞 Support

### Getting Help
- Check the main README.md for detailed documentation
- Review Supabase docs for backend issues
- Check payment provider documentation

### Community
- GitHub Issues: Report bugs and feature requests
- Discord: Join our community for real-time help

## 🔄 Updates and Maintenance

### Regular Tasks
- [ ] Monitor database performance
- [ ] Review security logs
- [ ] Update product inventory
- [ ] Process orders promptly
- [ ] Backup data regularly

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run new migrations
supabase db push

# Rebuild and deploy
npm run build
# Deploy to your hosting platform
```

## 🎯 Performance Optimization

### Frontend Optimization
- Enable caching on your hosting platform
- Use CDN for static assets
- Optimize images (use WebP format)
- Enable gzip compression

### Database Optimization
- Monitor query performance in Supabase
- Add indexes for frequently queried fields
- Regular maintenance and cleanup

### Monitoring
- Setup alerts for high error rates
- Monitor page load times
- Track conversion rates
- Monitor server resources

---

## 🏆 You're Live!

Congratulations! Your Spar Express Delivery platform is now live and ready to serve customers. Remember to:

1. **Test thoroughly** before announcing launch
2. **Monitor closely** for the first few days
3. **Gather feedback** from early users
4. **Iterate quickly** based on user needs

Your professional e-commerce platform is now ready to compete with the best in the market! 🚀