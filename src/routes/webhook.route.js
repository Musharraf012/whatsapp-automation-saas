import { Router } from "express";
import { handleWhatsAppWebhook } from "../controllers/webhook.controller.js";

const router = Router();

/**
 * =====================================================
 * GET /api/webhook
 * 👉 Used by Meta to VERIFY webhook
 * =====================================================
 */
router.get("/webhook", (req, res) => {
    const urlParts = req.originalUrl.split("?");
    const queryString = urlParts[1] || "";

    const params = new URLSearchParams(queryString);
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified!");
        return res.status(200).send(challenge);
    }

    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);
});

/**
 * =====================================================
 * POST /api/webhook
 * 👉 Receives incoming WhatsApp messages
 * =====================================================
 */
router.post("/webhook", handleWhatsAppWebhook);

export default router;
