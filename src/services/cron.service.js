// import cron from "node-cron";
// import Purchase from "../models/purchase.model.js";
// import User from "../models/user.model.js";
// import WhatsAppMessage from "../models/whatsappMessage.model.js";
// import { sendTemplateMessage } from "./whatsapp.service.js";

// cron.schedule("* * * * *", async () => {
//     console.log("⏰ WhatsApp Reminder Cron Started");

//     const start = new Date();
//     start.setHours(0, 0, 0, 0);

//     const end = new Date();
//     end.setHours(23, 59, 59, 999);

//     const purchases = await Purchase.find({
//         status: "active",
//         $or: [
//             { nextECleaning: { $gte: start, $lte: end } },
//             { nextFilterCheck: { $gte: start, $lte: end } },
//             { nextDeepCleaning: { $gte: start, $lte: end } }
//         ]
//     });

//     for (const purchase of purchases) {
//         const user = await User.findById(purchase.userId);
//         if (!user) continue;

//         const tasks = [];

//         if (purchase.nextECleaning >= start && purchase.nextECleaning <= end) {
//             tasks.push("e_cleaning");
//         }
//         if (purchase.nextFilterCheck >= start && purchase.nextFilterCheck <= end) {
//             tasks.push("filter");
//         }
//         if (purchase.nextDeepCleaning >= start && purchase.nextDeepCleaning <= end) {
//             tasks.push("deep_clean");
//         }

//         for (const serviceType of tasks) {
//             // 1️⃣ Save outgoing message
//             await WhatsAppMessage.create({
//                 userId: user._id,
//                 purchaseId: purchase._id,
//                 serviceType,
//                 phone: purchase.phone,
//                 templateName: "water_filter_check",
//                 direction: "outgoing",
//                 text: "Service reminder sent",
//                 timestamp: new Date()
//             });
//             console.log('purchase.phone', purchase.phone);

//             // 2️⃣ Send WhatsApp
//             await sendTemplateMessage(
//                 purchase.phone,
//                 "water_filter_check",
//                 [purchase.customerName]   // optional template variables
//             );

//             console.log(`📤 ${serviceType} reminder sent to ${purchase.phone}`);
//         }
//     }
// });


import cron from "node-cron";
import Purchase from "../models/purchase.model.js";
import User from "../models/user.model.js";
import WhatsAppMessage from "../models/whatsappMessage.model.js";
import { sendTemplateMessage } from "./whatsapp.service.js";

cron.schedule("* * * * *", async () => {
    console.log("⏰ WhatsApp Reminder Cron Started");

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const purchases = await Purchase.find({
        status: "active",
        $or: [
            { nextECleaning: { $gte: start, $lte: end } },
            { nextFilterCheck: { $gte: start, $lte: end } },
            { nextDeepCleaning: { $gte: start, $lte: end } }
        ]
    });

    for (const purchase of purchases) {
        const user = await User.findById(purchase.userId);
        if (!user) continue;

        const tasks = [];

        if (purchase.nextECleaning >= start && purchase.nextECleaning <= end) {
            tasks.push("e_cleaning");
        }
        if (purchase.nextFilterCheck >= start && purchase.nextFilterCheck <= end) {
            tasks.push("filter");
        }
        if (purchase.nextDeepCleaning >= start && purchase.nextDeepCleaning <= end) {
            tasks.push("deep_clean");
        }

        for (const serviceType of tasks) {
            let templateName = "";

            if (serviceType === "e_cleaning") {
                templateName = "ro_ecleaning_reminder";
            }
            if (serviceType === "filter") {
                templateName = "ro_filter_reminder";
            }
            if (serviceType === "deep_clean") {
                templateName = "ro_deepclean_reminder";
            }

            // 1️⃣ Save outgoing message
            await WhatsAppMessage.create({
                userId: user._id,
                purchaseId: purchase._id,
                serviceType,
                phone: purchase.phone,
                templateName, // 👈 correct template
                direction: "outgoing",
                text: "Service reminder sent",
                timestamp: new Date()
            });

            // 2️⃣ Send WhatsApp
            await sendTemplateMessage(
                purchase.phone,
                templateName,
                [purchase.customerName]
            );

            console.log(`📤 ${serviceType} reminder sent to ${purchase.phone}`);
        }
    }
});
