require("dotenv/config");

module.exports = {
  schema: "backend/prisma/schema.prisma",
  migrations: { path: "backend/prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://dummy:dummy@localhost/dummy",
  },
};
