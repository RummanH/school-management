import 'dotenv/config';

const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';

const isDevRun = process.env.npm_lifecycle_event === 'dev';
const DATABASE_URL = (isDevRun && process.env.DEV_DATABASE_URL) || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to your .env file.');
}

export const env = {
  DATABASE_URL,
  NODE_ENV,
  PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'school_session',
  SESSION_DAYS: Number(process.env.SESSION_DAYS || 7),
  DEFAULT_SYSTEM_DEVELOPER_EMAIL: process.env.DEFAULT_SYSTEM_DEVELOPER_EMAIL || 'developer@school.local',
  DEFAULT_SYSTEM_DEVELOPER_PASSWORD: process.env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD || 'Developer@12345',
  DEFAULT_SYSTEM_DEVELOPER_NAME: process.env.DEFAULT_SYSTEM_DEVELOPER_NAME || 'System Developer',
};
