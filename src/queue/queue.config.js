const redisUrl = new URL(process.env.REDIS_URL);

export const connection = {
    url: process.env.REDIS_URL,
    host: redisUrl.hostname,
    port: Number(redisUrl.port),
    username: redisUrl.username,
    password: redisUrl.password,
    tls: {
        servername: redisUrl.hostname,
    },
};