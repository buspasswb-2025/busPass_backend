import AppError from "../utills/error.js";
import emailVaildator from "email-validator";
import { generateOTP, generateOTPMessage, to24HourFormat } from "../utills/helper.js";
import sendEmail from "../utills/sendEmail.js";
import User from "../model/user.schema.js";
import JWT from 'jsonwebtoken';
import Bus from "../model/bus.schema.js";
import Trip from "../model/trip.schema.js";
import Booking from "../model/booking.schema.js";

const signup = async (req, res, next) => {
    const {email} = req.body;
    console.log(`email : ${email}`);

    try {
        if(!email){
            return next(new AppError("Every field is required", 400));
        }

        const validEmail =  emailVaildator.validate(email);
        if(!validEmail){
            return next(new AppError("Please provide a valid email", 400));
        }

        let driver = await User.findOne({email: email});
        console.log('driver : ', driver);
        if(driver && driver.isEmailVerified === true){
            return next(new AppError("user already exist!"));
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

        console.log(otp);


        if(driver){
            driver.email = email,
            driver.verificationOTP = otp,
            driver.VerificationOTPExpiry = otpExpiry
            console.log('created : created!')
        }else{
            driver = User.create({
                email: email,
                verificationOTP: otp,
                VerificationOTPExpiry: otpExpiry
            })
        }

        if(!driver){
            return next(new AppError("Registration failed!, please try again"), 400);
        }

        await driver.save();

        const message = generateOTPMessage(driver.name || undefined, otp);

        await sendEmail(driver.email, message.subject, message.html);

        res.status(201).json({
            success: true,
            message: "OTP is send to your email"
        })

    } catch (error) {
        console.log(error)
        return next(new AppError(error.message, 400));
    }
}

const verifyEmail = async (req, res, next) => {
    const {email, otp} = req.body;

    try {
        if(!email || !otp){
            return next(new AppError("Every field is required!"), 400);
        }

        const driver = await User.findOne({email: email});
        if(!driver){
            return next(new AppError("User is not exist!"), 400);
        }

        if(driver.isEmailVerified){
            return next(new AppError("User is already verified!", 404));
        }

        if(driver.verificationOTP !== otp){
            return next(new AppError("Invalid OTP!", 400));
        }

        if(driver.VerificationOTPExpiry < new Date()){
            return next(new AppError("OTP has been expired!", 400));
        }

        driver.isEmailVerified = true;
        driver.type = 'driver';
        driver.verificationOTP = undefined;
        driver.VerificationOTPExpiry = undefined;

        const accessToken = await driver.generateAccessToken();
        const refreshToken = await driver.generateRefreshToken();

        driver.refreshToken = refreshToken;

        await driver.save();

        // res.cookie('token', token, {
        //     maxAge: 7 * 24 * 60 * 60 * 1000,
        //     httpOnly: true
        // })

        res.status(201).json({
            success: true,
            message: "signup is successful!",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        })
    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

const login = async (req, res, next) => {
    const {email} = req.body;

    try {
        if(!email){
            return next(new AppError("email is required!", 400));
        }

        const driver = await User.findOne({email: email, isEmailVerified: true});
        if(!driver){
            return next(new AppError("User does't exist!", 400));
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

        console.log(otp);

        driver.verificationOTP = otp;
        driver.VerificationOTPExpiry = otpExpiry;

        await driver.save();

        const message = generateOTPMessage(driver.name || undefined, otp);
        await sendEmail(email, message.subject, message.html);

        res.status(201).json({
            success: true,
            message: "OTP is send to your registered email",
        })
    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

const verifyOTP = async (req, res, next) => {
    const {email, otp} = req.body;

    try {
        if(!email || !otp){
            return next("every field is required!", 404);
        }

        const driver = await User.findOne({email: email});
        if(!driver){
            return next(new AppError("User is not exist!", 404));
        }

        if(driver.verificationOTP !== otp){
            return next(new AppError("Invalid OTP", 404));
        }

        if(driver.VerificationOTPExpiry < new Date()){
            return next(new AppError("OTP has been expired!, please try again", 400));
        }

        driver.verificationOTP = undefined;
        driver.VerificationOTPExpiry = undefined;

        const accessToken = await driver.generateAccessToken();
        const refreshToken = await driver.generateRefreshToken();

        driver.refreshToken = refreshToken;
        await driver.save();
        
        // res.cookie('token', token, {
        //     maxAge: 7 * 24 * 60 * 60 * 1000,
        //     httpOnly: true
        // })

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
    const {email} = req.body;

    try {
        if(!email){
            return next(new AppError("email is required!", 400));
        }

        const driver = await User.findOne({email: email});
        if(!driver){
            return next(new AppError("User does't exist!", 400));
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
        console.log(otp);

        driver.verificationOTP = otp;
        driver.VerificationOTPExpiry = otpExpiry;

        await driver.save();

        const message = generateOTPMessage(driver.name || undefined, otp);
        // await sendEmail(email, message.subject, message.html);

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
        if(!refreshToken) {
            return next(new AppError("refresh token is required", 400));
        }

        const verifiedToken = await JWT.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log(verifiedToken);

        const driver = await User.findById(verifiedToken.id);
        if(!driver || refreshToken !== driver.refreshToken){
            return next(new AppError("Invalid token", 400));
        }

        const newAccessToken = driver.generateAccessToken();
        const newRefreshToken = driver.generateRefreshToken();

        driver.refreshToken = newRefreshToken;

        await driver.save();

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

const updateProfile = async (req, res, next) => {
    const {address, name, pin} = req.body;

    try {
        const {id} = req.user;

        const driver = await User.findById(id);
        if(!driver){
            return next(new AppError('User does not exist!'));
        }

        if(address) driver.address = address;
        if(pin) driver.pin = address;
        if(name) driver.name = name;

        await driver.save();

        res.status(201).json({
            success: true,
            message: "Profile updated successfully!",
            data: driver
        })
    } catch (error) {
        return next(new AppError(error.message, 400));
    }
}

const getProfile = async (req, res, next) => {
    try{
        const {id} = req.user;

        const driver = await User.findById(id);

        if(!driver){
            return next(new AppError('User does not exist!', 400));
        }

        res.status(201).json({
            success: true,
            data: driver
        })
    } catch(e){
        return next(new AppError(e.message, 400));
    }
}

const busRegistration = async (req, res, next) => {
    const {name, upStartTime, upEndTime, downStartTime, downEndTime, destination, numberOfSeats, stops} = req.body;
    const {id, type} = req.user;
    
    const newUpStartTime = to24HourFormat(upStartTime);
    const newUpEndTime = to24HourFormat(upEndTime);
    const newDownStartTime = to24HourFormat(downStartTime);
    const newDownEndTime = to24HourFormat(downEndTime);

    try {
        if(type !== 'driver'){
            return next(new AppError('only driver can registered a bus', 400));
        }

        if(!name || !upStartTime || !upEndTime || !downEndTime || !downStartTime || !destination || !numberOfSeats){
            return next(new AppError('every field is required!', 400));
        }

        const isExist = await Bus.findOne({driver: id});

        if(isExist) {
            return next(new AppError('Bus is already exist!'));
        }

        const bus = await Bus.create({
            name,
            upStartTime: newUpStartTime,
            upEndTime: newUpEndTime, 
            downStartTime: newDownStartTime, 
            downEndTime: newDownEndTime, 
            destination, 
            numberOfSeats, 
            stops,
            driver: id,
        })

        res.status(201).json({
            success: true,
            message: 'Bus registration successful!',
            data: bus
        })

    } catch (e) {
        return next(new AppError(e.message, 400));
    }
}

const checkseats = async (req, res, next) => {
    const {travelDate, time, busId} = req.query;
    const {id} = req.user;
    const formatTime = to24HourFormat(time);

    try {
        if(type !== 'driver'){
            return next(new AppError('only driver can registered a bus', 400));
        }

        const bus = await Bus.findById(busId);

        if(!bus){
            return next(new AppError('Bus does not exist!', 400));
        }

        const trip = await Trip.findOne({bus: busId, startTime: {$gte: formatTime}, endTime: {$lte: formatTime}});
        let tripStartTime = bus.downStartTime;
        let tripEndTime = bus.downEndTime;
        if(bus.upStartTime < formatTime && bus.upEndTime > formatTime){
            tripStartTime = bus.upStartTime;
            tripEndTime = bus.upEndTime;
        }

        if(!trip){
            trip = await Trip.create({
                bus: bus.id,
                startTime: tripStartTime,
                endTime: tripEndTime,
                data: travelDate,
                totalSeats: bus.numberOfSeats,
                availableSeats: bus.numberOfSeats,
            })
        }


        res.status(201).json({
            success: true,
            data: trip
        });
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
}

const checkSeatDetails = async (req, res, next) => {
    const {tripId, seatNo} = req.params;
    const { type } = req.user;
    try {
        if(type !== 'driver'){
            return next(new AppError('only driver can registered a bus', 400));
        }

        const booking = await Booking.findOne({ trip: tripId, seatNumbers: seatNo})
        .populate("bookedBy", "email name")
        .populate("trip");

        if (!booking) {
            return next(new AppError('booking details not found'), 400);
        }

        const bookingDetails = {
            bookBy: booking.bookedBy?.name || null,
            email: booking.bookedBy || null,
            trip: booking.trip,
            seatNumbers: booking.seatNumbers,
            status: booking.status,
            paymentStatus: booking.paymentStatus
        };

        res.status(200).json({
            success: true,
            data: bookingDetails
        });
    } catch (err) {
        return next(new AppError(err.message, 400));
    }
        
}

const logout = async (req, res, next) => {
    try {
        const { id } = req.user;

        const driver = await User.findById(id);

        if(!driver){
            return next(new AppError('user not found!', 400));
        }

        driver.refreshToken = undefined;

        await driver.save();
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


export { signup, verifyEmail, login, verifyOTP, resendOTP, refreshAccessToken, updateProfile, getProfile, busRegistration, checkseats, logout, checkSeatDetails }