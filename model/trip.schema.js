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
    type: String,
    required: true,
  },
  endTime: {
    type: String,
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
      pickupStop: {
        type: Schema.Types.ObjectId,
        ref: 'Stop',
      },
      dropStop: {
        type: Schema.Types.ObjectId,
        ref: 'Stop',
      },
      booking: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
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