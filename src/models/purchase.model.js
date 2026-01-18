import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const purchaseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        customerName: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        salesDate: {
            type: Date,
            required: true
        },

        // Last service dates (for history & reporting)
        lastECleaning: Date,
        lastFilterCheck: Date,
        lastDeepCleaning: Date,

        // Old reminder system (kept for compatibility)
        nextECleaning: Date,
        nextFilterCheck: Date,
        nextDeepCleaning: Date,

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },

        // ===============================
        // MONTHLY GUIDED SERVICE FLOW
        // ===============================

        // Which service we are waiting for in the current month
        monthlyFlowStep: {
            type: String,
            enum: ["e_cleaning", "filter", "deep_clean", "remark", "done"],
            default: "e_cleaning"
        },

        // Which month the flow was last triggered (YYYY-MM)
        lastFlowMonth: {
            type: String
        }
    },
    { timestamps: true }
);

// Pagination support
purchaseSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model("Purchase", purchaseSchema);
