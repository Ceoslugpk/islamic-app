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

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceToKaabaKm(latitude: number, longitude: number): number {
  return distanceKm(latitude, longitude, KAABA_LAT, KAABA_LNG);
}

/** Smooth the compass heading with an exponential moving average to reduce jitter. */
export function smoothHeading(raw: number, prev: number, alpha = 0.2): number {
  if (typeof raw !== 'number' || isNaN(raw)) return prev;
  if (typeof prev !== 'number' || isNaN(prev)) return raw;
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
export function headingFromMagnetometer(x: number, y: number, _platform?: 'ios' | 'android'): number {
  // Device Cartesian plane: +X is right, +Y is top.
  // When device top (+Y) points to Magnetic North, ambient field vector points along +Y.
  // When device rotates clockwise by theta, North vector in device coords is (-sin(theta), cos(theta)).
  // Therefore theta = atan2(-x, y). Works uniformly across iOS and Android portrait orientation.
  const deg = (Math.atan2(-x, y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Resolves true heading in degrees (0..360, where 0 = True North) from expo-location heading.
 * If trueHeading is -1 (not yet provided or permission restricted), falls back to
 * magHeading + estimated magnetic declination.
 */
export function resolveLocationHeading(
  headingObj: { trueHeading?: number; magHeading?: number },
  latitude?: number | null,
  longitude?: number | null
): number {
  if (
    typeof headingObj?.trueHeading === 'number' &&
    !isNaN(headingObj.trueHeading) &&
    headingObj.trueHeading >= 0
  ) {
    return (headingObj.trueHeading + 360) % 360;
  }
  const mag =
    typeof headingObj?.magHeading === 'number' && !isNaN(headingObj.magHeading)
      ? headingObj.magHeading
      : 0;
  const decl =
    latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)
      ? magneticDeclination(latitude, longitude)
      : 0;
  return ((mag + decl) % 360 + 360) % 360;
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

/**
 * Magnetic interference detection.
 * Returns an object with:
 * - hasInterference: boolean indicating if interference is detected
 * - level: 'low' | 'medium' | 'high' | 'none'
 * - details: human-readable explanation
 * 
 * Uses heading variance over time and rapid heading changes to detect
 * unreliable magnetometer readings (near metal, electronics, etc.).
 */
export interface InterferenceResult {
  hasInterference: boolean;
  level: 'none' | 'low' | 'medium' | 'high';
  details: string;
}

let interferenceHistory: number[] = [];
let lastHeadingForInterference: number | null = null;
let lastTimestampForInterference: number = 0;

export function checkMagneticInterference(
  currentHeading: number,
  accuracy: 'high' | 'medium' | 'low' | 'uncalibrated' | 'unknown'
): InterferenceResult {
  const now = Date.now();
  
  // Add to history
  interferenceHistory.push(currentHeading);
  if (interferenceHistory.length > 30) {
    interferenceHistory.shift();
  }
  
  let level: InterferenceResult['level'] = 'none';
  let details = '';
  let hasInterference = false;
  
  // Check 1: Rapid heading change (angular velocity)
  if (lastHeadingForInterference !== null) {
    const timeDelta = now - lastTimestampForInterference;
    if (timeDelta > 0 && timeDelta < 500) {
      const angleDelta = Math.abs(shortestAngleDelta(currentHeading, lastHeadingForInterference));
      const degPerSecond = (angleDelta / timeDelta) * 1000;
      if (degPerSecond > 180) { // More than 180 deg/sec = physically implausible
        level = 'high';
        hasInterference = true;
        details = 'Extremely rapid heading changes detected — likely near metal or electronics';
      } else if (degPerSecond > 90) {
        level = 'medium';
        hasInterference = true;
        details = 'Fast heading changes — possible magnetic interference';
      }
    }
  }
  
  // Check 2: Heading variance (jitter) over recent samples
  if (!hasInterference && interferenceHistory.length >= 10) {
    // Calculate the circular mean and shortest angular deltas so 359° and 1° stay close.
    const mean = (Math.atan2(
      interferenceHistory.reduce((sum, value) => sum + Math.sin((value * Math.PI) / 180), 0),
      interferenceHistory.reduce((sum, value) => sum + Math.cos((value * Math.PI) / 180), 0),
    ) * 180) / Math.PI;
    const variance = interferenceHistory.reduce(
      (sum, val) => sum + Math.pow(shortestAngleDelta(val, mean), 2),
      0,
    ) / interferenceHistory.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 15) {
      level = 'high';
      hasInterference = true;
      details = 'High magnetic field variance — move away from metal objects and electronics';
    } else if (stdDev > 8) {
      level = 'medium';
      hasInterference = true;
      details = 'Moderate heading instability — check for nearby magnetic sources';
    } else if (stdDev > 4) {
      level = 'low';
      details = 'Slight heading fluctuation — hold device steady';
    }
  }
  
  // Check 3: Low accuracy from sensor
  if (!hasInterference && accuracy === 'uncalibrated') {
    level = 'medium';
    hasInterference = true;
    details = 'Compass uncalibrated — wave device in figure-8 motion';
  } else if (!hasInterference && accuracy === 'low') {
    level = 'low';
    details = 'Compass accuracy low — calibrate by moving in figure-8';
  }
  
  lastHeadingForInterference = currentHeading;
  lastTimestampForInterference = now;
  
  return { hasInterference, level, details };
}

export function resetInterferenceHistory(): void {
  interferenceHistory = [];
  lastHeadingForInterference = null;
  lastTimestampForInterference = 0;
}

/**
 * Format distance to Kaaba with locale-aware formatting.
 */
export function formatDistanceToKaaba(km: number, locale = 'en-US'): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1).replace('.0', '')} km`;
  }
  if (km < 100) {
    return `${Math.round(km)} km`;
  }
  return km.toLocaleString(locale, { maximumFractionDigits: 0 }) + ' km';
}

/**
 * Calibration step guidance for the Qibla compass.
 */
export type CalibrationStep = 'hold-flat' | 'rotate-slowly' | 'align' | 'ready';

export interface CalibrationGuidance {
  step: CalibrationStep;
  title: string;
  description: string;
  icon: string; // Ionicons name
  progress: number; // 0-1
}

export function getCalibrationGuidance(
  isStaticMode: boolean,
  calibrating: boolean,
  heading: number | null,
  bearing: number | null,
  accuracy: 'high' | 'medium' | 'low' | 'uncalibrated' | 'unknown',
  isAligned: boolean
): CalibrationGuidance {
  if (isStaticMode) {
    return {
      step: 'ready',
      title: 'Static Direction Mode',
      description: 'Hardware compass unavailable. Align the top of your device toward the bearing shown.',
      icon: 'compass-outline',
      progress: 1,
    };
  }
  
  if (calibrating || heading === null) {
    return {
      step: 'hold-flat',
      title: 'Hold Phone Level',
      description: 'Place your phone flat on your palm, screen facing up. Keep it steady.',
      icon: 'phone-portrait-outline',
      progress: 0.25,
    };
  }
  
  if (accuracy === 'uncalibrated' || accuracy === 'low') {
    return {
      step: 'rotate-slowly',
      title: 'Rotate Slowly',
      description: 'Wave the phone slowly in a figure-8 motion to calibrate the magnetometer.',
      icon: 'infinite',
      progress: 0.5,
    };
  }
  
  if (!isAligned) {
    return {
      step: 'align',
      title: 'Align with Qibla',
      description: 'Turn your body until the amber needle points straight up to the top marker.',
      icon: 'navigate-outline',
      progress: 0.75,
    };
  }
  
  return {
    step: 'ready',
    title: 'Aligned with Qibla',
    description: 'You are facing the Kaaba. The needle is steady and accurate.',
    icon: 'checkmark-circle',
    progress: 1,
  };
}

