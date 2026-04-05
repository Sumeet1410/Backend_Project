import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app, setUpGeneralLimiter } from "./app.js";   
import redisClient from "./utils/redis.js";
dotenv.config({
  path: "./.env",
});
// console.log("🔥🔥🔥 THIS SERVER FILE IS RUNNING 🔥🔥🔥");
// process.exit(1);
const startServer = async () => {
  try {
    // 1️⃣ DB first
    await connectDB();
    console.log("DB connected");

    // 2️⃣ Redis second
    await redisClient.connect();
    console.log("Redis connected");

    // 3️⃣ Setup limiter AFTER Redis
    setUpGeneralLimiter();

    // 4️⃣ Start server LAST
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`);
    });

  } catch (error) {
    console.error("Startup error:", error);
  }
};

startServer();