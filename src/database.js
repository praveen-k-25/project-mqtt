const mongodb = require("mongodb");
let db;

const connectDB = async () => {
  try {
    const client = new mongodb.MongoClient(process.env.DB_URL);
    await client.connect();
    db = client.db();
  } catch (error) {
    console.log("Error", error);
  }
};

const getDB = () => {
  if (!db) {
    console.log("Database Disconnected ");
    return;
  } else {
    return db;
  }
};

module.exports = { connectDB, getDB };
