// import express from 'express';
// import cors from 'cors';
// import whatsappRoutes from './routes/whatsapp.route.js';
// import webhookRoutes from './routes/webhook.route.js';

// const app = express();

// app.use(cors(
//     {
//         origin: '*',
//     }
// ));
// app.use(express.json());

// app.use(express.urlencoded({ extended: true })); // ✅ ADD THIS LINE

// app.use((req, res, next) => {
//     console.log("➡️ INCOMING:", req.method, req.url);
//     next();
// });


// app.use("/api/whatsapp", whatsappRoutes);
// app.use("/api", webhookRoutes);


// export default app;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import whatsappRoutes from "./routes/whatsapp.route.js";
import webhookRoutes from "./routes/webhook.route.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";

import errorHandler from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

/**
 * CORS
 */
app.use(cors({
    origin: "*",   // Later you can restrict to frontend domain
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

/**
 * Body parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Routes
 */
app.use("/api/users", userRoutes);      // Business Auth
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api", webhookRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchases", purchaseRoutes);


/**
 * Health check
 */
app.get("/", (req, res) => {
    res.send("WhatsApp Automation SaaS is running 🚀");
});

/**
 * Global Error Handler (MUST be last)
 */
app.use(errorHandler);

export default app;
