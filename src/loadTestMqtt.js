// loadTest.js
const mqtt = require("mqtt");

function loadTestMqtt() {
  const BROKER_URL = "wss://project-mqtt-r2pa.onrender.com";
  const NUM_CLIENTS = 100; // Increase if needed
  const MESSAGES_PER_CLIENT = 10000;
  const MESSAGE_INTERVAL_MS = 500;

  console.log(`🚀 Starting MQTT Load Test with ${NUM_CLIENTS} clients...`);

  for (let i = 0; i < NUM_CLIENTS; i++) {
    createClient(i);
  }

  function createClient(index) {
    const clientId = `client_${index}_${Math.random().toString(16).slice(2)}`;
    const client = mqtt.connect(BROKER_URL, {
      clientId,
      //reconnectPeriod: 5000, // Disable auto reconnect for testing
    });

    console.log("📡 Client id connected ", index);

    let sent = 0;
    let interval = null;

    client.on("connect", () => {
      interval = setInterval(() => {
        if (!client.connected) return; // ✅ prevent publish after disconnect

        const payload = JSON.stringify({
          clientId,
          timestamp: Date.now(),
          lat: 12.9716 + Math.random() * 0.01,
          lng: 77.5946 + Math.random() * 0.01,
          speed: Math.random() * 80,
        });

        client.publish("test/topic", payload, { qos: 0 }, (err) => {
          if (err) console.error(`${clientId} publish error:`, err.message);
        });

        sent++;
        if (sent >= MESSAGES_PER_CLIENT) {
          clearInterval(interval);
          setTimeout(() => {
            console.log(`🛑 ${clientId} completed and closing connection`);
            client.end();
          }, 1000); // Graceful close delay
        }
      }, MESSAGE_INTERVAL_MS);
    });

    client.on("close", () => {
      clearInterval(interval);
      console.log(`❌ ${clientId} connection closed`);
    });

    client.on("error", (err) => {
      console.error(`${clientId} connection error:`, err.message);
      client.end(true);
    });
  }
}

loadTestMqtt();
