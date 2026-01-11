import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true   // Used in almost every query to fetch products of a business (multi-tenant)
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        // Service cycles (in days)
        // These values control when WhatsApp reminders will be sent
        eCleaningDays: {
            type: Number,
            default: 30
        },

        filterDays: {
            type: Number,
            default: 60
        },

        deepCleanDays: {
            type: Number,
            default: 365
        }
    },
    { timestamps: true }
);

/**
 * This compound index ensures:
 * 1. A single business (userId) cannot create two products with the same name
 *    Example: Kangan Water cannot have "SD501" twice
 *
 * 2. Different businesses CAN have the same product name
 *    Example:
 *      Kangan Water → SD501 ✅
 *      AquaCare     → SD501 ✅
 *
 * This is required for multi-tenant SaaS architecture.
 * It also makes product lookups very fast.
 */
productSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model("Product", productSchema);
