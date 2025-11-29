import express from 'express';
import {getAllStops, getProfile, getTrip, logout, refreshAccessToken, resendOTP, search, signup, updateProfile, verifyOTP } from '../controller/userController.js';
import {isLoggedIn} from '../middleware/AuthUser.js';


const userRouter = express.Router();

userRouter.post('/signup', signup);
userRouter.post('/resendOTP', resendOTP);
userRouter.post('/verifyOTP', verifyOTP);
userRouter.post('/refreshToken', refreshAccessToken);
userRouter.post('/search', search); //isLoggedIn
userRouter.post('/updateProfile', isLoggedIn, updateProfile);
userRouter.post('/getTrip', getTrip); //isLoggedIn

userRouter.get('/logout', isLoggedIn, logout);
userRouter.get('/getuser', isLoggedIn, getProfile);
userRouter.get('/getAllStops', getAllStops); // isLoggedIn, 


export default userRouter;