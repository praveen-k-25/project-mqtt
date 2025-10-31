require("dotenv").config();
const http = require("http");
const aedes = require("aedes");
const wss = require("websocket-stream");
const { connectDB, getDB } = require("./database");
const { calculateSpeed } = require("./haversineDistance");

connectDB();
const broker = aedes();
const wsServer = http.createServer();
wss.createServer({ server: wsServer }, broker.handle);

const clientCache = new Map();
const expiryCache = new Map();

broker.on("publish", async (packet, client) => {
  if (!client) return;
  try {
    let data = packet.payload.toString();
    let d = JSON.parse(data);
    let db = getDB();
    if (db) {
      const collection = db.collection("user_locations_test");

      if (!clientCache.get(d.user)) {
        clientCache.set(d.user, d);
        expiryCache.set(d.user, d);
        d.speed = 0;
        d.status = "active";
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
        d.status = d.speed > 1 ? "moving" : "active";
        console.log(d.speed);
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

      // Start a new timer for 10 seconds
      const timer = setTimeout(async () => {
        d.speed = 0;
        d.status = "inactive";
        await collection.updateOne(
          { user: d.user, timestamp: d.timestamp, time: d.time },
          { $set: d },
          { upsert: true }
        );
        clientCache.delete(d.user);
        expiryCache.delete(d.user);
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
