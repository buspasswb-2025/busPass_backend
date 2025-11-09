import { model, Schema } from "mongoose";


const reminderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    type: { type: String, enum: ["email", "sms", "push"], default: "email" },
    reminderTime: { type: Date, required: true },
    status: { type: String, enum: ["pending", "queued", "sent", "failed"], default: "pending" },
    attempts: { type: Number, default: 0 },
}, {
    timestamps: true
});

const MessageRemainder = model('MessageRemainder', reminderSchema);
export default MessageRemainder;
