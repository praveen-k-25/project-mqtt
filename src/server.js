require("dotenv").config();
const http = require("http");
const aedes = require("aedes");
const ws = require("websocket-stream");
const { connectDB } = require("./database");

connectDB();

const broker = aedes();

const wsServer = http.createServer();
ws.createServer({ server: wsServer }, broker.handle);

broker.on("publish", (packet, client) => {
  console.log("Packet :", packet);
  //console.log("CLient :", client);
});

wsServer.listen(process.env.PORT, () => {
  console.log(`MQTT Server listen to port ${process.env.PORT}`);
});
