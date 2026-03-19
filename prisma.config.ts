// This file is used by Prisma CLI to load configuration.
// It does not need to import `prisma/config` during runtime.
import "dotenv/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
};
