const path = require("path");

module.exports = ({ env }) => {
  // 1. Detectamos si estamos en Render o si existe una URL de Postgres
  // Si no hay DATABASE_URL, asumimos que estamos en LOCAL (sqlite)
  const isProduction = env("DATABASE_URL") || env("NODE_ENV") === "production";
  
  const client = isProduction ? "postgres" : "sqlite";

  const connections = {
    postgres: {
      connection: {
        connectionString: env("DATABASE_URL"),
        // SSL es obligatorio para conectar con la DB de Render
        ssl: {
          rejectUnauthorized: false,
        },
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
    },
    sqlite: {
      connection: {
        filename: path.join(
          __dirname,
          "..",
          "..",
          env("DATABASE_FILENAME", ".tmp/data.db")
        ),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int("DATABASE_CONNECTION_TIMEOUT", 60000),
    },
  };
};