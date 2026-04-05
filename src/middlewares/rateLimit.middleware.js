import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../utils/redis.js"

const keyGenerator = (req)=> req.user?._id?.toString() || ipKeyGenerator(req);
const createRedisStore=(prefix)=>{
    return new RedisStore({
        sendCommand:(...args) => redisClient.sendCommand(args),
        prefix
    })
}
export const getGeneralLimiter = ()=>
    rateLimit({
    store:createRedisStore("rl:general"),
    windowMs:60*1000,
    max:100,
    keyGenerator,
    message:"Too many requests, please try again later"
    });

export const getAuthLimiter= () => rateLimit({
    store:createRedisStore("rl:auth"),
    windowMs:60*1000*15,
    max:5,
    keyGenerator,
    message:"Too many login attempts"
})
export const getUploadLimiter= () => rateLimit({
    store:createRedisStore("rl:upload"),
    windowMs:60*1000*10,
    max:5,
    keyGenerator,
    message:"Too many uploads. Please slow down"
})
export const getCommentLimiter= () => rateLimit({
    store:createRedisStore("rl:comment"),
    windowMs:60*1000,
    max:20,
    keyGenerator,
    message:"Too many comments. Please try again later"    
})