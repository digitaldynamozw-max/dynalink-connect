#!/bin/bash
# Vercel Deployment Automation Script for DynaLink Connect

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    DynaLink Connect - Vercel Deployment Automation             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify Git
echo -e "${BLUE}[Step 1/6]${NC} Verifying Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Git repository found"
else
    echo -e "${RED}✗${NC} Git repository not found"
    exit 1
fi

# Step 2: Check Vercel CLI
echo ""
echo -e "${BLUE}[Step 2/6]${NC} Checking Vercel CLI..."
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✓${NC} Vercel CLI is installed"
    vercel --version
else
    echo -e "${YELLOW}!${NC} Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Step 3: Check Node modules
echo ""
echo -e "${BLUE}[Step 3/6]${NC} Checking project dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies already installed"
else
    echo -e "${YELLOW}!${NC} Installing dependencies..."
    npm install
fi

# Step 4: Build test
echo ""
echo -e "${BLUE}[Step 4/6]${NC} Testing build..."
npm run build 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build successful"
else
    echo -e "${RED}✗${NC} Build failed - check logs above"
fi

# Step 5: Environment setup reminder
echo ""
echo -e "${BLUE}[Step 5/6]${NC} Environment Variables Required"
echo -e "${YELLOW}Please have the following ready:${NC}"
echo "  • DATABASE_URL (MySQL connection string)"
echo "  • NEXTAUTH_SECRET (generated secure key)"
echo "  • STRIPE_SECRET_KEY"
echo "  • NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# Step 6: Deploy
echo ""
echo -e "${BLUE}[Step 6/6]${NC} Initiating Vercel deployment..."
echo -e "${YELLOW}Note:${NC} You will be prompted to:"
echo "  1. Login to Vercel (if not already logged in)"
echo "  2. Link to your project"
echo "  3. Add environment variables"
echo ""
read -p "Ready to deploy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel
else
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    Deployment initialization complete!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Add your environment variables in Vercel dashboard"
echo "2. Run: vercel --prod (to deploy to production)"
echo "3. Monitor: https://vercel.com/dashboard"
