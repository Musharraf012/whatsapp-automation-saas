import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

/**
 * REGISTER BUSINESS
 */
export const register = async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            whatsappBusinessId,
            phoneNumberId
        } = req.body;

        if (!name || !email || !password) {
            throw new ApiError(400, "Name, Email and Password are required");
        }

        const exists = await User.findOne({ email });
        if (exists) {
            throw new ApiError(400, "Email already exists");
        }

        const user = await User.create({
            name,
            email,
            password,
            phone,
            whatsappBusinessId,
            phoneNumberId
        });

        const token = generateToken(user._id);

        // Remove password from response
        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json(
            new ApiResponse(
                201,
                { token, user: userObj },
                "Business account created successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * LOGIN BUSINESS
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(401, "Invalid email or password");
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new ApiError(401, "Invalid email or password");
        }

        const token = generateToken(user._id);

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json(
            new ApiResponse(
                200,
                { token, user: userObj },
                "Login successful"
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET LOGGED-IN BUSINESS PROFILE
 */
export const getProfile = async (req, res) => {
    res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Business profile fetched successfully"
        )
    );
};

/**
 * GET ALL BUSINESS PROFILE
 */
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-password");

        res.status(200).json(
            new ApiResponse(
                200,
                users,
                "All business accounts fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};


/**
 * UPDATE LOGGED-IN BUSINESS PROFILE
 */
export const updateUser = async (req, res, next) => {
    try {
        const allowedFields = [
            "name",
            "phone",
            "whatsappBusinessId",
            "phoneNumberId"
        ];

        const updateData = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            throw new ApiError(400, "No valid fields provided for update");
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json(
            new ApiResponse(
                200,
                updatedUser,
                "Business profile updated successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * CHANGE PASSWORD FOR LOGGED-IN BUSINESS
 */
export const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            throw new ApiError(400, "Old and new password are required");
        }

        const user = await User.findById(req.user._id);

        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            throw new ApiError(401, "Old password is incorrect");
        }

        user.password = newPassword;   // bcrypt will hash via pre-save
        await user.save();

        res.status(200).json(
            new ApiResponse(200, null, "Password changed successfully")
        );
    } catch (error) {
        next(error);
    }
};
