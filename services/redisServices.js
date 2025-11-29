import { lockLua, releaseLua } from "../utills/luaScript.js";
import redis from '../config/redisConfig.js';


// const lockSeats = async (tripId, seats, userId, idempotencyKey, ttl = 300) => {
//   const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

//   const result = await redis.eval(
//     lockLua,
//     seatKeys.length,
//     ...seatKeys,
//     userId,
//     idempotencyKey,
//     ttl
//   );

//   let status;
//   let locked = [];
//   let failed = [];

//   if (!Array.isArray(result)) {
//     throw new Error("Unexpected Redis response format");
//   }

//   if (result[0] === "SUCCESS") {
//     status = "SUCCESS";
//     locked = result.slice(1, result.indexOf("|"));
//   } else if (result[1] === "FAILED") {
//     status = "FAILED";
//     failed = result.slice(2);
//   } else {
//     throw new Error(`Unexpected Lua result: ${JSON.stringify(result)}`);
//   }

//   return {
//     status,
//     locked: locked.map(key => parseInt(key.split(":").pop())),
//     failed: failed.map(key => parseInt(key.split(":").pop())),
//     reason:
//       status === "FAILED"
//         ? `Seats ${failed.map(key => key.split(":").pop()).join(", ")} already locked`
//         : null,
//   };
// };


// const releaseSeats = async ( tripId, seats, userId, idempotencyKey ) => {
//   const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

//   const result = await redis.eval(
//     releaseLua,
//     seatKeys.length,
//     ...seatKeys,
//     userId,
//     idempotencyKey
//   );

//   const separatorIndex = result.indexOf("|");
//   const status = result[0];
//   const released = result.slice(1, separatorIndex);
//   const failed = separatorIndex >= 0 ? result.slice(separatorIndex + 1) : [];

//   return {
//     status,
//     released: released.map(key => parseInt(key.split(":").pop())),
//     failed: failed.map(key => parseInt(key.split(":").pop())),
//     reason:
//       failed.length > 0
//         ? `Failed to release seats ${failed.map(k => k.split(":").pop()).join(", ")}`
//         : null,
//   };
// };

const lockSeats = async (tripId, seats, userId, idempotencyKey, ttl = 300) => {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new Error("Seats array cannot be empty");
  }

  const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

  const result = await redis.eval(
    lockLua,
    seatKeys.length,
    ...seatKeys,
    userId,
    idempotencyKey,
    ttl
  );

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error("Unexpected Redis response format");
  }

  const status = result[0];
  const keys = result.slice(1);

  const locked = status === "SUCCESS"
    ? keys.map(key => parseInt(key.split(":").pop()))
    : [];

  const failed = status === "FAILED"
    ? keys.map(key => parseInt(key.split(":").pop()))
    : [];

  return {
    status,
    locked,
    failed,
    reason:
      status === "FAILED"
        ? `Seats ${failed.join(", ")} already locked`
        : null,
  };
};


// const releaseSeats = async (tripId, seats, userId, idempotencyKey) => {
//   const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

//   const result = await redis.eval(
//     releaseLua,
//     seatKeys.length,
//     ...seatKeys,
//     userId,
//     idempotencyKey
//   );

//   if (!Array.isArray(result)) {
//     throw new Error("Unexpected Redis response format from releaseSeats");
//   }

//   let status;
//   let released = [];
//   let failed = [];

//   if (result[0] === "SUCCESS") {
//     status = "SUCCESS";
//     released = result.slice(1, result.indexOf("|"));
//   } else if (result[1] === "FAILED") {
//     status = "FAILED";
//     failed = result.slice(2);
//   } else {
//     throw new Error(`Unexpected Lua result: ${JSON.stringify(result)}`);
//   }

//   const extractSeatNumber = key => {
//     const parts = key.split(":");
//     return Number(parts[parts.length - 1]) || null;
//   };

//   return {
//     status,
//     released: released.map(extractSeatNumber).filter(Boolean),
//     failed: failed.map(extractSeatNumber).filter(Boolean),
//     reason:
//       failed.length > 0
//         ? `Failed to release seats ${failed.map(k => k.split(":").pop()).join(", ")}`
//         : null,
//   };
// };


const releaseSeats = async (tripId, seats, userId, idempotencyKey) => {
  if (!redis) throw new Error("Redis client not initialized");

  const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

  const result = await redis.eval(
    releaseLua,
    seatKeys.length,
    ...seatKeys,
    userId,
    idempotencyKey
  );

  if (!Array.isArray(result)) {
    throw new Error(`Unexpected Redis response: ${JSON.stringify(result)}`);
  }

  const status = result[0];
  const extractSeatNumber = key => Number(key.split(":").pop());

  if (status === "SUCCESS") {
    return {
      status,
      released: result.slice(1).map(extractSeatNumber),
      failed: [],
      reason: null,
    };
  } else if (status === "FAILED") {
    return {
      status,
      released: [],
      failed: result.slice(1).map(extractSeatNumber),
      reason: "One or more seats did not belong to this user. No seats released.",
    };
  } else {
    throw new Error(`Unexpected status from Redis: ${status}`);
  }
};



export { releaseSeats, lockSeats }