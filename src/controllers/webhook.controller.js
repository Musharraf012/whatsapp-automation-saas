import WhatsAppMessage from "../models/whatsappMessage.model.js";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import { sendTemplateMessage } from "../services/whatsapp.service.js";
import { normalizeWhatsAppReplyNumber } from "../utils/helper.js";
import { TEMPLATE_MAP } from "../constants.js";

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
            // Button payload often contains the ID, but text is safer if ID distinct
            // If payload is "English", text might be "English"
            text = (message.button.payload || message.button.text).trim().toLowerCase();
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
        // LANGUAGE SELECTION STEP
        // =========================
        if (step === "language_selection") {
            let selectedLang = "en"; // Default

            if (text.includes("english") || text === "en") selectedLang = "en";
            else if (text.includes("हिंदी") || text.includes("hindi") || text === "hi") selectedLang = "hi";
            else if (text.includes("ગુજરાતી") || text.includes("gujarati") || text === "gu") selectedLang = "gu";
            else {
                // Invalid selection or random text, maybe resend language menu? 
                // For now, ignore or default to english? Let's ignore to force selection or manual intervention.
                return res.sendStatus(200);
            }

            // Save language preference
            purchase.language = selectedLang;

            // Move to first service step immediately: e_cleaning
            purchase.monthlyFlowStep = "e_cleaning";
            purchase.lastECleaning = new Date(); // Or just start flow? usually e_cleaning is *sent* here

            // Wait, logic check: 
            // Previous flow: Cron sends e_cleaning. User says Yes/No -> Move to Filter.
            // New flow: Cron sends Language. User picks Lang -> Send e_cleaning.
            // User says Yes/No -> Move to Filter.

            // So here we just SEND the e_cleaning message in the chosen language.
            // We do NOT mark e_cleaning as done yet. 
            // Actually, in the original code, e_cleaning was sent by cron. 
            // The webhook handles the REPLY to e_cleaning (Yes/No).
            // So we need to stay in "e_cleaning" step? 
            // Or rather: 
            // 1. Cron sets "language_selection", sends menu.
            // 2. User replies "English".
            // 3. Webhook updates lang, sets step="e_cleaning".
            // 4. Webhook SENDS e_cleaning template.
            // 5. User replies "Yes" (to e_cleaning).
            // 6. Webhook (Yes/No block) handles it -> moves to filter.

            // Correct.

            await purchase.save();

            // Send E-Cleaning Message
            const templateName = TEMPLATE_MAP.e_cleaning[selectedLang];

            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: "e_cleaning",
                phone,
                templateName,
                direction: "outgoing",
                text: `E-cleaning reminder sent (${selectedLang})`,
                timestamp: new Date()
            });

            await sendTemplateMessage(
                user.phoneNumberId,
                user.whatsappAccessToken,
                phone,
                templateName,
                [purchase.customerName],
                selectedLang
            );

            return res.sendStatus(200);
        }

        // =========================
        // FINAL REMARK STEP
        // =========================
        // ... (existing remark logic seems fine, but we should use localized template if we were sending one OUT... 
        // remark step handles INCOMING remark. The OUTGOING remark request is sent in previous step)

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
        // YES / NO FLOW
        // =========================
        if (["yes", "no", "ha", "na", "haa", "naa"].includes(text) || text.includes("yes") || text.includes("no")) {
            // Basic normalization for yes/no in other languages?
            // For now assuming buttons send "yes"/"no" payload or we rely on user typing.
            // If buttons are localized (e.g., "हा" / "नहीं"), we need to map them to "yes"/"no".
            // Let's assume standardized payloads for now, or just check text.

            let responseType = "yes"; // Default
            if (["no", "na", "naa", "nahi", "n"].includes(text) || text.includes("no")) responseType = "no";

            // 1️⃣ Store incoming reply
            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType: step,
                phone,
                direction: "incoming",
                text,
                responseType,
                timestamp: new Date()
            });

            const now = new Date();
            const lang = purchase.language || "en";

            // =========================
            // MOVE FLOW FORWARD
            // =========================
            if (step === "e_cleaning") {
                purchase.lastECleaning = now;
                purchase.monthlyFlowStep = "filter";

                const templateName = TEMPLATE_MAP.filter[lang];

                // Log outgoing
                await WhatsAppMessage.create({
                    userId: user._id,
                    purchaseId: purchase._id,
                    serviceType: "filter",
                    phone,
                    templateName,
                    direction: "outgoing",
                    text: `Filter reminder sent (${lang})`,
                    timestamp: new Date()
                });

                await sendTemplateMessage(
                    user.phoneNumberId,
                    user.whatsappAccessToken,
                    phone,
                    templateName,
                    [purchase.customerName],
                    lang
                );
            }

            else if (step === "filter") {
                purchase.lastFilterCheck = now;
                purchase.monthlyFlowStep = "deep_clean";

                const templateName = TEMPLATE_MAP.deep_clean[lang];

                await WhatsAppMessage.create({
                    userId: user._id,
                    purchaseId: purchase._id,
                    serviceType: "deep_clean",
                    phone,
                    templateName,
                    direction: "outgoing",
                    text: `Deep clean reminder sent (${lang})`,
                    timestamp: new Date()
                });

                await sendTemplateMessage(
                    user.phoneNumberId,
                    user.whatsappAccessToken,
                    phone,
                    templateName,
                    [purchase.customerName],
                    lang
                );
            }

            else if (step === "deep_clean") {
                purchase.lastDeepCleaning = now;
                purchase.monthlyFlowStep = "remark";

                const templateName = TEMPLATE_MAP.remark[lang];

                await WhatsAppMessage.create({
                    userId: user._id,
                    purchaseId: purchase._id,
                    serviceType: "remark",
                    phone,
                    templateName,
                    direction: "outgoing",
                    text: `Final remark request sent (${lang})`,
                    timestamp: new Date()
                });

                // Note: Remark template might not need variables? 
                // Checking previous code: sendTemplateMessage(..., "ro_remark_monthly_test") -> No variables.
                // Assuming localized ones also don't need variables. 
                // If they do, we'd need to pass them.

                await sendTemplateMessage(
                    user.phoneNumberId,
                    user.whatsappAccessToken,
                    phone,
                    templateName,
                    [],
                    lang
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
