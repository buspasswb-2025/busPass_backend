import { model, Schema } from "mongoose";

const bookingSchema = new Schema({
  bookedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  trip: {
    type: Schema.Types.ObjectId,
    ref: "Trip",
    required: true,
  },
  seatNumbers: {
    type: [Number],
    required: true,
  },
  from: {
    stopId: {
      type: Schema.Types.ObjectId,
      ref: "busstoplists",
    },
    stopName: {
      type: String,
      // required: true,
    },
    Latitude: {
      type: String,
      // required: true
    },
    Longitude: {
      type: String,
      // required: true
    },
    time: { 
      type: String, 
      require: true
    }
  },
  to: {
    stopId: {
      type: Schema.Types.ObjectId,
      ref: "busstoplists",
    },
    stopName: {
      type: String,
      // required: true,
    },
    Latitude: {
      type: String,
      // required: true
    },
    Longitude: {
      type: String,
      // required: true
    },
    time: { 
      type: String, 
      // require: true 
    }
  },
  farePerSeat: {
    type: Number,
    required: true,
  },
  totalFare: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
  },
  paymentDetails: {
    razorpayOrderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
    paymentMethod: {
      method: {
        type: String
      },
      card: {
        last4: { type: String },
        network: { type: String },
        type: { type: String }
      },
      vpa: { type: String },
      bank: { type: String },
      wallet: { type: String }
    },
    paidAt: Date,
  },

  refundDetails: {
    status: {
      type: String,
    },
    id: {
      type: String,
    },
    amount: {
      type: Number,
    },
    refundAt: { type: Date }
  },

  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
    // index: { expires: 0 }
  }
}, {
  timestamps: true
});

const Booking = model("Booking", bookingSchema);
export default Booking;
