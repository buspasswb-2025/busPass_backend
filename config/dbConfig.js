import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

const connectToDB = async () => {
    try{
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`database connected to ${conn.connection.host}`);
    }catch(e) {
        console.log(e);
        process.exit(1);
    }
}

export default connectToDB;