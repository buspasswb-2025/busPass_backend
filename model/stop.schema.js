import { Schema, model } from "mongoose";

const stopSchema = new Schema({
  stopName: {
    type: String,
    required: true,
    unique: true,
  },
  Latitude: {
    type: String,
    required: true
  },
  Longitude: {
    type: String,
    required: true
  }
});

const Stop = model("busstoplist", stopSchema);
export default Stop;