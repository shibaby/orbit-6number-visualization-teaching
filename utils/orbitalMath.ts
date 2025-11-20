import * as THREE from 'three';
import { OrbitalElements } from '../types';

// Helper to convert degrees to radians
export const degToRad = (deg: number) => deg * (Math.PI / 180);
export const radToDeg = (rad: number) => rad * (180 / Math.PI);

/**
 * Transforms a point from the Perifocal (Orbital) frame to the Three.js World frame.
 * Perifocal: X points to Perigee, Y is in orbital plane (90 deg from X), Z is angular momentum vector.
 * Physics Frame: Z is North, X is Vernal Equinox.
 * Three.js Frame: Y is Up (Physics Z), Z is Backward (Physics -Y), X is Right (Physics X).
 */
export const perifocalToThree = (x_orb: number, y_orb: number, z_orb: number, elements: OrbitalElements): THREE.Vector3 => {
  const { i, omega, raan } = elements;

  const cos_O = Math.cos(raan); // Omega (RAAN)
  const sin_O = Math.sin(raan);
  const cos_w = Math.cos(omega); // Argument of Perigee
  const sin_w = Math.sin(omega);
  const cos_i = Math.cos(i);    // Inclination
  const sin_i = Math.sin(i);

  // Combined rotation matrix elements (3-1-3 Euler sequence: R_z(-O) * R_x(-i) * R_z(-w))
  const xx = cos_O * cos_w - sin_O * sin_w * cos_i;
  const xy = -cos_O * sin_w - sin_O * cos_w * cos_i;
  const xz = sin_O * sin_i;
  
  const yx = sin_O * cos_w + cos_O * sin_w * cos_i;
  const yy = -sin_O * sin_w + cos_O * cos_w * cos_i;
  const yz = -cos_O * sin_i;
  
  const zx = sin_w * sin_i;
  const zy = cos_w * sin_i;
  const zz = cos_i;

  // Physics Coordinates (Z-up)
  const X = xx * x_orb + xy * y_orb + xz * z_orb;
  const Y = yx * x_orb + yy * y_orb + yz * z_orb;
  const Z = zx * x_orb + zy * y_orb + zz * z_orb;

  // Map Physics (Z-up) to Three.js (Y-up)
  // Physics X -> Three X
  // Physics Y -> Three -Z
  // Physics Z -> Three Y
  return new THREE.Vector3(X, Z, -Y);
};

export const calculatePosition = (elements: OrbitalElements, anomaly?: number): THREE.Vector3 => {
  const { a, e } = elements;
  const nu = anomaly !== undefined ? anomaly : elements.nu;

  // 1. Calculate distance (r) in the orbital plane
  // r = p / (1 + e*cos(nu)), where p = a*(1-e^2)
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));

  // 2. Position in Perifocal frame
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);
  const z_orb = 0;

  return perifocalToThree(x_orb, y_orb, z_orb, elements);
};

export const generateOrbitPath = (elements: OrbitalElements, segments: number = 200): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  for (let j = 0; j <= segments; j++) {
    const nu = (j / segments) * 2 * Math.PI;
    points.push(calculatePosition(elements, nu));
  }
  return points;
};

// Helpers to get key vectors for visualization
export const getNodeVector = (elements: OrbitalElements): THREE.Vector3 => {
  // The ascending node is on the equator (Physics XY plane), at angle RAAN from X axis.
  // In Physics: (cos(raan), sin(raan), 0)
  // In Three: (cos(raan), 0, -sin(raan))
  return new THREE.Vector3(Math.cos(elements.raan), 0, -Math.sin(elements.raan)).normalize();
};

export const getPerigeeVector = (elements: OrbitalElements): THREE.Vector3 => {
  // Perigee is at true anomaly 0
  return calculatePosition(elements, 0).normalize();
};

export const getOrbitNormal = (elements: OrbitalElements): THREE.Vector3 => {
  // Normal is Z axis of perifocal frame
  return perifocalToThree(0, 0, 1, elements).normalize();
};
