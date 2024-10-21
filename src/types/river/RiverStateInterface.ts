export interface RiverStateInterface {
  id: string;
  name: string;
  flowRate: number;  // in cubic meters per second
  waterLevel: number;  // in meters
  temperature: number;  // in Celsius
  pollutionLevel: number;  // on a scale of 0-100
  waterVolume: number;
  catchmentArea: number;
  lastUpdated: Date;
  
}
