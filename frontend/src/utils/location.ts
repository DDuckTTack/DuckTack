import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export async function requestCurrentCoordinates(): Promise<Coordinates> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("LOCATION_SERVICE_DISABLED");
  }

  const currentPermission = await Location.getForegroundPermissionsAsync();
  let status = currentPermission.status;

  if (status !== "granted") {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    throw new Error("LOCATION_PERMISSION_DENIED");
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 5,
    requiredAccuracy: 300,
  });

  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      accuracy: lastKnown.coords.accuracy,
    };
  }

  // getCurrentPositionAsync 는 새 위치 신호가 안 오면(실내·에뮬레이터) 끝나지 않는다.
  // 8초 안에 못 받으면 오래된 마지막 위치라도 쓰고, 그것도 없으면 실패 처리해 화면이 멈추지 않게 한다.
  const current = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  if (!current) {
    const stale = await Location.getLastKnownPositionAsync();
    if (!stale?.coords) throw new Error("LOCATION_TIMEOUT");
    return {
      latitude: stale.coords.latitude,
      longitude: stale.coords.longitude,
      accuracy: stale.coords.accuracy,
    };
  }

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    accuracy: current.coords.accuracy,
  };
}
