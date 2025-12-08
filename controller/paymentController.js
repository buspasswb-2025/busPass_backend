import Trip from "../model/trip.schema.js";
import AppError from "../utills/error.js";
import razorpayInstance from "../config/razorpayConfig.js"
import crypto from 'crypto';
import Booking from "../model/booking.schema.js";
import mongoose from "mongoose";
import { getAgg, markSeatsAsReservedInMongo, rebuildRedisLocks } from "../utills/helpingdata.js";
import { isExistLockedTransaction, lockSeats, releaseSeats } from "../services/redisServices.js";
import { seat_ttl } from "../utills/constVariables.js";
import sendEmail from "../utills/sendEmail.js";
import { generateBookingConfirmationMessage } from "../utills/helper.js";
import { io } from "../index.js";




const createOrderAndLockSeat = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Authentication required", 401));

    const { tripId, seats, totalFare, from, to, idempotencyKey } = req.body;
    from.stopId = new mongoose.Types.ObjectId(from._id);
    console.log("from stopId : ", from.stopId);
    delete from._id;
    to.stopId = new mongoose.Types.ObjectId(to._id);
    delete to._id;

    if (!tripId || !Array.isArray(seats) || seats.length === 0 || !totalFare || !from || !to || !idempotencyKey) {
        return next(new AppError("tripId, seats[], totalFare, from, to and idempotencyKey are required", 400));
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const agg = getAgg(tripId, seats);
        const aggResult = await Trip.aggregate(agg, { session });
        if (!aggResult || aggResult.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return next(new AppError("Trip not found", 404));
        }

        const tripInfo = aggResult[0];
        if (tripInfo.conflictCount > 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Some seats are already booked",
                seats: tripInfo.conflictSeatNumbers
            });
        }

        // const existingBooking = await Booking.findOne({ idempotencyKey, trip: tripId, bookedBy: userId }).session(session).lean();
        // if (existingBooking && existingBooking.expireAt.getTime() > Date.now()) {
        //     await session.abortTransaction();
        //     session.endSession();
        //     return res.status(200).json({
        //         success: true,
        //         message: "Booking already exists for this idempotencyKey",
        //         bookingId: existingBooking._id,
        //         reservedSeats: existingBooking.seatNumbers,
        //     });
        // }

        const isPresent = await isExistLockedTransaction(tripId, userId, idempotencyKey);
        if (isPresent.isExistLocked) {
            const releaseResult = await releaseSeats(tripId, userId, idempotencyKey);
            if (!releaseResult.status === "SUCCESS") {
                return res.status(400).json(releaseResult);
            }
        }
        console.log(isPresent);

        // const { locked, failed } = await lockSeats(tripId, seats, userId, 300);

        //----- with error handling
        let lockedSeats = [], failedSeats = [], result;
        try {
            // const { locked: lockedSeats, failed: failedSeats } = await lockSeats(tripId, seats, userId, idempotencyKey, seat_ttl);
            result = await lockSeats(tripId, seats, userId, idempotencyKey, seat_ttl);
            lockedSeats = result.locked;
            failedSeats = result.failed;
            console.log(result);
        } catch (err) {
            console.log(err);
            await session.abortTransaction();
            session.endSession();
            return next(new AppError(err.message, 400));
        }
        //---------

        if (failedSeats && failedSeats.length > 0) {
            if (lockedSeats && lockedSeats.length > 0) {
                await releaseSeats(tripId, seats, userId, idempotencyKey).catch(() => Promise.resolve());
            }
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                message: "Some seats are already reserved by other users",
                result
            });
        }

        const holdMinutes = Number(process.env.SEAT_HOLD_MINUTES || 5);
        const expireAt = new Date(Date.now() + holdMinutes * 60 * 1000);
        // let newBooking;
        // if (!isPresent.isExistLocked) {
        //     [newBooking] = await Booking.create(
        //         [{
        //             trip: new mongoose.Types.ObjectId(tripId),
        //             bookedBy: new mongoose.Types.ObjectId(userId),
        //             seatNumbers: seats,
        //             // from: {
        //             //     stopId: new mongoose.Types.ObjectId(from)
        //             // },
        //             // to: {
        //             //     stopId: new mongoose.Types.ObjectId(to)
        //             // },
        //             from,
        //             to,
        //             farePerSeat: totalFare / seats.length,
        //             totalFare,
        //             paymentStatus: "pending",
        //             idempotencyKey,
        //             expireAt
        //         }],
        //         { session }
        //     );
        // } else {
        //     newBooking = await Booking.findOneAndUpdate(
        //         { tripId, userId, idempotencyKey },      
        //         { $set: { expireAt: expireAt, seatNumbers: seats}, farePerSeat: totalFare / seats.length, totalFare},     
        //         { new: true }                            
        //     ).lean();
        //     console.log("new booking : ",newBooking)
        // }

        let newBooking;

        if (!isPresent.isExistLocked) {
            console.log("new book 1");
            [newBooking] = await Booking.create(
                [{
                    trip: new mongoose.Types.ObjectId(tripId),
                    bookedBy: new mongoose.Types.ObjectId(userId),
                    seatNumbers: seats,
                    from,
                    to,
                    farePerSeat: totalFare / seats.length,
                    totalFare,
                    paymentStatus: "pending",
                    idempotencyKey,
                    expireAt
                }],
                { session }
            );
        } else {
            newBooking = await Booking.findOneAndUpdate(
                {
                    trip: new mongoose.Types.ObjectId(tripId),
                    bookedBy: new mongoose.Types.ObjectId(userId),
                    idempotencyKey
                },
                {
                    $set: {
                        expireAt,
                        seatNumbers: seats,
                        farePerSeat: totalFare / seats.length,
                        totalFare
                    }
                },
                {
                    new: true,
                    session
                }
            );

            console.log("new booking:", newBooking);
        }

        let razorpayOrder;
        try {
            razorpayOrder = await razorpayInstance.orders.create({
                amount: Math.round(totalFare * 100),
                currency: "INR",
                receipt: `receipt_${newBooking._id}`,
                payment_capture: 1,
                notes: { tripId, userId, seats: seats.join(",") }
            });
        } catch (rpErr) {
            await session.abortTransaction();
            session.endSession();
            await releaseSeats(tripId, seats, userId).catch(() => Promise.resolve());
            return next(new AppError("Payment initialization failed: " + (rpErr.message || rpErr), 502));
        }

        await session.commitTransaction();
        session.endSession();

        io.to(tripId).emit('seat_reserved', { seatNumbers: seats, tripId: tripId, userId: userId })

        return res.status(200).json({
            success: true,
            message: "Seats reserved temporarily. Complete payment to confirm booking.",
            bookingId: newBooking._id,
            reservedSeats: seats,
            order: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            },
            expiresAt: expireAt
        });
    } catch (err) {
        try {
            await session.abortTransaction();
        } catch { }
        session.endSession();

        if (Array.isArray(seats) && tripId && req.user?.id) {
            await releaseSeats(tripId, seats, req.user.id).catch(() => Promise.resolve());
        }

        return next(new AppError(err.message || "Booking failed", 500));
    }
};

