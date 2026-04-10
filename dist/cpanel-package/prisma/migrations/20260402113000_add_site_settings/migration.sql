-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL DEFAULT 'DynaLink Connect',
    "heroBadge" TEXT NOT NULL DEFAULT 'Company Marketplace',
    "heroTitle" TEXT NOT NULL DEFAULT 'Welcome to DynaLink Connect',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Fast, reliable delivery from your favorite vendors. Shop everything you need in one place.',
    "heroBackgroundImage" TEXT,
    "heroForegroundImage" TEXT,
    "primaryCtaLabel" TEXT NOT NULL DEFAULT 'Shop Now',
    "primaryCtaHref" TEXT NOT NULL DEFAULT '/products',
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT 'Become a Vendor',
    "secondaryCtaHref" TEXT NOT NULL DEFAULT '/vendor/register',
    "whatsappNumber" TEXT NOT NULL DEFAULT '1234567890',
    "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "referralRewardAmount" REAL NOT NULL DEFAULT 25,
    "referralHeadline" TEXT NOT NULL DEFAULT 'Referral program is active',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SiteSettings" (
    "id",
    "updatedAt"
)
VALUES (
    'global',
    CURRENT_TIMESTAMP
);
