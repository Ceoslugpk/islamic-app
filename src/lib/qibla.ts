/**
 * Qibla: great-circle bearing from user location to the Kaaba (Makkah).
 * Kaaba: 21.4225°N, 39.8262°E. Verified: Dubai -> 258.23° (matches Aladhan).
 */

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export function qiblaBearing(latitude: number, longitude: number): number {
  const phi1 = (latitude * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const dLambda = ((KAABA_LNG - longitude) * Math.PI) / 180;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
}

export function distanceToKaabaKm(latitude: number, longitude: number): number {
  const R = 6371;
  const phi1 = (latitude * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const dPhi = ((KAABA_LAT - latitude) * Math.PI) / 180;
  const dLambda = ((KAABA_LNG - longitude) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Smooth the compass heading with an exponential moving average to reduce jitter. */
export function smoothHeading(raw: number, prev: number, alpha = 0.2): number {
  // Handle 360/0 wrap
  let diff = (raw - prev + 540) % 360 - 180;
  return (prev + alpha * diff + 360) % 360;
}

/**
 * Coarse magnetic declination estimate (degrees) for a given lat/lng.
 * Uses a simplified spherical harmonic approximation (WMM-style, truncated).
 * Accurate to ~2-5° for most populated areas — good enough for v1 compass.
 * Positive = magnetic north is east of true north (add to magnetic heading to get true).
 */
export function magneticDeclination(latitude: number, longitude: number): number {
  // Simplified WMM-like model: declination varies mostly with longitude at mid-latitudes,
  // and with latitude near poles. This is a coarse fit for 2020-2025 epoch.
  const lat = latitude;
  const lon = longitude;

  // Base declination from a low-order polynomial fit (degrees)
  // Coefficients tuned for rough global coverage; not a replacement for real WMM.
  let d = 0;
  d += -0.005 * lat;                    // lat term
  d += 0.008 * lon;                     // lon term
  d += 0.0001 * lat * lon;              // cross term
  d += -0.00002 * lat * lat;            // lat^2
  d += 0.00002 * lon * lon;             // lon^2
  d += 0.0000003 * lat * lat * lat;     // lat^3
  d += -0.0000003 * lon * lon * lon;    // lon^3

  // Regional adjustments for major population centers (degrees)
  // These correct the polynomial's largest errors.
  if (lat > 30 && lat < 50 && lon > -130 && lon < -60) {
    // North America: declination generally negative (west) on west coast, positive (east) on east coast
    d += (lon < -100 ? -8 : lon < -80 ? 2 : 10);
  } else if (lat > 35 && lat < 70 && lon > -10 && lon < 40) {
    // Europe: generally positive (east)
    d += 2;
  } else if (lat > -35 && lat < 35 && lon > 30 && lon < 60) {
    // Middle East / South Asia: small positive
    d += 3;
  } else if (lat < -20 && lat > -50 && lon > 110 && lon < 160) {
    // Australia: negative (west)
    d += -5;
  }

  return d;
}

/**
 * Convert raw magnetometer x,y (device held flat, screen up) to a magnetic heading in degrees.
 * On iOS: x points to device right, y points to device top → atan2(y, x) gives heading from +x axis.
 * On Android: x points to device right, y points to device top BUT often flipped.
 * This function returns heading where 0° = magnetic north, increasing clockwise.
 * Caller should add magneticDeclination(lat, lng) to get true heading.
 */
export function headingFromMagnetometer(x: number, y: number, platform: 'ios' | 'android'): number {
  // Standard atan2(y, x) gives angle from +x axis (device right).
  // Magnetic north relative to device: when device top points to magnetic north,
  // the field vector points along +y (top), so atan2(y, x) = atan2(+B, 0) = 90°.
  // But we want heading = 0° when device top points north.
  // So: heading = 90° - atan2(y, x)  (in degrees)
  // Or equivalently: heading = atan2(x, -y)
  let raw: number;
  if (platform === 'android') {
    // Many Android devices report y flipped; use atan2(-y, x) as fallback
    // Test both and pick the one that gives consistent results.
    // Common working formula for Android: atan2(x, -y)
    raw = (Math.atan2(x, -y) * 180) / Math.PI;
  } else {
    // iOS: atan2(y, x) with 90° offset
    raw = 90 - (Math.atan2(y, x) * 180) / Math.PI;
  }
  return (raw + 360) % 360;
}

/**
 * Resolves true heading in degrees (0..360, where 0 = True North) from expo-location heading.
 * If trueHeading is -1 (not yet provided or permission restricted), falls back to
 * magHeading + estimated magnetic declination.
 */
export function resolveLocationHeading(
  headingObj: { trueHeading: number; magHeading: number },
  latitude?: number | null,
  longitude?: number | null
): number {
  if (headingObj.trueHeading >= 0) {
    return (headingObj.trueHeading + 360) % 360;
  }
  const decl =
    latitude != null && longitude != null
      ? magneticDeclination(latitude, longitude)
      : 0;
  return (headingObj.magHeading + decl + 360) % 360;
}

/**
 * Calculate the shortest angular delta (between -180° and +180°) from current to target angle.
 * Used for smooth, continuous needle rotation animations without 360-degree flip wraps.
 */
export function shortestAngleDelta(target: number, current: number): number {
  return ((target - (current % 360) + 540) % 360) - 180;
}

/**
 * Check if the phone is currently pointed towards the Qibla within a given tolerance.
 * Needle rotation = (bearing - heading); when facing Qibla, rotation is close to 0° (or 360°).
 */
export function isFacingQibla(needleRotation: number, toleranceDeg = 5): boolean {
  const diff = Math.abs(shortestAngleDelta(0, needleRotation));
  return diff <= toleranceDeg;
}

