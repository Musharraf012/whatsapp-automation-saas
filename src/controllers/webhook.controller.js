import WhatsAppMessage from "../models/whatsappMessage.model.js";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import { sendTemplateMessage } from "../services/whatsapp.service.js";

export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const phone = message.from;
        let text = "";

        // Text reply
        if (message.type === "text") {
            text = message.text.body.trim().toLowerCase();
        }

        // Button reply (TEMPLATE BUTTON)
        else if (message.type === "button") {
            text = message.button.payload.trim().toLowerCase();
        }

        console.log("📩 WhatsApp reply:", phone, text);

        const purchase = await Purchase.findOne({ phone, status: "active" });
        if (!purchase) return res.sendStatus(200);

        const user = await User.findById(purchase.userId);
        if (!user) return res.sendStatus(200);

        const currentStep = purchase.monthlyFlowStep;

        // ================================
        // REMARK (anything except yes/no)
        // ================================
        if (!["yes", "no"].includes(text)) {
            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: currentStep,
                phone,
                direction: "incoming",
                text,
                responseType: "issue",
                remark: text,
                timestamp: new Date()
            });

            console.log(`📝 Remark saved for ${phone}: ${text}`);
            return res.sendStatus(200);
        }

        // ================================
        // YES / NO reply logging
        // ================================
        await WhatsAppMessage.create({
            userId: user._id,
            purchaseId: purchase._id,
            serviceType: currentStep,
            phone,
            direction: "incoming",
            text,
            responseType: text,
            timestamp: new Date()
        });

        // NO → do nothing
        if (text === "no") {
            console.log(`⏸ ${currentStep} not done for ${phone}`);
            return res.sendStatus(200);
        }

        // ================================
        // YES → move to next step
        // ================================
        const now = new Date();

        if (currentStep === "e_cleaning") {
            purchase.lastECleaning = now;
            purchase.monthlyFlowStep = "filter";

            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: "filter",
                phone,
                templateName: "ro_filter_monthly_test",
                direction: "outgoing",
                text: "Filter reminder sent",
                timestamp: new Date()
            });

            await sendTemplateMessage(
                user.phoneNumberId,
                user.whatsappAccessToken,
                phone,
                "ro_filter_monthly_test",
                [purchase.customerName]
            );
        }

        else if (currentStep === "filter") {
            purchase.lastFilterCheck = now;
            purchase.monthlyFlowStep = "deep_clean";

            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: "deep_clean",
                phone,
                templateName: "ro_deepclean_monthly_test",
                direction: "outgoing",
                text: "Deep clean reminder sent",
                timestamp: new Date()
            });

            await sendTemplateMessage(
                user.phoneNumberId,
                user.whatsappAccessToken,
                phone,
                "ro_deepclean_monthly_test",
                [purchase.customerName]
            );
        }

        else if (currentStep === "deep_clean") {
            purchase.lastDeepCleaning = now;
            purchase.monthlyFlowStep = "done";
            console.log(`✅ Monthly service completed for ${phone}`);
        }

        await purchase.save();
        return res.sendStatus(200);

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.sendStatus(200);
    }
};
