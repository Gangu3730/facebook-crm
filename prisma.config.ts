// Prisma 7 configuration file
// Connection URL is managed here, NOT in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    // Update DATABASE_URL in .env with your MySQL credentials:
    // mysql://username:password@localhost:3306/apexcrm
    url: process.env["DATABASE_URL"] as string,
  },
});
