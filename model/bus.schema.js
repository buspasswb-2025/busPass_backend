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
        startTime: {
            time: {
                type: String,
                required: [true, 'up start time is required']
            },
            timeInMin: {
                type: Number,
                required: [true, 'up start time in minutes is required']
            }
        },
        endTime: {
            time: {
                type: String,
                required: [true, 'up end time is required']
            },
            timeInMin: {
                type: Number,
                required: [true, 'up end time in minutes is required']
            }
        }
    },
    down: {
        startTime: {
            time: {
                type: String,
                required: [true, 'down start time is required']
            },
            timeInMin: {
                type: Number,
                required: [true, 'down start time in minutes is required']
            }
        },
        endTime: {
            time: {
                type: String,
                required: [true, 'down end time is required']
            },
            timeInMin: {
                type: Number,
                required: [true, 'down end time in minutes is required']
            }
        }
    },
    numberOfSeats: {
        type: Number,
        required: true
    },
    stops: [
        {
            stopId: {
                type: Schema.Types.ObjectId,
                ref: "busstoplists",
            },
            // name: { type: String, require: true },
            // lat: { type: Number, require: true },
            // long: { type: Number, require: true },
            upTime: { type: String, require: true },
            downTime: { type: String, require: true },
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
    isVerified: {
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

const Bus = model('bus', busSchema);
export default Bus;