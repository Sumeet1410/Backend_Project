import {createClient} from "redis";
const redisClient = createClient({
    url: process.env.REDIS_URL,
    pingInterval: 1000 * 30, // PING every 30s to prevent Upstash from closing idle connection
});
redisClient.on("error",(err)=>{
    console.log("Redis error",err);
});
export default redisClient;