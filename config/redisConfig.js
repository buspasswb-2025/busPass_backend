// import Redis from "ioredis";
// import { rebuildRedisLocks } from "../utills/helpingdata.js";

// let redis;
// let hasRebuilt = false;

// export const connectRedis = () => {
//   if (!redis) {
//     redis = new Redis({
//       host: process.env.REDIS_HOST || "127.0.0.1",
//       port: process.env.REDIS_PORT || 6379,
//       password: process.env.REDIS_PASSWORD || undefined,
//       retryStrategy: (times) => {
//         console.warn(`Redis reconnect attempt ${times}`);
//         return Math.min(100 * 2 ** (times - 1), 2000);
//       },
//     });

//     redis.on("connect", () => {
//       console.log("Connected to Redis");
//     });

//     redis.on("ready", async () => {
//       console.log("Redis is ready to use");
//       try {
//         await redis.config("SET", "notify-keyspace-events", "Ex");
//         console.log("Keyspace notifications enabled (Ex)");
//       } catch (err) {
//         console.error("Failed to enable keyspace notifications:", err);
//       }
//       if (!hasRebuilt) {
//         try {
//           console.log("Rebuilding Redis state (seat locks)...");
//           await rebuildRedisLocks(redis);
//           hasRebuilt = true;
//           console.log("Redis state rebuilt successfully");
//         } catch (err) {
//           console.error("Failed to rebuild Redis state:", err);
//         }
//       }
//     });

//     redis.on("error", (err) => {
//       console.error("Redis Error:", err.message);
//     });

//     redis.on("close", () => {
//       console.warn("Redis connection closed");
//       hasRebuilt = false;
//     });

//     redis.on("reconnecting", () => {
//       console.log("Redis reconnecting...");
//     });
//   }

//   return redis;
// };

// export default connectRedis();


import Redis from "ioredis";
import { rebuildRedisLocks } from "../utills/helpingdata.js";
import Booking from "../model/booking.schema.js";
import { io } from "../index.js";

let redis;
let subscriber;
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

    // Create a separate subscriber client for pub/sub
    subscriber = redis.duplicate();

    redis.on("connect", () => {
      console.log("Connected to Redis");
    });

    redis.on("ready", async () => {
      console.log("Redis is ready to use");

      try {
        // Enable keyspace notifications for expired events
        await redis.config("SET", "notify-keyspace-events", "Ex");
        console.log("Keyspace notifications enabled (Ex)");
      } catch (err) {
        console.error("Failed to enable keyspace notifications:", err);
      }

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

      // Setup keyspace notification listener after Redis is ready
      setupExpirationListener();
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

    // Subscriber error handling
    subscriber.on("error", (err) => {
      console.error("Redis Subscriber Error:", err.message);
    });
  }

  return redis;
};

// Setup listener for expired keys
const setupExpirationListener = () => {
  if (!subscriber) {
    console.error("Subscriber not initialized");
    return;
  }

  subscriber.psubscribe("__keyevent@0__:expired", (err, count) => {
    if (err) {
      console.error("Failed to subscribe to expired events:", err);
    } else {
      console.log(`✅ Subscribed to keyspace notifications (${count} pattern(s))`);
    }
  });

  subscriber.on("pmessage", async (pattern, channel, expiredKey) => {
    // Check if expired key is a booking
    if (expiredKey.startsWith("trip:") && expiredKey.includes(":booking:")) {
      try {
        // Parse: trip:123:booking:user456:idempotency123
        const parts = expiredKey.split(":");

        if (parts.length >= 5 && parts[2] === "booking") {
          const tripId = parts[1];
          const userId = parts[3];
          const idempotencyKey = parts[4];

          console.log(`Booking expired for trip ${tripId}, user ${userId}`);

          // Handle the booking expiration (all seats released at once)
          await handleBookingExpired(tripId, userId, idempotencyKey);
        }
      } catch (err) {
        console.error("Error processing expired booking key:", err);
      }
    }
  });
};

// Handler for when a seat becomes available
const handleBookingExpired = async (tripId, userId, idempotencyKey) => {
  try {
    console.log(`Processing booking expiration: trip=${tripId}, user=${userId}`);

    // The seats are already removed from Redis by TTL
    // Now clean up the seat list if needed
    const seatListKey = `trip:${tripId}:seats`;

    // Optional: You might want to check if seat list is empty and clean it
    const remainingSeats = await redis.smembers(seatListKey);
    if (remainingSeats.length === 0) {
      await redis.del(seatListKey);
    }

    asyncBookingHandle(tripId, userId, idempotencyKey);

    // io.to(tripId).emit("seats_released", {
    //   seats: releasedSeats,
    //   tripId,
    // });

} catch (error) {
  console.error(`Failed to handle booking expiration for trip ${tripId}:`, error);
}
};

const asyncBookingHandle = async (tripId, userId, idempotencyKey) => {
  try {
    const bookingDetails = await Booking.findOneAndDelete({
      trip: tripId,
      bookedBy: userId,
      idempotencyKey: idempotencyKey
    })
  } catch (err) {
    console.log('error in cleaning booking details : ', err)
  }
}

// Get the subscriber instance (useful for testing or external access)
export const getSubscriber = () => subscriber;

// Graceful shutdown
export const closeRedis = async () => {
  try {
    if (subscriber) {
      await subscriber.quit();
      console.log("Redis subscriber closed");
    }
    if (redis) {
      await redis.quit();
      console.log("Redis connection closed");
    }
  } catch (err) {
    console.error("Error closing Redis connections:", err);
  }
};

export default connectRedis();