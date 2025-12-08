import { Schema, model } from "mongoose";
import JWT from 'jsonwebtoken';

const userSchema = new Schema({
    firstName: {
        type: String,
        maxLength: [30, "name should be less than 50 characters"],
        minLength: [5, "name should be greater that 5 characters"],
        trim: true
    },
    lastName: {
        type: String,
        maxLength: [30, "name should be less than 50 characters"],
        minLength: [5, "name should be greater that 5 characters"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "email is required"],
        unique: true,
        trim: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please fill in a valid email address'
        ]
    },
    contact_no: {
        type: String,
        unique: true,
        trim: true,
        sparse: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    avatar: {
        type: String
    },
    type: {
        type: String,
        enum: ['driver', 'user', 'admin'],
        default: 'user'
    },
    pin: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    bus: {
        type: Schema.Types.ObjectId,
        ref: 'Bus',
    },
    verificationOTP: String,
    VerificationOTPExpiry: Date,
    refreshToken: String,
}, {
    timestamps: true
}
);

userSchema.methods = {
    generateAccessToken: function () {
        return JWT.sign(
            { id: this._id, email: this.email, type: this.type },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRY }
        )
    },

    generateRefreshToken: function () {
        return JWT.sign(
            { id: this._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRY }
        )
    }
}


const User = model("User", userSchema);
export default User;