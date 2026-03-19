# QUICK START - Deploy to Vercel in 5 Minutes

## What You Have
- ✓ Vercel CLI installed
- ✓ Project configured for MySQL
- ✓ All scripts ready
- ✓ Git repository updated

## What You Need (5 items)

1. **DATABASE_URL** - MySQL connection string
   - Get from: PlanetScale, AWS RDS, Railway, or other MySQL provider
   - Format: `mysql://user:password@host:3306/database`

2. **NEXTAUTH_SECRET** - Random secure key
   ```bash
   openssl rand -base64 32
   ```

3. **NEXTAUTH_URL** - Your Vercel app URL
   - You'll get this after first deployment
   - Format: `https://myapp.vercel.app`

4. **STRIPE_SECRET_KEY** - From https://dashboard.stripe.com/apikeys
   - Starts with: `sk_test_` (for testing)

5. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** - From same Stripe page
   - Starts with: `pk_test_` (for testing)

## Deploy Now

### Method 1: Git Push (Recommended for GitHub users)
```bash
cd "c:\Users\The Gambler\dynalink_connect"
git push origin main
```
Then go to https://vercel.com and import from GitHub.

### Method 2: Vercel CLI
```bash
cd "c:\Users\The Gambler\dynalink_connect"
vercel link --confirm
vercel --prod
```

### Method 3: Web Dashboard
1. Go to https://vercel.com
2. Click "Add New..."
3. Select "Project"
4. Connect your Git repository
5. Click Deploy

## Add Environment Variables

After first deployment:

### Via CLI
```bash
vercel env add DATABASE_URL "mysql://..."
vercel env add NEXTAUTH_SECRET "your-secret-key"
vercel env add NEXTAUTH_URL "https://your-app.vercel.app"
vercel env add STRIPE_SECRET_KEY "sk_test_..."
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_test_..."
```

### Via Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Settings"
4. Click "Environment Variables"
5. Add each variable

## Next Deployment
```bash
git push origin main
# Vercel will auto-deploy
```

## Check Status
- Dashboard: https://vercel.com/dashboard
- Live App: https://your-app.vercel.app
- Logs: https://vercel.com/dashboard/[project]/logs

## Troubleshooting

**Build fails?**
- Check Vercel build logs
- Verify all env vars are set
- Run `npm run build` locally

**Can't login?**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Seed database: `curl -X POST https://your-app.vercel.app/api/seed`

**Stripe not working?**
- Verify stripe keys are correct
- Check test vs live mode
- Update webhook URLs in Stripe dashboard

---

You're all set! Start with Method 1 or 2 above.
