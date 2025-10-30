function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (x) => (x * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

function calculateSpeed(lat1, lon1, time1, lat2, lon2, time2) {
  const distance = haversineDistance(lat1, lon1, lat2, lon2); // in meters
  const timeDiff = (time2 - time1) / 1000; // in seconds

  if (timeDiff === 0) return 0; // avoid divide-by-zero

  const speedMs = distance / timeDiff; // meters per second
  const speedKmh = speedMs * 3.6; // convert to km/h

  return speedKmh;
}

module.exports = { calculateSpeed };
