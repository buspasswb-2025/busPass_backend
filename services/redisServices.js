import { lockLua, releaseLua } from "../utills/luaScript.js";
import redis from '../config/redisConfig.js';


const lockSeats = async (tripId, seats, userId, idempotencyKey, ttl = 300) => {
  const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

  const result = await redis.eval(
    lockLua,
    seatKeys.length,
    ...seatKeys,
    userId,
    idempotencyKey,
    ttl
  );

  const separatorIndex = result.indexOf("|");
  const status = result[0];
  const locked = status === "SUCCESS" ? result.slice(1, separatorIndex) : [];
  const failed = status === "FAILED" ? result.slice(separatorIndex + 1) : [];

  return {
    status,
    locked: locked.map(key => parseInt(key.split(":").pop())),
    failed: failed.map(key => parseInt(key.split(":").pop())),
    reason:
      status === "FAILED"
        ? `Seats ${failed.map(key => key.split(":").pop()).join(", ")} already locked`
        : null,
  };
};


const releaseSeats = async ( tripId, seats, userId, idempotencyKey ) => {
  const seatKeys = seats.map(seat => `trip:${tripId}:seat:${seat}`);

  const result = await redis.eval(
    releaseLua,
    seatKeys.length,
    ...seatKeys,
    userId,
    idempotencyKey
  );

  const separatorIndex = result.indexOf("|");
  const status = result[0];
  const released = result.slice(1, separatorIndex);
  const failed = separatorIndex >= 0 ? result.slice(separatorIndex + 1) : [];

  return {
    status,
    released: released.map(key => parseInt(key.split(":").pop())),
    failed: failed.map(key => parseInt(key.split(":").pop())),
    reason:
      failed.length > 0
        ? `Failed to release seats ${failed.map(k => k.split(":").pop()).join(", ")}`
        : null,
  };
};


export { releaseSeats, lockSeats }