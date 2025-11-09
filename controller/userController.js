import User from "../model/user.schema.js";
import AppError from "../utills/error.js";
import emailValidator from 'email-validator';
import { calculateFare, generateOTP, generateOTPMessage, timeToMinutes } from "../utills/helper.js";
import sendEmail from "../utills/sendEmail.js";
import JWT from 'jsonwebtoken';
import Bus from "../model/bus.schema.js";
import Stop from "../model/stop.schema.js";
import Trip from "../model/trip.schema.js";
import { BusAheadTime, standardTimeOptions } from "../utills/constVariables.js";
import mongoose from "mongoose";


const signup = async (req, res, next) => {
    const { email } = req.body;
    try {
        if (!email) {
            return next(new AppError("email is required", 400));
        }

        let user = await User.findOne({ email: email });

        if (!user) {
            user = new User({ email: email });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

        console.log(otp);

        if (user) {
            user.verificationOTP = otp;
            user.VerificationOTPExpiry = otpExpiry;
        } else {
            user = await User.create({
                email: email,
                verificationOTP: otp,
                VerificationOTPExpiry: otpExpiry
            })
        }

        await user.save();

        const message = await generateOTPMessage(user.firstName, otp);
        await sendEmail(email, message.subject, message.html);

        res.status(201).json({
            success: true,
            message: "otp is send to your email!",
        })

    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

// const verifyEmail = async (req, res, next) => {
//     const {email, otp} = req.body;

//     try {
//         if(!email || !otp){
//             return next(new AppError("Every field is required!"), 400);
//         }

//         const user = await User.findOne({email: email});
//         if(!user){
//             return next(new AppError("User is not exist!"), 400);
//         }

//         if(user.isEmailVerified){
//             return next(new AppError("User is already verified!", 404));
//         }

//         if(user.verificationOTP !== otp){
//             return next(new AppError("Invalid OTP!", 400));
//         }

//         if(user.VerificationOTPExpiry < new Date()){
//             return next(new AppError("OTP has been expired!", 400));
//         }

//         user.isEmailVerified = true;
//         user.type = 'user';
//         user.verificationOTP = undefined;
//         user.VerificationOTPExpiry = undefined;

//         const accessToken = await user.generateAccessToken();
//         const refreshToken = await user.generateRefreshToken();

//         user.refreshToken = refreshToken;

//         await user.save();

//         // res.cookie('token', token, {
//         //     maxAge: 7 * 24 * 60 * 60 * 1000,
//         //     httpOnly: true
//         // })

//         res.status(201).json({
//             success: true,
//             message: "signup is successful!",
//             data: {
//                 accessToken: accessToken,
//                 refreshToken: refreshToken
//             }
//         })
//     } catch (error) {
//         return next(new AppError(error.message, 400));
//     }
// }

// const login = async (req, res, next) => {
//     const {email} = req.body;

//     try {
//         if(!email){
//             return next(new AppError("email is required!", 400));
//         }

//         const user = await User.findOne({email: email, isEmailVerified: true});
//         if(!user){
//             return next(new AppError("User does't exist!", 400));
//         }

//         const otp = generateOTP();
//         const otpExpiry = Date(Date.now() + 15 * 60 * 1000);

//         user.verificationOTP = otp;
//         user.VerificationOTPExpiry = otpExpiry;

//         await user.save();

//         const message = generateOTPMessage(user.name || undefined, otp);
//         await sendEmail(email, message.subject, message.html);

//         res.status(201).json({
//             success: true,
//             message: "OTP is send to your registered email",
//         })
//     } catch (error) {
//         return next(new AppError(error.message, 400));
//     }
// }

const verifyOTP = async (req, res, next) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return next("every field is required!", 400);
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return next(new AppError("User is not exist!", 400));
        }

        if (user.verificationOTP !== otp) {
            return next(new AppError("Invalid OTP", 400));
        }

        if (user.VerificationOTPExpiry < new Date()) {
            user.verificationOTP = undefined;
            user.VerificationOTPExpiry = undefined;
            await user.save();
            return next(new AppError("OTP has been expired!, please try again", 400));
        }

        user.verificationOTP = undefined;
        user.VerificationOTPExpiry = undefined;

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({
            success: true,
            message: "login successfull",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: user
            }
        })
    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

const resendOTP = async (req, res, next) => {
    const { email } = req.body;

    try {
        if (!email) {
            return next(new AppError("email is required!", 400));
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return next(new AppError("User does't exist!", 400));
        }

        const otp = generateOTP();
        const otpExpiry = Date(Date.now() + 15 * 60 * 1000);

        user.verificationOTP = otp;
        user.VerificationOTPExpiry = otpExpiry;

        await user.save();

        const message = generateOTPMessage(user.name || undefined, otp);
        await sendEmail(email, message.subject, message.html);

        res.status(201).json({
            success: true,
            message: "OTP is send to your registered email"
        })
    } catch (error) {
        return next(new AppError(error.message, 404));
    }
}

const refreshAccessToken = async (req, res, next) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) {
            return next(new AppError("refresh token is required", 400));
        }

        const verifiedToken = await JWT.verify(refreshToken, REFRESH_TOKEN_SECRET);

        const user = await User.findById(verifiedToken.id);
        if (!user || refreshToken !== user.refreshToken) {
            return next(new AppError("Invalid token", 400));
        }

        const newAccessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;

        await user.save();

        return res.status(201).json({
            success: true,
            message: "refresh access token successfully",
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            }
        })

    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

