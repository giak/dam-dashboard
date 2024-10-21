export interface GlacierStateInterface {
  id: string;
  name: string;
  elevation: number;
  meltRate: number;
  outflowRate: number;
  area: number;
  volume: number;
  temperature: number;
  flow: number;
  lastUpdated: Date;
}
