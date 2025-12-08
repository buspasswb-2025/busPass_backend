// import { lockLua, releaseLua } from "../utills/luaScript.js";
// import redis from '../config/redisConfig.js';

// const lockSeats = async (tripId, seats, userId, idempotencyKey, ttl = 300) => {
//   if (!Array.isArray(seats) || seats.length === 0) {
//     throw new Error("Seats array cannot be empty");
//   }

//   const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

//   const result = await redis.eval(
//     lockLua,
//     seatKeys.length,
//     ...seatKeys,
//     userId,
//     idempotencyKey,
//     ttl
//   );

//   if (!Array.isArray(result) || result.length === 0) {
//     throw new Error("Unexpected Redis response format");
//   }

//   const status = result[0];
//   const keys = result.slice(1);

//   const locked = status === "SUCCESS"
//     ? keys.map(key => parseInt(key.split(":").pop()))
//     : [];

//   const failed = status === "FAILED"
//     ? keys.map(key => parseInt(key.split(":").pop()))
//     : [];

//   return {
//     status,
//     locked,
//     failed,
//     reason:
//       status === "FAILED"
//         ? `Seats ${failed.join(", ")} already locked`
//         : null,
//   };
// };

// const releaseSeats = async (tripId, seats, userId, idempotencyKey) => {
//   if (!redis) throw new Error("Redis client not initialized");

//   const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

//   const result = await redis.eval(
//     releaseLua,
//     seatKeys.length,
//     ...seatKeys,
//     userId,
//     idempotencyKey
//   );

//   if (!Array.isArray(result)) {
//     throw new Error(`Unexpected Redis response: ${JSON.stringify(result)}`);
//   }

//   const status = result[0];
//   const extractSeatNumber = key => Number(key.split(":").pop());

//   if (status === "SUCCESS") {
//     return {
//       status,
//       released: result.slice(1).map(extractSeatNumber),
//       failed: [],
//       reason: null,
//     };
//   } else if (status === "FAILED") {
//     return {
//       status,
//       released: [],
//       failed: result.slice(1).map(extractSeatNumber),
//       reason: "One or more seats did not belong to this user. No seats released.",
//     };
//   } else {
//     throw new Error(`Unexpected status from Redis: ${status}`);
//   }
// };



// export { releaseSeats, lockSeats }


import { lockLua, releaseLua } from "../utills/luaScript.js";
import redis from '../config/redisConfig.js';

const lockSeats = async (tripId, seats, userId, idempotencyKey, ttl = 300) => {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new Error("Seats array cannot be empty");
  }

  // Single booking key instead of per-seat keys
  const bookingKey = `trip:${tripId}:booking:${userId}:${idempotencyKey}`;
  const seatListKey = `trip:${tripId}:seats`;

  const result = await redis.eval(
    lockLua,
    2, // Number of keys
    bookingKey,
    seatListKey,
    userId,
    ttl,
    ...seats  // Pass seat numbers as remaining arguments
  );

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error("Unexpected Redis response format");
  }

  const status = result[0];
  const seatNumbers = result.slice(1).map(s => parseInt(s));

  return {
    status,
    locked: status === "SUCCESS" ? seatNumbers : [],
    failed: status === "FAILED" ? seatNumbers : [],
    bookingKey: status === "SUCCESS" ? bookingKey : null,
    reason: status === "FAILED" 
      ? `Seats ${seatNumbers.join(", ")} already locked`
      : null,
  };
};

const releaseSeats = async (tripId, userId, idempotencyKey) => {
  if (!redis) throw new Error("Redis client not initialized");

  const bookingKey = `trip:${tripId}:booking:${userId}:${idempotencyKey}`;
  const seatListKey = `trip:${tripId}:seats`;

  const result = await redis.eval(
    releaseLua,
    2,
    bookingKey,
    seatListKey,
    userId
  );

  if (!Array.isArray(result)) {
    throw new Error(`Unexpected Redis response: ${JSON.stringify(result)}`);
  }

  const status = result[0];

  if (status === "SUCCESS") {
    const releasedSeats = result.slice(1).map(s => parseInt(s));
    return {
      status,
      released: releasedSeats,
      failed: [],
      reason: null,
    };
  } else {
    return {
      status,
      released: [],
      failed: [],
      reason: result[1] || "Release failed",
    };
  }
};

const getLockedSeatsDetails = async (tripId) => {
  try {
    const seatListKey = `trip:${tripId}:seats`;
    
    // Get all locked seat numbers
    const lockedSeatNumbers = (await redis.smembers(seatListKey)).map(Number);
    console.log(lockedSeatNumbers);
    
    return lockedSeatNumbers;
  }catch(err){
    console.log('error in getting locked seats : ', err);
  }
}

const isExistLockedTransaction = async (tripId, userId, idempotencyKey) => {
  const bookingKey = `trip:${tripId}:booking:${userId}:${idempotencyKey}`;
  
  const bookingData = await redis.get(bookingKey);
  if(!bookingData){
    return {
      isExistLocked: false
    }
  }
  
  const booking = JSON.parse(bookingData);
  return {
    isExistLocked: true,
    booking
  }
}

export { releaseSeats, lockSeats, getLockedSeatsDetails, isExistLockedTransaction };