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
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
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
  paymentDetails: {
    transactionId: String,
    paymentMethod: String,
    paidAt: Date,
  },
  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  }
}, {
  timestamps: true
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
