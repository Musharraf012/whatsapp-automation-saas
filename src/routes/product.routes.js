import express from "express";
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * All product routes are protected
 * Only logged-in businesses can access their own products
 */
router.use(protect);

// Create product
router.post("/", createProduct);

// Get all products of this business
router.get("/", getProducts);

// Get one product
router.get("/:id", getProductById);

// Update product
router.put("/:id", updateProduct);

// Delete product
router.delete("/:id", deleteProduct);

export default router;
