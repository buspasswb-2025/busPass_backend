import express from 'express';
import { busRegistration, checkseats, getProfile, logout, refreshAccessToken, resendOTP, signup, updateProfile, verifyOTP } from '../controller/driverController.js';
import isLoggedIn from '../middleware/AuthUser.js';


const driverRouter = express.Router();

driverRouter.post('/signup', signup);
// driverRouter.post('/verifyEmail', verifyEmail);
driverRouter.post('/resendOTP', resendOTP);
driverRouter.post('/verifyOTP', verifyOTP);
// driverRouter.post('/login', login);
driverRouter.post('/refreshToken',refreshAccessToken);
driverRouter.post('/updateProfile', isLoggedIn, updateProfile);
driverRouter.post('/busRegister', isLoggedIn, busRegistration);

driverRouter.get('/profile', isLoggedIn, getProfile);
driverRouter.get('/checkSeats', isLoggedIn, checkseats);
driverRouter.get('/logout', isLoggedIn, logout);

export default driverRouter;