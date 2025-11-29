import Redis from "ioredis";
import { rebuildRedisLocks } from "../utills/helpingdata.js";

let redis;
let hasRebuilt = false;

export const connectRedis = () => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        console.warn(`Redis reconnect attempt ${times}`);
        return Math.min(100 * 2 ** (times - 1), 2000);
      },
    });

    redis.on("connect", () => {
      console.log("Connected to Redis");
    });

    redis.on("ready", async () => {
      console.log("Redis is ready to use");
      if (!hasRebuilt) {
        try {
          console.log("Rebuilding Redis state (seat locks)...");
          await rebuildRedisLocks(redis);
          hasRebuilt = true;
          console.log("Redis state rebuilt successfully");
        } catch (err) {
          console.error("Failed to rebuild Redis state:", err);
        }
      }
    });

    redis.on("error", (err) => {
      console.error("Redis Error:", err.message);
    });

    redis.on("close", () => {
      console.warn("Redis connection closed");
      hasRebuilt = false;
    });

    redis.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });
  }

  return redis;
};

export default connectRedis();