const verifyPayment = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    let bookingDetails;
    try {
        const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user?.id
        if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return next(new AppError("Missing required fields", 400));
        }
        if (!userId) return next(new AppError("Authentication required", 401));

        bookingDetails = await Booking.findById(bookingId)
            .populate({ path: "bookedBy", select: "email firstName lastName" })
            .session(session);

        if (!bookingDetails) {
            await session.abortTransaction();
            return next(new AppError("Booking not found", 404));
        }

        if (bookingDetails.paymentStatus === "completed") {
            await session.abortTransaction();
            return res.status(200).json({ success: true, message: "Already confirmed" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await releaseSeats(bookingDetails.trip.toString(), userId, bookingDetails.idempotencyKey)
                .catch(() => Promise.resolve());

            await session.abortTransaction();
            return next(new AppError("Invalid payment signature", 400));
        }

        const paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (paymentDetails.amount !== bookingDetails.totalFare * 100) {


            throw new Error("Payment amount mismatch!");
        }

        await Trip.updateOne(
            { _id: bookingDetails.trip },
            {
                $set: {
                    "seatBookings.$[elem].isBooked": "booked",
                    "seatBookings.$[elem].bookedBy": userId,
                    "seatBookings.$[elem].pickupStop": bookingDetails.from,
                    "seatBookings.$[elem].dropStop": bookingDetails.to,
                    "seatBookings.$[elem].booking": bookingDetails._id.toString(),
                    "seatBookings.$[elem].expire": null,
                }
            },
            { arrayFilters: [{ "elem.seatNumber": { $in: bookingDetails.seatNumbers } }], session }
        );

        bookingDetails.paymentStatus = "completed";
        bookingDetails.paymentDetails = {
            ...bookingDetails.paymentDetails,
            paymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            signature: razorpay_signature,
            paymentMethod: {
                method: paymentDetails.method || null,
                card: paymentDetails.card || undefined,
                vpa: paymentDetails.vpa || undefined,
                bank: paymentDetails.bank || undefined,
                wallet: paymentDetails.wallet || undefined,
            },
            paidAt: new Date(paymentDetails.created_at * 1000)
        };
        await bookingDetails.save({ session });

        await releaseSeats(bookingDetails.trip.toString(), userId, bookingDetails.idempotencyKey).catch(() => Promise.resolve());

        await session.commitTransaction();

        const { email, firstName, lastName } = bookingDetails.bookedBy;
        const msg = generateBookingConfirmationMessage(firstName + lastName, bookingDetails);
        await sendEmail(email, msg.subject, msg.html);

        io.to(bookingDetails.trip).emit('seatBooked', { seatNumbers: bookingDetails.seatNumbers, tripId: bookingDetails.trip, userId: userId })

        return res.json({
            success: true,
            message: "Payment verified & booking confirmed",
            bookingId,
            seats: bookingDetails.seatNumbers
        });

    } catch (err) {
        await session.abortTransaction();
        console.error(err.message);

        if (bookingDetails) {
            await releaseSeats(
                bookingDetails.trip,
                bookingDetails.seatNumbers,
                bookingDetails.bookedBy?._id,
                bookingDetails.idempotencyKey
            ).catch(() => Promise.resolve());
        }

        return next(new AppError(err.message || "Payment verification failed", 500));
    } finally {
        session.endSession();
    }
};

