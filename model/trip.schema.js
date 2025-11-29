import { Schema, model } from "mongoose";

const tripSchema = new Schema({
  bus: {
    type: Schema.Types.ObjectId,
    ref: "Bus",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    time: {
      type: String,
      required: [true, 'Trip start time is required']
    },
    timeInMin: {
      type: Number,
      required: [true, 'Trip start time in minutes is required']
    }
  },
  endTime: {
    time: {
      type: String,
      required: [true, 'Trip end time is required']
    },
    timeInMin: {
      type: Number,
      required: [true, 'Trip end time in minutes is required']
    }
  },
  direction: {
    type: String,
    enum: ['up', 'down'],
  },
  totalSeats: {
    type: Number,
    required: true,
  },
  availableSeats: {
    type: Number,
    required: true,
  },
  seatBookings: [
    {
      seatNumber: {
        type: Number,
        required: true
      },
      bookedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      isBooked: {
        type: String,
        enum: ['reserved', 'available', 'booked'],
        default: 'available'
      },
      // pickupStop: {
      //   stopId: {
      //     type: Schema.Types.ObjectId,
      //     ref: "busstoplists",
      //   },
      //   stopName: {
      //     type: String,
      //     required: true,
      //     unique: true,
      //   },
      //   Latitude: {
      //     type: String,
      //     required: true
      //   },
      //   Longitude: {
      //     type: String,
      //     required: true
      //   },
      //   time: { type: String, require: true }
      // },
      // dropStop: {
      //   stopId: {
      //     type: Schema.Types.ObjectId,
      //     ref: "busstoplists",
      //   },
      //   stopName: {
      //     type: String,
      //     required: true,
      //     unique: true,
      //   },
      //   Latitude: {
      //     type: String,
      //     required: true
      //   },
      //   Longitude: {
      //     type: String,
      //     required: true
      //   },
      //   time: { type: String, require: true }
      // },
      booking: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
      expire: {
        type: Date,
      }
    }
  ],
  isCancelled: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['future', 'running', 'cancled', 'completed'],
    default: 'running',
  }
}, {
  timestamps: true
});


const Trip = model('Trip', tripSchema);
export default Trip;