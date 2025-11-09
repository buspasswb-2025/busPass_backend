import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true,
  },
  seatNumbers: {
    type: [Number],
    required: true,
  },
  from: {
    name: { type: String, require: true },
    lat: { type: Number, require: true },
    long: { type: Number, require: true },
    time: { type: String, require: true }
  },
  to: {
    name: { type: String, require: true },
    lat: { type: Number, require: true },
    long: { type: Number, require: true },
    time: { type: String, require: true }
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
    refundAt: { type: Date}
  },

  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
