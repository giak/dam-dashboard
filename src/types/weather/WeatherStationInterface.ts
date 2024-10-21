import type { Observable } from 'rxjs';
import type { ComputedRef } from 'vue';

/**
 * Représente les données météorologiques à un instant donné.
 */
export interface WeatherDataInterface {
  temperature: number; // en degrés Celsius
  precipitation: number; // en millimètres
  windSpeed: number; // en km/h
  solarRadiation: number; // en W/m²
  timestamp: Date;
}

/**
 * Représente une valeur de latitude valide (entre -90 et 90 degrés).
 */
export type Latitude = number & { __brand: 'Latitude' };

/**
 * Représente une valeur de longitude valide (entre -180 et 180 degrés).
 */
export type Longitude = number & { __brand: 'Longitude' };

/**
 * Représente une station météorologique individuelle.
 */
export interface WeatherStationInterface {
  id: string;
  name: string;
  latitude: Latitude;
  longitude: Longitude;
  elevation: number; // en mètres
  weatherData$: Observable<WeatherDataInterface>;
  cleanup: () => void;
}

/**
 * Configuration pour initialiser une sous-station météo.
 */
export interface WeatherStationConfig {
  id: string;
  name: string;
  latitude: Latitude;
  longitude: Longitude;
  elevation: number;
}

/**
 * Représente la station météorologique principale qui agrège les données de plusieurs sous-stations.
 */
export interface MainWeatherStationInterface {
  id: string;
  name: string;
  subStations: WeatherStationInterface[];
  averageTemperature: number | ComputedRef<number>;
  totalPrecipitation: number | ComputedRef<number>;
  lastUpdate: Date;
  temperature$: Observable<number>;
  precipitation$: Observable<number>;
}

export type WeatherDataType = WeatherDataInterface;

/**
 * Vérifie si une valeur est une latitude valide.
 */
export function isValidLatitude(value: number): value is Latitude {
  return value >= -90 && value <= 90;
}

/**
 * Vérifie si une valeur est une longitude valide.
 */
export function isValidLongitude(value: number): value is Longitude {
  return value >= -180 && value <= 180;
}
