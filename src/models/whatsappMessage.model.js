import mongoose from "mongoose";

const whatsappMessageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        purchaseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Purchase",
            required: true
        },

        serviceType: {
            type: String,
            enum: ["language_selection", "e_cleaning", "filter", "deep_clean", "remark"],
            required: true
        },

        phone: {
            type: String,
            required: true
        },

        templateName: String,

        direction: {
            type: String,
            enum: ["outgoing", "incoming"],
            required: true
        },

        text: String,

        responseType: {
            type: String,
            enum: ["yes", "no", "busy", "issue"]
        },

        remark: String,

        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export default mongoose.model("WhatsAppMessage", whatsappMessageSchema);