const logout = async (req, res, next) => {
    try {
        const { id } = req.user;

        const user = await User.findById(id);

        if (!user) {
            return next(new AppError('user not found!', 400));
        }

        user.refreshToken = undefined;

        await user.save();
        res.status(201).json({
            success: true,
            message: "logout successful!",
            data: {
                accessToken: null,
                refreshToken: null
            }
        })
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
}

const getProfile = async (req, res, next) => {
    try {
        const { id } = req.user;

        const user = await User.findById(id);

        if (!user) {
            return next(new AppError('User does not exist!', 400));
        }

        user.refreshToken = undefined;

        res.status(201).json({
            success: true,
            data: user
        })
    } catch (e) {
        return next(new AppError(e.message, 400));
    }
}

const updateProfile = async (req, res, next) => {
    const { id } = req.user;
    const { firstName, lastName, phone, email, address, pin, avatar } = req.body;

    if (!firstName && !lastName && !phone && !email && !address && !pin && !avatar) {
        return next(new AppError('Please provide at least one field to update', 400));
    }

    const user = await User.findById(id);
    if (!user) {
        return next(new AppError('user not found', 400));
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.contact_no = phone;
    if (email) user.email = email;
    if (address) user.address = address;
    if (pin) user.pin = pin;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(201).json({
        success: true,
        message: "Profile updated successfully!",
        data: user
    })
}

const getAllStops = async (req, res, next) => {
    try {
        const stops = await Stop.find();

        if (!stops || stops.length === 0) {
            return next(new AppError('Stops not found!', 404));
        }

        return res.status(200).json({
            success: true,
            data: stops
        });
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};


const oldSearch = async (req, res, next) => {
    try {
        const { datetime, from, to, distance, persons } = req.body;

        console.log(datetime)
        // const inputDateTime = new Date(datetime);
        // const inputDateTime = new Date(datetime);
        // console.log("get time : ",inputDateTime.getTime());
        // const now = new Date();
        // const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // console.log(today);
        // const inputDay = new Date(inputDateTime.getFullYear(), inputDateTime.getMonth(), inputDateTime.getDate());
        // console.log(inputDay)

        const nowTime = new Date(Date.now());
        const year = nowTime.getFullYear();
        const month = nowTime.getMonth();
        const day = nowTime.getDate();

        if (inputDay < today) {
            return next(new AppError('Invalid date', 400));
        }

        const farePerPerson = calculateFare(distance);
        const datePart = inputDateTime.toISOString().split('T')[0];

        let buses;
        if (inputDay > today) {
            buses = await Bus.aggregate([
                // { $match: { status: "active", isVerified: true } },
                { $match: { "stops.name": { $all: [from, to] } } },
                {
                    $addFields: {
                        fare: farePerPerson * persons
                    }
                }
            ]);
            return res.status(201).json({
                success: true,
                buses: buses
            })
        }

        // const cutoff = new Date(inputDateTime.getTime() + 30 * 60 * 1000);
        // const cutoff = new Date(inputDateTime.getTime() + 30 * 60 * 1000);
        const cutoff = new Date(Date.now() + 30 * 60 * 1000);
        const cutoffTimeIST = cutoff.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        buses = await Bus.aggregate([
            // {$match: { status: "active", isVerified: true}},
            { $match: { "stops.name": { $all: [from, to] } } },
            {
                $addFields: {
                    // upStartDate: {
                    //     $dateFromString: { dateString: { $concat: [datePart, " ", "$up.start.time"] } }
                    // },
                    // downStartDate: {
                    //     $dateFromString: { dateString: { $concat: [datePart, " ", "$down.start.time"] } }
                    // },
                    fare: farePerPerson * persons
                }
            },
            { $match: { $or: [{ upStartDate: { $gte: cutoffTimeIST } }, { downStartDate: { $gte: cutoffTimeIST } }] } }
        ]);

        return res.status(200).json({
            success: true,
            data: buses
        })
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
}

const search = async (req, res, next) => {

    // const { date, from, to, distance, persons } = req.body; --re
    const { date, busSearchTime } = req.body;
    const from = new mongoose.Types.ObjectId(req.body.from);
    const to = new mongoose.Types.ObjectId(req.body.to);

    const inputDate = new Date(date);
    const today = new Date();

    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const inputOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());

    let buses;

    if (inputOnly.getTime() < todayOnly.getTime()) {

        console.log("It's a past date");
        return next(new AppError('Invalid date', 400));

    } else if (inputOnly.getTime() > todayOnly.getTime() || !date) {
        console.log("It's a future date");

        buses = await Bus.aggregate([
            // { $match: { status: "active", isVerified: true } },
            {
                $match: { "stops.stopId": { $all: [from, to] } }
            },
            {
                $addFields: {
                    fromIndex: { $indexOfArray: ["$stops.stopId", from] },
                    toIndex: { $indexOfArray: ["$stops.stopId", to] }
                }
            },
            {
                $match: {
                    fromIndex: { $ne: -1 },
                    toIndex: { $ne: -1 }
                }
            },
            {
                $project: {
                    fullBus: "$$ROOT",
                    directions: [
                        {
                            type: "up",
                            startTime: "$up.startTime.timeInMin",
                            endTime: "$up.endTime.timeInMin",
                            valid: { $lt: ["$fromIndex", "$toIndex"] }
                        },
                        {
                            type: "down",
                            startTime: "$down.startTime.timeInMin",
                            endTime: "$down.endTime.timeInMin",
                            valid: { $gt: ["$fromIndex", "$toIndex"] }
                        }
                    ]
                }
            },
            { $unwind: "$directions" },
            {
                $match: {
                    "directions.valid": true
                }
            },
            {
                $sort: { "directions.startTime": 1 }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$fullBus",
                            {
                                direction: "$directions.type",
                                startTime: "$directions.startTime",
                                endTime: "$directions.endTime"
                            }
                        ]
                    }
                }
            }
        ]);

    } else { // with Date
        console.log("It's today");

        // const busTime = new Date(today.getTime() + BusAheadTime); --re
        // const busTimeInIST = busTime.toLocaleTimeString('en-US', standardTimeOptions); --re
        console.log()
        const minutes = timeToMinutes(busSearchTime) + BusAheadTime;
        console.log(minutes);

        buses = await Bus.aggregate([
            // { $match: { status: "active", isVerified: true } },
            {
                $match: { "stops.stopId": { $all: [from, to] } }
            },

            {
                $lookup: {
                    from: "busstoplists",
                    localField: "stops.stopId",
                    foreignField: "_id",
                    as: "stopDetails"
                }
            },

            {
                $addFields: {
                    fromIndex: { $indexOfArray: ["$stops.stopId", from] },
                    toIndex: { $indexOfArray: ["$stops.stopId", to] }
                }
            },
            {
                $project: {
                    fullBus: "$$ROOT",
                    directions: [
                        {
                            type: "up",
                            startTime: "$up.startTime.timeInMin",
                            endTime: "$up.endTime.timeInMin",
                            valid: { $lt: ["$fromIndex", "$toIndex"] }
                        },
                        {
                            type: "down",
                            startTime: "$down.startTime.timeInMin",
                            endTime: "$down.endTime.timeInMin",
                            valid: { $gt: ["$fromIndex", "$toIndex"] }
                        }
                    ]
                }
            },
            { $unwind: "$directions" },
            {
                $match: {
                    "directions.valid": true,
                    $expr: { $gt: ["$directions.startTime", minutes] }
                }
            },
            // {
            //     $addFields: {
            //         diff: { $subtract: ["$directions.startTime", minutes] }
            //     }
            // },
            // {
            //     $sort: { diff: 1 }
            // },
            {
                $sort: { "directions.startTime": 1 }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$fullBus",
                            {
                                direction: "$directions.type",
                                startTime: "$directions.startTime",
                                endTime: "$directions.endTime",
                                // diff: "$diff"
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    stops: 0
                }
            }
        ]);

        // buses = await Bus.aggregate([
        //     // Match buses that have both stops
        //     {
        //         $match: { "stops.stopId": { $all: [from, to] } }
        //     },

        //     // Lookup to populate stop details
        //     {
        //         $lookup: {
        //             from: "busstoplists",
        //             localField: "stops.stopId",
        //             foreignField: "_id",
        //             as: "stopDetails"
        //         }
        //     },

        //     // Replace stops with full details
        //     {
        //         $addFields: {
        //             stops: {
        //                 $map: {
        //                     input: "$stops",
        //                     as: "s",
        //                     in: {
        //                         $mergeObjects: [
        //                             "$$s",
        //                             {
        //                                 $arrayElemAt: [
        //                                     {
        //                                         $filter: {
        //                                             input: "$stopDetails",
        //                                             as: "sd",
        //                                             cond: { $eq: ["$$sd._id", "$$s.stopId"] }
        //                                         }
        //                                     },
        //                                     0
        //                                 ]
        //                             }
        //                         ]
        //                     }
        //                 }
        //             }
        //         }
        //     },

        //     // Remove temporary stopDetails array
        //     { $project: { stopDetails: 0 } },

        //     // Compute fromIndex and toIndex
        //     {
        //         $addFields: {
        //             fromIndex: { $indexOfArray: ["$stops.stopId", from] },
        //             toIndex: { $indexOfArray: ["$stops.stopId", to] }
        //         }
        //     },

        //     // Create directions array
        //     {
        //         $addFields: {
        //             directions: [
        //                 {
        //                     type: "up",
        //                     startTime: "$up.startTime.timeInMin",
        //                     endTime: "$up.endTime.timeInMin",
        //                     valid: { $lt: ["$fromIndex", "$toIndex"] }
        //                 },
        //                 {
        //                     type: "down",
        //                     startTime: "$down.startTime.timeInMin",
        //                     endTime: "$down.endTime.timeInMin",
        //                     valid: { $gt: ["$fromIndex", "$toIndex"] }
        //                 }
        //             ]
        //         }
        //     },

        //     // Unwind directions
        //     { $unwind: "$directions" },

        //     // Filter valid directions & after current time
        //     {
        //         $match: {
        //             "directions.valid": true,
        //             $expr: { $gt: ["$directions.startTime", minutes] }
        //         }
        //     },

        //     // Sort by startTime
        //     { $sort: { "directions.startTime": 1 } },

        //     // Merge directions into root
        //     {
        //         $replaceRoot: {
        //             newRoot: {
        //                 $mergeObjects: [
        //                     "$$ROOT",
        //                     {
        //                         direction: "$directions.type",
        //                         startTime: "$directions.startTime",
        //                         endTime: "$directions.endTime"
        //                     }
        //                 ]
        //             }
        //         }
        //     },

        //     // Remove the old directions array
        //     { $project: { directions: 0 } }
        // ]);

        console.log(buses);
    }

    return res.status(200).json({
        success: true,
        data: buses
    })
}


