import { Schema, model } from "mongoose";


const busSchema = new Schema({
    name: {
        type: String,
        required: [true, "name should be require"],
        maxLength: [50, "name should be less than 50 characters"],
        minLength: [5, "name should be greater that 5 characters"],
        trim: true
    },
    up: {
        start: {
            time: {
                type: String,
                required: [true, "Up start time is required"],
            },
            location: {
                name: {type: String, require: true},
                lat: { type: Number, require: true },
                long: { type: Number, require: true },
            }
        },
        end: {
            time: {
                type: String,
                required: [true, "Up end time is required"],
            },
            location: {
                name: {type: String, require: true},
                lat: { type: Number, require: true },
                long: { type: Number, require: true },
            }
        }
    },
    down: {
        start: {
            time: {
                type: String,
                required: [true, "down start time is required"],
            },
            location: {
                name: {type: String, require: true},
                lat: { type: Number, require: true },
                long: { type: Number, require: true },
            }
        },
        end: {
            time: {
                type: String,
                required: [true, "down end time is required"],
            },
            location: {
                name: {type: String, require: true},
                lat: { type: Number, require: true },
                long: { type: Number, require: true },
            }
        }
    },
    numberOfSeats: {
        type: Number,
        required: true
    },
    stops: [
        {
            name: { type: String, require: true },
            lat: { type: Number, require: true },
            long: { type: Number, require: true },
            upTime: {type: String, require: true},
            downTime: {type: String, require: true}
        }
    ],
    driver: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    isVerified:{
        type: Boolean,
        enum: [true, false],
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspend'],
        default: 'inactive'
    }
})

const Bus = model('Bus', busSchema);
export default Bus;