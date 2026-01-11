import axios from "axios";
import { WHATSAPP_CONFIG } from "../config/whatsapp.js";

export const sendTemplateMessage = async (to, templateName, variables = []) => {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`;

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
        to,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en" },
            components
        }
    };

    return axios.post(url, data, {
        headers: {
            Authorization: `Bearer ${WHATSAPP_CONFIG.accessToken}`,
            "Content-Type": "application/json"
        }
    });
};