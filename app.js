import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import errorMeddleware from './middleware/errorMeddleware.js';
import morgan from 'morgan';
import driverRouter from './route/driverRouter.js';
import userRouter from './route/userRouter.js';
import paymentRouter from './route/paymentRouter.js';


const app = express();

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(cookieParser());

app.use(morgan('dev')); //for log management

app.use("/test", (req, res) => {
    res.send("wellcome to busPass");
})

// all routes
app.use('/api/driver', driverRouter);
app.use('/api/user', userRouter);
app.use('/api/v1/payment', paymentRouter);

app.use((req, res) => {                   // handling the invalid or unknown route
    console.log("invalid route");
    res.status(404).send("OOPS!! 404 page not found");
});


app.use(errorMeddleware); // general error handling middleware

export default app;