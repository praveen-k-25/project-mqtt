require("dotenv").config();
const http = require("http");
const aedes = require("aedes");
const ws = require("websocket-stream");
const {connectDB, getDB} = require("./database");

connectDB();

const broker = aedes();

const wsServer = http.createServer();
ws.createServer({server: wsServer}, broker.handle);

broker.on("publish", async(packet, client) => {
  try {
    let data = packet.payload.toString();
    let d = JSON.parse(data);
    let db = getDB();
    if (db) {
      let collection = await db.collection("user_locations");
      collection.createIndex({user: 1, timestamp: 1}, {unique: true});
      collection.insertOne(d);  
      console.log("Data Inserted", d);
    }
  } catch (err) {
    console.log("error :", packet.payload.toString());
  }

  //console.log("CLient :", client);
});

wsServer.listen(process.env.PORT, () => {
  console.log(`MQTT Server listen to port ${process.env.PORT}`);
});
