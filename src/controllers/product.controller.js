import Product from "../models/product.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

/**
 * CREATE PRODUCT
 * Business creates a new machine model (SD501, K8, etc)
 */
export const createProduct = async (req, res, next) => {
    try {
        const { name, eCleaningDays, filterDays, deepCleanDays } = req.body;

        if (!name) {
            throw new ApiError(400, "Product name is required");
        }

        const product = await Product.create({
            userId: req.user._id, // very important for multi-tenant
            name,
            eCleaningDays,
            filterDays,
            deepCleanDays
        });

        res.status(201).json(
            new ApiResponse(201, product, "Product created successfully")
        );
    } catch (error) {
        // Duplicate product name for same business
        if (error.code === 11000) {
            return next(new ApiError(400, "You already have a product with this name"));
        }
        next(error);
    }
};

/**
 * GET ALL PRODUCTS (for logged-in business)
 */
export const getProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ userId: req.user._id }).sort({ createdAt: -1 });

        res.status(200).json(
            new ApiResponse(200, products, "Products fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET SINGLE PRODUCT
 */
export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        res.status(200).json(
            new ApiResponse(200, product, "Product fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * UPDATE PRODUCT
 */
export const updateProduct = async (req, res, next) => {
    try {
        const allowedFields = [
            "name",
            "eCleaningDays",
            "filterDays",
            "deepCleanDays"
        ];

        const updateData = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        res.status(200).json(
            new ApiResponse(200, product, "Product updated successfully")
        );
    } catch (error) {
        if (error.code === 11000) {
            return next(new ApiError(400, "You already have a product with this name"));
        }
        next(error);
    }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        res.status(200).json(
            new ApiResponse(200, null, "Product deleted successfully")
        );
    } catch (error) {
        next(error);
    }
};
