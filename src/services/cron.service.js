import cron from "node-cron";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import WhatsAppMessage from "../models/whatsappMessage.model.js";
import { sendTemplateMessage } from "./whatsapp.service.js";
import { LANGUAGE_SELECTION_TEMPLATE } from "../constants.js";

/**
 * Runs at 9 AM on the 5th of every month
 * Starts the monthly guided service flow
 */
cron.schedule("* 17 * * *", async () => {
    console.log("⏰ Monthly WhatsApp Service Flow Started");

    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const purchases = await Purchase.find({ status: "active" });

    for (const purchase of purchases) {
        // Already processed this month
        if (purchase.lastFlowMonth === monthKey) continue;

        const user = await User.findById(purchase.userId);
        if (!user) continue;

        // Start monthly flow with LANGUAGE SELECTION
        purchase.monthlyFlowStep = "language_selection";
        purchase.lastFlowMonth = monthKey;
        await purchase.save();

        // 1️⃣ Save outgoing message
        await WhatsAppMessage.create({
            userId: user._id,
            purchaseId: purchase._id,
            serviceType: "language_selection",
            phone: purchase.phone,
            templateName: LANGUAGE_SELECTION_TEMPLATE,
            direction: "outgoing",
            text: "Language selection reminder sent",
            timestamp: new Date()
        });

        // 2️⃣ Send WhatsApp (Language Selection)
        // No variables needed for this template usually, or maybe customer name?
        // The image shows "Hello Customer name". So we pass customerName.
        await sendTemplateMessage(
            user.phoneNumberId,
            user.whatsappAccessToken,
            purchase.phone,
            LANGUAGE_SELECTION_TEMPLATE,
            [purchase.customerName],
            "en"
        );

        console.log(`📤 Language selection sent to ${purchase.phone}`);
    }
});
