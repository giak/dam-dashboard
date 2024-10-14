export const browserConfig = {
  nodeEnv: import.meta.env.MODE || 'development',
  port: parseInt(import.meta.env.VITE_PORT || '3000', 10),
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  damApiEndpoint: import.meta.env.VITE_DAM_API_ENDPOINT || '/dam',
  updateInterval: 1000, // mise à jour toutes les secondes
  maxWaterLevel: 100,
  minWaterLevel: 0,
  damSurfaceArea: 10000, // en m²
};
