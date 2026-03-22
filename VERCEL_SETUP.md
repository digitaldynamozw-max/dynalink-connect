# Vercel Deployment Setup Guide

## Quick Start (4 Steps)

### Step 1: Create GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `dynalink_connect`
3. Description: "Multi-vendor e-commerce marketplace with Next.js"
4. Make it **Public** (required for free Vercel tier)
5. Click "Create repository"

### Step 2: Push Code to GitHub
```powershell
# After creating the GitHub repo, run these commands:
cd c:\Users\The Gambler\dynalink_connect

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dynalink_connect.git
git branch -M main
git push -u origin main
```

### Step 3: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select the `dynalink_connect` repository
5. Click "Import"

### Step 4: Configure Environment Variables on Vercel

On Vercel's dashboard, go to **Settings > Environment Variables** and add:

**Required Variables:**
```
NEXTAUTH_SECRET=<generate-random-string>
NEXTAUTH_URL=https://<your-deployment-url>.vercel.app
DATABASE_URL=postgresql://user:password@host:5432/dbname
NODE_ENV=production
```

**Optional (if using PayNow):**
```
PAYNOW_INTEGRATION_ID=your_paynow_id
PAYNOW_INTEGRATION_KEY=your_paynow_key
```

---

## Detailed Setup

### Generate NEXTAUTH_SECRET
Run in PowerShell:
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | clip
```
This copies a random secret to your clipboard. Paste it as `NEXTAUTH_SECRET` on Vercel.

### Setup PostgreSQL Database

**Recommended: Use Vercel Postgres**
1. On Vercel dashboard, go to **Storage** tab
2. Click "Create Database" → "Postgres"
3. Name it `dynalink-db`
4. Copy the `POSTGRES_URL_NON_POOLING` connection string
5. Paste as `DATABASE_URL` in Environment Variables

**Alternative: Use external PostgreSQL**
- DigitalOcean Managed Database: $15/month
- AWS RDS: $10-50/month depending on usage
- Railway.app: Free tier + pay-as-you-go
- Connection string format:
  ```
  postgresql://username:password@host:5432/database_name
  ```

### Configure Vercel Deployment

On Vercel:
1. **Project Settings** → **Git**
   - Confirm "Next.js" is auto-detected
   - Leave Build Command: `npm run build`
   - Leave Output Directory: `.next`

2. **Settings** → **Environment Variables**
   - Add all variables above
   - Apply to: Production, Preview, Development

3. **Deployments** tab
   - Your latest push to `main` should show a build

---

## After First Deployment

### 1. Run Database Migrations
Vercel will auto-detect `prisma/migrations` and run them.

If migrations don't run automatically:
```bash
# In Vercel Dashboard, go to Settings → Functions
# Create a function or use Build Command:
npm run build && npx prisma migrate deploy
```

### 2. Seed Database (Optional)
Your deployment URL will be shown on Vercel dashboard (e.g., `dynalink-connect.vercel.app`)

```powershell
# Run seed via API
Invoke-WebRequest -Uri "https://dynalink-connect.vercel.app/api/seed" -Method POST
```

### 3. Test Vendor Login
- **Email:** vendor1@example.com
- **Password:** #Honest2025
- **Store:** Tech Paradise
- **Location:** 2 Giraffe Cres, Borrowdale West, Harare

---

## Troubleshooting

### Build Fails: "Cannot find module"
- Check `package.json` has all dependencies
- Verify `.next` is in `.gitignore`
- Clear Vercel cache: Project Settings → Deployments → Redeploy

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Check PostgreSQL connection limits
- Whitelist Vercel IPs in database firewall (if applicable)

### 500 Errors in Production
- Check Vercel Logs: Deployments → Build Logs & Function Logs
- Verify all API routes use `process.env.DATABASE_URL` not hardcoded URLs
- Check NextAuth session secret is set

### Environment Variables Not Loading
- Ensure variables are set on Vercel (not in `.env`)
- Redeploy after adding variables
- No `.env` file should be in production build

---

## Features Included in This Deployment

✅ Multi-vendor marketplace  
✅ Product catalog with variants  
✅ Shopping cart & checkout  
✅ User authentication (NextAuth.js)  
✅ Vendor dashboard with orders, payouts, settings  
✅ Wishlist & reviews  
✅ Admin panel for platform management  
✅ PayNow payment integration  
✅ Multi-vendor delivery fees  

---

## Domain Setup (Optional)

To use a custom domain:
1. Go to **Project Settings** → **Domains**
2. Add your domain (e.g., `dynalink.com`)
3. Update DNS records at your registrar
4. Vercel auto-generates SSL certificate

---

## Monitoring & Maintenance

Once deployed:
- **Vercel Analytics** → Monitor performance
- **Real-time Logs** → Debugging
- **Automatic Deployments** → Push to `main` branch auto-deploys
- **Environment Rollback** → Revert to previous deployment if needed

---

## Next Steps

1. Create GitHub repository
2. Push code (I'll help with Git commands)
3. Connect to Vercel
4. Configure environment variables
5. Database up and running automatically
6. Visit your deployed app!

**Estimated Time:** 15-20 minutes total

