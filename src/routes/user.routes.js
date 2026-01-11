import express from "express";
import { register, login, getProfile, updateUser, getAllUsers, changePassword } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/", protect, getAllUsers);
router.get("/me", protect, getProfile);
router.put("/me", protect, updateUser);
router.put("/change-password", protect, changePassword);



export default router;
