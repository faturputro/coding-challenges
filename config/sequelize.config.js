require('dotenv').config();

const port = Number(process.env.DB_PORT ?? 5432);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535');
}

const config = {
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port,
  database: process.env.DB_NAME ?? 'quiz',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  logging: true,
  define: { underscored: true },
};

module.exports = {
  development: config,
  test: { ...config, database: process.env.DB_TEST_NAME ?? 'quiz_test' },
  production: config,
};
