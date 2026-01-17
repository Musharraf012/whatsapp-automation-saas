import cron from "node-cron";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import WhatsAppMessage from "../models/whatsappMessage.model.js";
import { sendTemplateMessage } from "./whatsapp.service.js";

/**
 * Runs at 9 AM on the 5th of every month
 * Starts the monthly guided service flow
 */
cron.schedule("0 9 5 * *", async () => {
    console.log("⏰ Monthly WhatsApp Service Flow Started");

    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const purchases = await Purchase.find({ status: "active" });

    for (const purchase of purchases) {
        // Already processed this month
        if (purchase.lastFlowMonth === monthKey) continue;

        const user = await User.findById(purchase.userId);
        if (!user) continue;

        // Start monthly flow
        purchase.monthlyFlowStep = "e_cleaning";
        purchase.lastFlowMonth = monthKey;
        await purchase.save();

        // 1️⃣ Save outgoing message
        await WhatsAppMessage.create({
            userId: user._id,
            purchaseId: purchase._id,
            serviceType: "e_cleaning",
            phone: purchase.phone,
            templateName: "ro_ecleaning_monthly_test",
            direction: "outgoing",
            text: "E-cleaning reminder sent",
            timestamp: new Date()
        });

        // 2️⃣ Send WhatsApp
        await sendTemplateMessage(
            user.phoneNumberId,
            user.whatsappAccessToken,
            purchase.phone,
            "ro_ecleaning_monthly_test",
            [purchase.customerName]
        );

        console.log(`📤 E-cleaning sent to ${purchase.phone}`);
    }
});
