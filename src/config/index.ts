import { AppConfig } from '../types';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  api: {
    baseUrl: process.env.SREALITY_API_URL || 'https://www.sreality.cz/api/en/v2/estates',
    perPage: parseInt(process.env.API_PER_PAGE || '20', 10),
    maxPages: parseInt(process.env.API_MAX_PAGES || '100', 10),
    requestDelay: parseInt(process.env.API_REQUEST_DELAY_MS || '1000', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/prahestate',
  },
  sync: {
    enabled: process.env.SYNC_ENABLED?.toLowerCase() === 'true',
    schedule: process.env.SYNC_SCHEDULE || '0 */6 * * *', // Every 6 hours
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
  },
};

export default config;
