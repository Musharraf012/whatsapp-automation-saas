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

        // Last service dates
        lastECleaning: Date,
        lastFilterCheck: Date,
        lastDeepCleaning: Date,

        // Next scheduled WhatsApp reminder dates
        nextECleaning: Date,
        nextFilterCheck: Date,
        nextDeepCleaning: Date,

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    { timestamps: true }
);

purchaseSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model("Purchase", purchaseSchema);
