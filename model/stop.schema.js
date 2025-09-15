import { Schema, model } from "mongoose";

const stopSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    lat: Number,
    lng: Number,
  }
});

const Stop = model("BusStopList", stopSchema);
export default Stop;
