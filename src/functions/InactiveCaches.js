async function handleInactiveCaches(inactiveCache, d, collection) {
  try {
    if (inactiveCache.get(d.user)?.inactiveStart) {
      const cacheData = inactiveCache.get(d.user);
      cacheData.inactiveEnd = Date.now();

      await collection.updateOne(
        { timestamp: cacheData.timestamp, time: cacheData.time },
        { $set: cacheData },
        { upsert: true }
      );

      inactiveCache.delete(d.user);
      return "Inactive Cache updated...";
    }
    return "No data from inactive cache...";
  } catch (err) {
    console.log("Error from Invalid cache : ", err);
  }
}

module.exports = { handleInactiveCaches };
