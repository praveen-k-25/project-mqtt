const { calculateSpeed } = require("../haversineDistance");

async function handleMqttData(clientCache, expiryCache, d, collection, broker) {
  if (!clientCache.get(d.user)) {
    clientCache.set(d.user, d);
    expiryCache.set(d.user, d);
    d.speed = 0;
    d.status = 2;
  } else {
    if (expiryCache.has(d.user)) {
      clearTimeout(expiryCache.get(d.user));
      expiryCache.delete(d.user);
    }

    let firstData = clientCache.get(d.user);
    clientCache.set(d.user, d);
    expiryCache.set(d.user, d);
    d.speed = parseInt(
      calculateSpeed(
        firstData.lat,
        firstData.lng,
        firstData.timestamp,
        d.lat,
        d.lng,
        d.timestamp
      ).toFixed(0)
    );
    d.status = d.speed > 1 ? 1 : 2;
  }

  console.log(expiryCache);

  // Ensure proper index
  await collection.createIndex({ timestamp: 1, time: 1 }, { unique: true });

  // Insert or update
  await collection.updateOne(
    { user: d.user, timestamp: d.timestamp, time: d.time },
    { $set: d },
    { upsert: true }
  );

  broker.publish({
    topic: `user/processed/${d.user}`,
    payload: Buffer.from(JSON.stringify(d)),
    qos: 0,
    retain: false,
  });

  return "Mqtt data updated...";
}

module.exports = { handleMqttData };
