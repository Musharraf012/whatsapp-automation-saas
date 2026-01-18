/**
 * Helper: add days to a date
 */
export const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

/**
* Normalize WhatsApp incoming number to DB format (India)
* 9876543210 → 919876543210
*/
export const formatNumberForWhatsAppTemplate = (number) => {
    let cleaned = number.toString().replace(/\D/g, ""); // remove non-digits

    if (cleaned.startsWith("91") && cleaned.length === 12) {
        return cleaned;
    }

    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }

    // fallback (return as-is for non-India or already correct)
    return cleaned;
};

/**
* Normalize WhatsApp incoming number to DB format (India)
* 919876543210 → 9876543210
*/
export const normalizeWhatsAppReplyNumber = (number) => {
    let cleaned = number.toString().replace(/\D/g, "");

    // Remove India country code if present
    if (cleaned.startsWith("91") && cleaned.length === 12) {
        return cleaned.slice(2);
    }

    // Already local format
    if (cleaned.length === 10) {
        return cleaned;
    }

    return cleaned; // fallback
};
