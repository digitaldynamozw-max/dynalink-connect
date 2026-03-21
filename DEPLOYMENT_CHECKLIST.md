# Quick Vercel Deployment Checklist

## Before Deployment

- [ ] Commit all changes to Git: `git add . && git commit -m "Prepare for Vercel deployment"`
- [ ] Push to remote: `git push origin main`
- [ ] Have your Vercel account ready
- [ ] Have your MySQL database connection string ready
- [ ] Database is configured (SQLite)

## Environment Variables Needed

Create a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
# Output example: 3eH7+j9kL2mN4pQ6rS8tU0vW1xY2zA3bC4dE5fG6hI7j=
```

Gather these values:
- **DATABASE_URL**: MySQL connection string from your provider
- **NEXTAUTH_SECRET**: Generated secure secret (above)
- **NEXTAUTH_URL**: Your Vercel app URL (e.g., https://dynalink-connect.vercel.app)
- **STRIPE_SECRET_KEY**: From https://dashboard.stripe.com/apikeys
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: From https://dashboard.stripe.com/apikeys

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Deploy from your project directory
```bash
cd c:\Users\The Gambler\dynalink_connect
vercel
```

### 3. Follow the prompts
- Link to existing project or create new one
- Configure project settings
- Continue with deployment

### 4. Add Environment Variables
```bash
# Option A: Using CLI
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
# PayNow is built-in - no additional env vars needed for Vercel

# Option B: Via Vercel Dashboard
# 1. Go to your project settings
# 2. Environment Variables section
# 3. Add each variable one by one
```

### 5. Redeploy with environment variables
```bash
vercel --prod
```

## Verification

After deployment:
1. [ ] Visit your app URL
2. [ ] Test login with admin@example.com / password
3. [ ] Browse products
4. [ ] Test add to cart
5. [ ] Check admin dashboard
6. [ ] View deployment logs for any errors

## Post-Deployment

Run migrations on production:
```bash
vercel env pull
npx prisma migrate deploy
```

Seed database if needed:
```bash
curl -X POST https://your-app.vercel.app/api/seed
```

## Support

- Vercel Dashboard: https://vercel.com/dashboard
- Project Settings: Available in your Vercel dashboard
- Live Logs: Real-time logs at https://vercel.com/dashboard/[project]/logs/production

## Database for Vercel

### Recommended Options:
1. **PlanetScale** - MySQL serverless (Free tier available)
   - https://planetscale.com
   
2. **Vercel Postgres** - PostgreSQL from Vercel
   - https://vercel.com/storage/postgres
   
3. **AWS RDS** - Managed MySQL/PostgreSQL
   - https://aws.amazon.com/rds

4. **Railway** - Managed databases
   - https://railway.app

### Getting CONNECTION STRING:
Once you set up your database, you'll get a connection string like:
```
mysql://user:password@host.provider.com:port/database
```

Copy this to your DATABASE_URL environment variable.

---

**Ready to deploy?** Run: `vercel` from your project directory!
