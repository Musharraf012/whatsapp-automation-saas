import WhatsAppMessage from "../models/whatsappMessage.model.js";
import Purchase from "../models/purchase.model.js";
import Product from "../models/product.model.js";
import { addDays } from "../utils/helper.js";

export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const phone = message.from;
        const text = message.text?.body?.toLowerCase() || "";

        console.log("📩 WhatsApp reply:", phone, text);

        // 1️⃣ Find last reminder we sent to this number
        const lastSent = await WhatsAppMessage.findOne({
            phone,
            direction: "outgoing"
        }).sort({ timestamp: -1 });

        if (!lastSent) return res.sendStatus(200);

        // 2️⃣ Detect response type
        let responseType = "issue";
        if (text.includes("yes")) responseType = "yes";
        else if (text.includes("no")) responseType = "no";
        else if (text.includes("busy")) responseType = "busy";

        // 3️⃣ Save incoming message
        await WhatsAppMessage.create({
            userId: lastSent.userId,
            purchaseId: lastSent.purchaseId,
            serviceType: lastSent.serviceType,
            phone,
            direction: "incoming",
            text,
            responseType,
            remark: responseType === "issue" ? text : "",
            timestamp: new Date()
        });

        // 4️⃣ If YES → update schedule
        if (responseType === "yes") {
            const purchase = await Purchase.findById(lastSent.purchaseId);
            const product = await Product.findById(purchase.productId);

            const today = new Date();

            if (lastSent.serviceType === "e_cleaning") {
                purchase.lastECleaning = today;
                purchase.nextECleaning = addDays(today, product.eCleaningDays);
            }

            if (lastSent.serviceType === "filter") {
                purchase.lastFilterCheck = today;
                purchase.nextFilterCheck = addDays(today, product.filterDays);
            }

            if (lastSent.serviceType === "deep_clean") {
                purchase.lastDeepCleaning = today;
                purchase.nextDeepCleaning = addDays(today, product.deepCleanDays);
            }

            await purchase.save();
            console.log(`✅ Updated ${lastSent.serviceType} for ${phone}`);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook Error:", error);
        res.sendStatus(200);
    }
};
