require("dotenv").config();
const http = require("http");
const aedes = require("aedes");
const wss = require("websocket-stream");
const { connectDB, getDB } = require("./database");
const { calculateSpeed } = require("./haversineDistance");
const { handleInactiveCaches } = require("./functions/InactiveCaches");
const { handleExpiryCache } = require("./functions/ExpiryCache");
const { handleMqttData } = require("./functions/DataHandling");

connectDB();
const broker = aedes({
  // heartbeatInterval: 1000 * 5, // optional: check clients every 5 seconds
  authenticate: (client, username, password, callback) => {
    const authorized =
      username === process.env.VITE_MQTT_USERNAME &&
      password?.toString() === process.env.VITE_MQTT_PASSWORD;

    if (authorized) {
      client.user = username;
      callback(null, true); // ✅ accepted
    } else {
      console.warn(`❌ MQTT authentication failed for user: ${username}`);
      const error = new Error("Authentication failed");
      error.returnCode = 4; // Bad username/password
      callback(error, false); // ❌ rejected
    }
  },
});

const wsServer = http.createServer();
wss.createServer({ server: wsServer }, broker.handle);

const clientCache = new Map();
const expiryCache = new Map();
const inactiveCache = new Map();

broker.on("publish", async (packet, client) => {
  if (!client) return;
  try {
    let data = packet.payload.toString();
    let d = JSON.parse(data);
    let db = getDB();
    if (db) {
      const collection = await db.collection("test_location");

      if (inactiveCache.get(d.user)) {
        const cacheData = inactiveCache.get(d.user);
        cacheData.inactiveEnd = Date.now();
        cacheData.activeLat = d.lat;
        cacheData.activeLng = d.lng;
        await collection.updateOne(
          { user: cacheData.user, inactiveStart: cacheData.inactiveStart },
          { $set: cacheData },
          { upsert: true }
        );
        inactiveCache.delete(d.user);
      }

      /*  async function userDataHandler() {
        const [inactive, expiry, client] = await Promise.all([
          handleInactiveCaches(inactiveCache, d, collection),
          handleExpiryCache(
            d,
            clientCache,
            inactiveCache,
            expiryCache,
            collection,
            broker
          ),
          handleMqttData(clientCache, expiryCache, d, collection, broker),
        ]);

        console.log(clientCache, expiryCache, inactiveCache);

        console.log("-------------------------------");
      }

      userDataHandler(); */

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

      // Ensure proper index
      await collection.createIndex(
        { user: 1, timestamp: 1, time: 1 },
        { unique: true }
      );

      // Insert or update
      await collection.updateOne(
        { user: d.user, timestamp: d.timestamp, time: d.time },
        { $set: d },
        { upsert: true }
      );

      // Start a new timer for 15 seconds
      const timer = setTimeout(async () => {
        d.speed = 0;
        d.status = 3;

        broker.publish({
          topic: `user/processed/${d.user}`,
          payload: Buffer.from(JSON.stringify(d)),
          qos: 0,
          retain: false,
        });

        clientCache.delete(d.user);
        expiryCache.delete(d.user);

        // Inactive cache handling
        d.inactiveStart = Date.now();
        d.inactiveLat = d.lat;
        d.inactiveLng = d.lng;
        delete d.lat;
        delete d.lng;
        await collection.updateOne(
          {
            user: d.user,
            timestamp: d.timestamp,
            time: d.time,
          },
          { $set: d },
          { upsert: true }
        );
        inactiveCache.set(d.user, d);
      }, 15000);

      // Store the timer in the cache
      expiryCache.set(d.user, timer);

      broker.publish({
        topic: `user/processed/${d.user}`,
        payload: Buffer.from(JSON.stringify(d)),
        qos: 0,
        retain: false,
      });
    }
  } catch (err) {
    console.error("authorizePublish error:", err);
  }
});

wsServer.listen(process.env.PORT, () => {
  console.log(`MQTT Server listen to port ${process.env.PORT}`);
});
