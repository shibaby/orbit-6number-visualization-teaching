export interface OrbitalElements {
  a: number; // Semi-major axis (arbitrary units for visualization, e.g., 5-15)
  e: number; // Eccentricity (0 to 0.9)
  i: number; // Inclination (radians or degrees converted to radians)
  omega: number; // Argument of Perigee (radians)
  raan: number; // Longitude of Ascending Node (radians)
  nu: number; // True Anomaly (radians - position of satellite)
}

export interface ExplanationResponse {
  title: string;
  content: string;
}

export enum ParameterKey {
  A = 'a',
  E = 'e',
  I = 'i',
  OMEGA = 'omega',
  RAAN = 'raan',
  NU = 'nu'
}