import express from 'express';
import { cancelledBooking, createOrderAndLockSeat, releaseLockedSeats, verifyPayment } from '../controller/paymentController.js';
import {isLoggedIn} from '../middleware/AuthUser.js';


const paymentRouter = express.Router();

paymentRouter.post('/createOrder', isLoggedIn,  createOrderAndLockSeat);
paymentRouter.post('/verifyPayment', isLoggedIn, verifyPayment);
paymentRouter.post('/releaseSeats', isLoggedIn, releaseLockedSeats);
paymentRouter.post('/ticketCancellation', isLoggedIn, cancelledBooking);


export default paymentRouter;