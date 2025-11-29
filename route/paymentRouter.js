import express from 'express';
import { cancelledBooking, createOrderAndLockSeat, releaseLockedSeats, verifyPayment } from '../controller/paymentController.js';
import {isLoggedIn} from '../middleware/AuthUser.js';


const paymentRouter = express.Router();

paymentRouter.post('/createOrder', createOrderAndLockSeat); //  isLoggedIn,
paymentRouter.post('/verifyPayment', isLoggedIn, verifyPayment);
paymentRouter.post('/releaseSeats', releaseLockedSeats); // isLoggedIn,
paymentRouter.post('/ticketCancellation', isLoggedIn, cancelledBooking);


export default paymentRouter;