import { createClient } from "redis";

const redisQueueClient = createClient({
  url: process.env.REDIS_URL,
});

redisQueueClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// await redisQueueClient.connect();

export default redisQueueClient;