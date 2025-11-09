import Redis from "ioredis";

let redis;

const connectRedis = () => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined, // optional password
      retryStrategy: (times) => {
        console.warn(`Redis reconnect attempt ${times}`);
        return Math.min(100 * 2 ** (times - 1), 2000);
      }
    });

    redis.on("connect", () => console.log("Connected to Redis"));
    redis.on("ready", () => console.log("Redis is ready to use"));
    redis.on("error", (err) => console.error("Redis Error:", err));
    redis.on("close", () => console.warn("Redis connection closed"));
    redis.on("reconnecting", () => console.log("Redis reconnecting..."));
  }

  return redis;
};

export default connectRedis();
