-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "baseFee" REAL NOT NULL,
    "perKmFee" REAL NOT NULL DEFAULT 0,
    "maxDistance" REAL NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryZone_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ordersIncluded" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payNowRef" TEXT,
    "customerZip" TEXT,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "id", "payNowRef", "status", "total", "updatedAt", "userId") SELECT "createdAt", "id", "payNowRef", "status", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_payNowRef_key" ON "Order"("payNowRef");
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "vendorEarnings" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "orderId", "price", "productId", "quantity") SELECT "id", "orderId", "price", "productId", "quantity" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_vendorId_idx" ON "OrderItem"("vendorId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "image" TEXT,
    "category" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "vendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "image", "name", "price", "rating", "salesCount", "stock", "updatedAt") SELECT "category", "createdAt", "description", "id", "image", "name", "price", "rating", "salesCount", "stock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mobileNumber" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "accountBalance" REAL NOT NULL DEFAULT 0,
    "profilePicture" TEXT,
    "deliveryAddress" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isVendor" BOOLEAN NOT NULL DEFAULT false,
    "vendorName" TEXT,
    "vendorDescription" TEXT,
    "vendorImage" TEXT,
    "storeAddress" TEXT,
    "storeCity" TEXT,
    "storeState" TEXT,
    "storeZipCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "vendorPhoneNumber" TEXT,
    "vendorVerified" BOOLEAN NOT NULL DEFAULT false,
    "vendorJoinedAt" DATETIME,
    "commissionRate" REAL NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountBalance", "createdAt", "deliveryAddress", "email", "firstName", "id", "isActive", "language", "lastName", "mobileNumber", "name", "password", "profilePicture", "role", "updatedAt") SELECT "accountBalance", "createdAt", "deliveryAddress", "email", "firstName", "id", "isActive", "language", "lastName", "mobileNumber", "name", "password", "profilePicture", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_vendorName_key" ON "User"("vendorName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DeliveryZone_vendorId_idx" ON "DeliveryZone"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_vendorId_zipCode_key" ON "DeliveryZone"("vendorId", "zipCode");

-- CreateIndex
CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");
