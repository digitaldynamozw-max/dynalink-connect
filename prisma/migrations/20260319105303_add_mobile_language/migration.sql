-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "mobileNumber" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "accountBalance" REAL NOT NULL DEFAULT 0,
    "profilePicture" TEXT,
    "deliveryAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountBalance", "createdAt", "deliveryAddress", "email", "id", "name", "password", "profilePicture", "role", "updatedAt") SELECT "accountBalance", "createdAt", "deliveryAddress", "email", "id", "name", "password", "profilePicture", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
