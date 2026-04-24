import { useCallback, useState } from "react";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy: number;
  captured_at: string;
}

/**
 * One-shot geolocation reader — used for field visit check-ins.
 * Returns null if the user denies or the device has no GPS.
 */
export function useGeolocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    return new Promise<GeoPoint | null>((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocation unavailable");
        resolve(null);
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const g: GeoPoint = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            captured_at: new Date().toISOString(),
          };
          setPoint(g);
          setLoading(false);
          resolve(g);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }, []);

  return { point, loading, error, capture };
}
