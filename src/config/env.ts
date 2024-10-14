import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  nodeEnv: import.meta.env.MODE || 'development',
  port: parseInt(import.meta.env.VITE_PORT || '3000', 10),
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  damApiEndpoint: import.meta.env.VITE_DAM_API_ENDPOINT || '/dam',
  updateInterval: parseInt(import.meta.env.VITE_UPDATE_INTERVAL || '5000', 10), // milliseconds
  maxWaterLevel: parseFloat(import.meta.env.VITE_MAX_WATER_LEVEL || '100'), // meters
  minWaterLevel: parseFloat(import.meta.env.VITE_MIN_WATER_LEVEL || '0'), // meters
};