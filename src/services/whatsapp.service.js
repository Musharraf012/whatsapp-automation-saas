import axios from "axios";
import { formatNumberForWhatsAppTemplate } from "../utils/helper.js";

/**
 * Sends a WhatsApp template message.
 * Supports:
 *  - Per-user WhatsApp (phoneNumberId + accessToken)
 *  - Fallback to .env values for single-account mode
 */
export const sendTemplateMessage = async (
    phoneNumberId,
    accessToken,
    to,
    templateName,
    variables = []
) => {
    const finalPhoneId = phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
    const finalToken = accessToken || process.env.META_WA_ACCESS_TOKEN;
    const formattedTo = formatNumberForWhatsAppTemplate(to);

    const url = `https://graph.facebook.com/v22.0/${finalPhoneId}/messages`;

    const components = [];

    if (variables.length > 0) {
        components.push({
            type: "body",
            parameters: variables.map(v => ({
                type: "text",
                text: v
            }))
        });
    }

    const data = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en" },
            components
        }
    };

    return axios.post(url, data, {
        headers: {
            Authorization: `Bearer ${finalToken}`,
            "Content-Type": "application/json"
        }
    });
};
