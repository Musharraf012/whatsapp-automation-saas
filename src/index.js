import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import "./services/cron.service.js"

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();





// https://leone-unsatisfied-anika.ngrok-free.dev/guides/deepclean.pdf
// https://leone-unsatisfied-anika.ngrok-free.dev/guides/filter.pdf
// https://leone-unsatisfied-anika.ngrok-free.dev/guides/ecleaning.pdf
