// import { Router } from "express";
// import { sendTemplateMessage } from "../services/whatsapp.service.js";

// const router = Router();

// // POST /api/whatsapp/send
// router.post("/send", async (req, res) => {
//     const { phone, template, vars } = req.body;
//     console.log('hi', phone, template, vars);

//     if (!phone || !template) {
//         return res.status(400).json({ error: "phone & template required" });
//     }

//     try {
//         const resp = await sendTemplateMessage(phone, template, vars || []);
//         res.status(200).json({ success: true, data: resp.data });
//     } catch (err) {
//         console.log(err.response?.data || err.message);
//         res.status(500).json({ error: err.response?.data || err.message });
//     }
// });

// export default router;


import { Router } from "express";
import { sendWhatsAppTemplate } from "../controllers/whatsapp.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Only logged-in businesses can send WhatsApp
 */
router.post("/send", protect, sendWhatsAppTemplate);

export default router;
