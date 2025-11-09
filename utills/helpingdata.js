import Booking from "../model/booking.schema.js";
import Trip from "../model/trip.schema.js";
import mongoose from "mongoose";

export const getAgg = (tripId) => ([
  { $match: { _id: mongoose.Types.ObjectId(tripId) } },
  {
    $project: {
      _id: 1,
      conflictSeats: {
        $filter: {
          input: "$seatBookings",
          as: "sb",
          cond: {
            $and: [
              { $in: ["$$sb.seatNumber", seats] },
              {
                $or: [
                  { $eq: ["$$sb.isBooked", "booked"] },
                  { $eq: ["$$sb.isBooked", "reserved"] }
                ]
              }
            ]
          }
        }
      }
    }
  },
  {
    $project: {
      conflictSeatNumbers: {
        $map: {
          input: "$conflictSeats",
          as: "c",
          in: "$$c.seatNumber"
        }
      },
      conflictCount: { $size: "$conflictSeats" }
    }
  }
]);


export const markSeatsAsReservedInMongo = async (tripId, seats, bookingId, userId, session) => {
  const res = await Trip.updateOne(
    { _id: tripId, "seatBookings.seatNumber": { $in: seats } },
    {
      $set: {
        "seatBookings.$[elem].isBooked": "reserved",
        "seatBookings.$[elem].booking": bookingId,
        "seatBookings.$[elem].reservedBy": userId,
        "seatBookings.$[elem].expire": new Date(Date.now() + 5 * 60 * 1000) // 5 min hold
      }
    },
    {
      arrayFilters: [{ "elem.seatNumber": { $in: seats }, "elem.isBooked": "available" }],
      session
    }
  );

  if (res.modifiedCount !== seats.length) {
    throw new Error("Some seats are already booked/reserved");
  }

  return res;
};


export const rebuildRedisLocks = async () => {
  // 1. Find all pending bookings that are not expired
  const now = new Date();
  const bookings = await Booking.find({
    paymentStatus: "pending",
    expireAt: { $gt: now }
  }).lean();

  // 2. For each booking, rebuild seat locks in Redis
  for (const booking of bookings) {
    const ttl = Math.max(0, new Date(booking.expireAt).getTime() - Date.now()) / 1000;
    if (ttl <= 0) continue;

    const lockValue = `${booking.bookedBy}:${booking.idempotencyKey}`;

    for (const seat of booking.seatNumbers) {
      const key = `trip:${booking.trip}:seat:${seat}`;
      await redis.set(key, lockValue, "EX", Math.ceil(ttl));
    }
  }

  console.log(`Redis seat locks rebuilt for ${bookings.length} active bookings`);
};