import express from 'express';
import {bookingHistory, getAllStops, getProfile, getRecentBooking, getTicketById, getTrip, logout, refreshAccessToken, resendOTP, search, signup, updateProfile, verifyOTP } from '../controller/userController.js';
import {isLoggedIn} from '../middleware/AuthUser.js';
import { pagination } from '../middleware/helpingMeddleware.js';


const userRouter = express.Router();

userRouter.post('/signup', signup);
userRouter.post('/resendOTP', resendOTP);
userRouter.post('/verifyOTP', verifyOTP);
userRouter.post('/refreshToken', refreshAccessToken);
userRouter.post('/search',isLoggedIn, search);
userRouter.post('/updateProfile', isLoggedIn, updateProfile);
userRouter.post('/getTrip',isLoggedIn, getTrip);

userRouter.get('/logout', isLoggedIn, logout);
userRouter.get('/getuser', isLoggedIn, getProfile);
userRouter.get('/getAllStops',isLoggedIn, getAllStops);
userRouter.get('/recentBookingDetails', isLoggedIn, getRecentBooking);
userRouter.get('/bookingHistory', isLoggedIn, pagination, bookingHistory);
userRouter.get('/getTicketById/:ticketId', isLoggedIn, getTicketById);


export default userRouter;