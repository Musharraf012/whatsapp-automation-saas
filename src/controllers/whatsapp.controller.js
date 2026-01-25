import { sendTemplateMessage } from "../services/whatsapp.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

export const sendWhatsAppTemplate = async (req, res, next) => {
    try {
        const { phone, template, vars, language } = req.body;

        if (!phone || !template) {
            throw new ApiError(400, "phone and template are required");
        }

        const response = await sendTemplateMessage(phone, template, vars || [], language || "en");

        res.status(200).json(
            new ApiResponse(200, response.data, "WhatsApp message sent")
        );
    } catch (error) {
        next(error);
    }
};
