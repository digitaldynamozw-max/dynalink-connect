# Vercel Deployment Guide for DynaLink Connect

## Pre-Deployment Checklist

- [ ] Vercel account created (https://vercel.com)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Git repository initialized and commits pushed
- [ ] Environment variables configured
- [ ] Database provider set up (MySQL)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Update Environment Variables

### For Local Development (already done):
- Update `.env.local` with your local MySQL/SQLite settings

### For Vercel Production:
The following environment variables need to be set in your Vercel project:

1. **DATABASE_URL** - Your MySQL connection string
   - Format: `mysql://user:password@host:port/database`
   - Example: `mysql://admin:password123@mysql.vercel.sh:3306/dynalink_connect`

2. **NEXTAUTH_SECRET** - Generate a secure secret
   ```bash
   openssl rand -base64 32
   ```

3. **NEXTAUTH_URL** - Your Vercel deployment URL
   - Example: `https://dynalink-connect.vercel.app`

4. **DATABASE_URL** - SQLite database path (optional for Vercel)
   - Already configured for development

## Step 3: Deploy to Vercel

### Option A: Using Vercel Web Dashboard

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Configure project settings
5. Add environment variables
6. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Step 4: Set Environment Variables

### Using Vercel CLI:
```bash
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
# PayNow is built-in - no payment gateway env vars needed
```

### Using Vercel Dashboard:
1. Go to your project settings
2. Click "Environment Variables"
3. Add each variable

## Step 5: Database Setup on Vercel

The build command in `vercel.json` will automatically run migrations:
```bash
npm run build && npx prisma migrate deploy
```

## Step 6: Verify Deployment

1. Check deployment logs in Vercel dashboard
2. Visit your app URL
3. Test key features:
   - User login
   - Product browsing
   - Shopping cart
   - Checkout process
   - Admin dashboard

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify database connection string format

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check MySQL whitelist on database host
- Ensure database is accessible from Vercel IPs

### NextAuth Issues
- NEXTAUTH_SECRET must be set and consistent
- NEXTAUTH_URL must match your Vercel domain
- Use `https://` prefix for NEXTAUTH_URL

### PayNow Issues
- Verify API keys are for the correct environment (test/live)
- Update webhook URLs to point to Vercel domain

## Post-Deployment

1. **Run Database Migrations:**
   ```bash
   vercel env pull
   npx prisma migrate deploy
   ```

2. **Seed Database (if needed):**
   ```bash
   curl -X POST https://your-app.vercel.app/api/seed
   ```

3. **Monitor Performance:**
   - Use Vercel Analytics
   - Monitor database performance
   - Check error logs

## Rollback

To rollback to a previous deployment:
1. Go to Vercel dashboard
2. Click on "Deployments"
3. Find the previous successful deployment
4. Click "Promote to Production"

## Updates

To deploy updates:
```bash
git add .
git commit -m "Your message"
git push origin main

# Vercel will auto-deploy or use CLI
vercel --prod
```

## Database Backup

Before making major changes:
1. Create a backup of your MySQL database
2. Test migrations in development first
3. Keep migration files in version control

---

For more information:
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/app/building-your-application/deploying
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
