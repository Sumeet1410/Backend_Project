import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../utils/redis.js";

const keyGenerator = (req) => req.user?._id?.toString() || ipKeyGenerator(req);

const createRedisStore = (prefix) => {
    return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix
    });
};

let generalLimiter;
export const getGeneralLimiter = () => {
    if (!generalLimiter) {
        generalLimiter = rateLimit({
            store: createRedisStore("rl:general"),
            windowMs: 60 * 1000,
            max: 100,
            keyGenerator,
            message: "Too many requests, please try again later",
            validate: { creationStack: false }
        });
    }
    return generalLimiter;
};

let authLimiter;
export const getAuthLimiter = () => {
    if (!authLimiter) {
        authLimiter = rateLimit({
            store: createRedisStore("rl:auth"),
            windowMs: 60 * 1000 * 15,
            max: 50,
            keyGenerator,
            message: "Too many login attempts",
            validate: { creationStack: false }
        });
    }
    return authLimiter;
};

let uploadLimiter;
export const getUploadLimiter = () => {
    if (!uploadLimiter) {
        uploadLimiter = rateLimit({
            store: createRedisStore("rl:upload"),
            windowMs: 60 * 1000 * 10,
            max: 50,
            keyGenerator,
            message: "Too many uploads. Please slow down",
            validate: { creationStack: false }
        });
    }
    return uploadLimiter;
};

let commentLimiter;
export const getCommentLimiter = () => {
    if (!commentLimiter) {
        commentLimiter = rateLimit({
            store: createRedisStore("rl:comment"),
            windowMs: 60 * 1000,
            max: 200,
            keyGenerator,
            message: "Too many comments. Please try again later",
            validate: { creationStack: false }
        });
    }
    return commentLimiter;
};