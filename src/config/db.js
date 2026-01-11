import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // load .env

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: DB_NAME,
        });

        console.log(`MongoDB Connected — ${DB_NAME}`);
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};
