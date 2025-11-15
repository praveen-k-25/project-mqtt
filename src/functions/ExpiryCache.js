async function handleExpiryCache(
  d,
  clientCache,
  inactiveCache,
  expiryCache,
  collection,
  broker
) {
  // Start a new timer for 15 seconds
  const timer = setTimeout(async () => {
    d.speed = 0;
    d.status = 3;
    d.inactiveStart = Date.now();
    await collection.updateOne(
      {
        user: d.user,
        timestamp: d.timestamp,
        time: d.time,
      },
      { $set: d },
      { upsert: true }
    );
    console.log("cache added");
    inactiveCache.set(d.user, d);
    delete d.inactiveStart;

    broker.publish({
      topic: `user/processed/${d.user}`,
      payload: Buffer.from(JSON.stringify(d)),
      qos: 0,
      retain: false,
    });

    clientCache.delete(d.user);
    expiryCache.delete(d.user);
  }, 15000);

  // Store the timer in the cache
  expiryCache.set(d.user, timer);

  return "expiry Cache updated...";
}

module.exports = { handleExpiryCache };