const getTrip = async (req, res, next) => {
    try {
        const { busId, date, fromStop, toStop } = req.body;

        if (!busId || !date || !fromStop || !toStop) {
            return next(new AppError("All fields are required", 400));
        }

        const tripDate = new Date(date);
        tripDate.setHours(0, 0, 0, 0);

        const bus = await Bus.findById(busId);
        if (!bus) return next(new AppError("Bus not found", 404));

        const fromIndex = bus.stops.findIndex(s => s.name === fromStop);
        const toIndex = bus.stops.findIndex(s => s.name === toStop);

        if (fromIndex === -1 || toIndex === -1)
            return next(new AppError("Stop not found in bus", 400));

        const direction = fromIndex < toIndex ? 'up' : 'down';

        const startTime = direction === 'up' ? bus.up.start.time : bus.down.start.time;
        const endTime = direction === 'up' ? bus.up.end.time : bus.down.end.time;

        const existingTrip = await Trip.findOne({
            bus: busId,
            date: tripDate,
            startTime,
        });

        if (existingTrip) {
            return res.status(200).json({
                success: true,
                trip: existingTrip,
            });
        }

        // Generate seat bookings
        const seatBookings = [];
        for (let i = 1; i <= bus.numberOfSeats; i++) {
            seatBookings.push({
                seatNumber: i,
                isBooked: 'available',
            });
        }

        const newTrip = await Trip.create({
            bus: bus._id,
            date: tripDate,
            startTime,
            endTime,
            totalSeats: bus.numberOfSeats,
            availableSeats: bus.numberOfSeats,
            seatBookings,
        });

        return res.status(201).json({
            success: true,
            message: 'Trip created successfully',
            trip: newTrip,
        });

    } catch (err) {
        return next(new AppError(err.message, 500));
    }
}

const deleteAccount = async (req, res, next) => {
    const { id } = req.user;

    try {
        const userDetails = await User.findById(id);

        if (!userDetails) {
            return next(new AppError('User does not exist', 400));
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Account is successfully deleted'
        })
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
}



export { signup, verifyOTP, resendOTP, refreshAccessToken, logout, getProfile, search, getAllStops, updateProfile, getTrip, deleteAccount };