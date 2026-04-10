// This file is used by Prisma CLI to load configuration.
// It does not need to import `prisma/config` during runtime.
import "dotenv/config";

function resolveSchemaPath() {
  const databaseUrl = process.env["DATABASE_URL"] ?? "";

  if (databaseUrl.startsWith("mysql://")) {
    return "prisma/schema.mysql.prisma";
  }

  return "prisma/schema.prisma";
}

export default {
  schema: resolveSchemaPath(),
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
};
