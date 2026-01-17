import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },      // Business name
    email: { type: String, required: true, unique: true },
    phone: { type: String },

    password: { type: String, required: true },

    // Meta WhatsApp details
    whatsappBusinessId: String,
    phoneNumberId: String,

    // Optional — for SaaS multi-business mode
    // If not present, system will use .env token
    whatsappAccessToken: String

}, { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
