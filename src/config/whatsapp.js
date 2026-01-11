import dotenv from "dotenv";
dotenv.config();

export const WHATSAPP_CONFIG = {
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID,
    accessToken: process.env.META_WA_ACCESS_TOKEN,
};
