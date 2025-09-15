import User from "../model/user.schema.js";
import AppError from "../utills/error.js";
import emailValidator from 'email-validator';
import { calculateFare, generateOTP, generateOTPMessage } from "../utills/helper.js";
import sendEmail from "../utills/sendEmail.js";
import JWT from 'jsonwebtoken';
import Bus from "../model/bus.schema.js";
import Stop from "../model/stop.schema.js";


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

        const message = generateOTPMessage(otp);
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

        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        })

        res.status(201).json({
            success: true,
            message: "login successfull",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken
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

        const driver = await User.findById(id);

        if (!driver) {
            return next(new AppError('User does not exist!', 400));
        }

        res.status(201).json({
            success: true,
            data: driver
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

    if(firstName) user.firstName = firstName;
    if(lastName) user.lastName = lastName;
    if(phone) user.contact_no = phone;
    if(email) user.email = email;
    if(address) user.address = address;
    if(pin) user.pin = pin;
    if(avatar) user.avatar = avatar;

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


const search = async (req, res, next) => {
    try {
        const { datetime, from, to, distance, persons } = req.body;

        const inputDateTime = new Date(datetime);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const inputDay = new Date(inputDateTime.getFullYear(), inputDateTime.getMonth(), inputDateTime.getDate());

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

        const cutoff = new Date(inputDateTime.getTime() + 30 * 60 * 1000);

        buses = await Bus.aggregate([
            // {$match: { status: "active", isVerified: true}},
            { $match: { "stops.name": { $all: [from, to] } } },
            {
                $addFields: {
                    upStartDate: {
                        $dateFromString: { dateString: { $concat: [datePart, " ", "$up.start.time"] } }
                    },
                    downStartDate: {
                        $dateFromString: { dateString: { $concat: [datePart, " ", "$down.start.time"] } }
                    },
                    fare: farePerPerson * persons
                }
            },
            { $match: { $or: [{ upStartDate: { $gte: cutoff } }, { downStartDate: { $gte: cutoff } }] } }
        ]);

        return res.status(201).json({
            success: true,
            data: buses
        })
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
}



export { signup, verifyOTP, resendOTP, refreshAccessToken, logout, getProfile, search, getAllStops, updateProfile };