const releaseLockedSeats = async (req, res, next) => {
    const { bookingId, tripId, idempotencyKey, seatNumbers } = req.body;
    const userId = req.user?.id;

    try {
        if (!bookingId && (!userId || !tripId || !idempotencyKey || !seatNumbers)) {
            return next(new AppError('all fields are required!, please send all necessary fields', 400))
        }

        if (bookingId) {
            const bookingDetails = await Booking.findById(new mongoose.Types.ObjectId(bookingId));

            if (!bookingDetails) {
                return next(new AppError('Invalid Booking Id', 404));
            }

            const result = await releaseSeats(bookingDetails.trip, bookingDetails.seatNumbers, userId, bookingDetails.idempotencyKey)
            if (!result || result.status === 'FAILED') {
                return res.status(400).json({
                    message: 'Failed to release seats',
                    reason: result?.reason || 'Unknown error',
                    data: result
                });
            }
            console.log(result);

            await Booking.findByIdAndDelete(bookingDetails._id);

            return res.status(200).json({
                message: 'seats are released successfully',
                data: result,
                bookingDetails: bookingDetails
            })
        } else {
            const bookingDetails = await Booking.findOne({ bookedBy: userId, idempotencyKey, trip: new mongoose.Types.ObjectId(tripId), seatNumbers });

            if (!bookingDetails) {
                return next(new AppError('Booking is not exist with these credential', 404));
            }

            // const result = await releaseSeats(bookingDetails.trip, bookingDetails.seatNumbers, userId, bookingDetails.idempotencyKey);
            const result = await releaseSeats(tripId, seatNumbers, userId, idempotencyKey);

            if (!result || result.status === 'FAILED') {
                return res.status(400).json({
                    message: 'Failed to release seats',
                    reason: result?.reason || 'Unknown error',
                    data: result
                });
            }
            console.log(result);

            await Booking.findByIdAndDelete(bookingDetails._id);

            return res.status(200).json({
                message: 'seats are released successfully',
                data: result,
                bookingDetails: bookingDetails
            })
        }
    } catch (err) {
        return next(new AppError(err, 500));
    }

}

const cancelledBooking = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { bookingId } = req.body;
    const userId = req.user.id;
    try {

        const booking = await Booking.findOne({ _id: bookingId, bookedBy: userId }).session(session);
        if (!booking) return next(new AppError("Booking not found", 404));

        if (booking.paymentStatus !== "success") {
            return next(new AppError("Cannot cancel unpaid or failed bookings", 400));
        }

        // Check if already cancelled
        if (booking.status === "cancelled") {
            return next(new AppError("Booking already cancelled", 400));
        }

        // Initiate refund through Razorpay
        const refund = await razorpayInstance.payments.refund(booking.razorpayPaymentId, {
            amount: Math.round(booking.totalFare * 100), // refund amount for now full it should be dynamic
            speed: "optimum",
            notes: {
                reason: "User requested cancellation",
                bookingId: booking._id.toString(),
            },
        });

        // Update booking record
        booking.status = "cancelled";
        booking.refundDetails.id = refund.id;
        booking.refundDetails.status = refund.status;
        booking.refundDetails.amount = refund.amount / 100;
        booking.refundDetails.refundAt = new Date();

        await booking.save({ session });

        // Release seats from trip also
        await Trip.updateOne(
            { _id: booking.trip },
            {
                $set: {
                    "seatBookings.$[elem].isBooked": "available",
                    "seatBookings.$[elem].bookedBy": null,
                    "seatBookings.$[elem].booking": null
                },
                $inc: { availableSeats: booking.seatNumbers.length } // increase available seats
            },
            {
                arrayFilters: [
                    { "elem.seatNumber": { $in: booking.seatNumbers } }
                ],
                new: true
            }
        ).session(session);


        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Booking cancelled and refund initiated successfully",
            refund,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(new AppError("Cancellation failed: " + error.message, 500));
    }
}


export { createOrderAndLockSeat, verifyPayment, releaseLockedSeats, cancelledBooking };