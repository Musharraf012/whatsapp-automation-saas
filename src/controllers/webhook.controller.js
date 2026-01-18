import WhatsAppMessage from "../models/whatsappMessage.model.js";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import { sendTemplateMessage } from "../services/whatsapp.service.js";
import { normalizeWhatsAppReplyNumber } from "../utils/helper.js";

export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const phone = normalizeWhatsAppReplyNumber(message.from);

        // =========================
        // PARSE MESSAGE TEXT
        // =========================
        let text = "";

        if (message.type === "text") {
            text = message.text.body.trim().toLowerCase();
        } else if (message.type === "button") {
            text = message.button.payload.trim().toLowerCase();
        }

        console.log("📩 WhatsApp reply:", phone, text);

        // =========================
        // FIND PURCHASE & USER
        // =========================
        const purchase = await Purchase.findOne({ phone, status: "active" });
        if (!purchase) return res.sendStatus(200);

        const user = await User.findById(purchase.userId);
        if (!user) return res.sendStatus(200);

        const step = purchase.monthlyFlowStep;

        // =========================
        // FINAL REMARK STEP
        // =========================
        if (step === "remark") {
            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: "remark",
                phone,
                direction: "incoming",
                text,
                responseType: "issue",
                remark: text,
                timestamp: new Date()
            });

            purchase.monthlyFlowStep = "done";
            await purchase.save();

            console.log(`📝 Final remark saved for ${phone}`);
            return res.sendStatus(200);
        }

        // =========================
        // YES / NO (ALWAYS LOG)
        // =========================
        if (["yes", "no"].includes(text)) {
            // 1️⃣ Store incoming reply
            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: step,
                phone,
                direction: "incoming",
                text,
                responseType: text,
                timestamp: new Date()
            });

            const now = new Date();

            // =========================
            // MOVE FLOW FORWARD
            // =========================
            if (step === "e_cleaning") {
                purchase.lastECleaning = now;
                purchase.monthlyFlowStep = "filter";

                // Log outgoing
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

            else if (step === "filter") {
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

            else if (step === "deep_clean") {
                purchase.lastDeepCleaning = now;
                purchase.monthlyFlowStep = "remark";

                await WhatsAppMessage.create({
                    userId: user._id,
                    purchaseId: purchase._id,
                    serviceType: "remark",
                    phone,
                    templateName: "ro_remark_monthly_test",
                    direction: "outgoing",
                    text: "Final remark request sent",
                    timestamp: new Date()
                });

                await sendTemplateMessage(
                    user.phoneNumberId,
                    user.whatsappAccessToken,
                    phone,
                    "ro_remark_monthly_test"
                );
            }

            await purchase.save();
            return res.sendStatus(200);
        }

        // =========================
        // IGNORE ANYTHING ELSE
        // =========================
        return res.sendStatus(200);

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.sendStatus(200);
    }
};
