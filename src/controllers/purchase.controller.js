import Purchase from "../models/purchase.model.js";
import Product from "../models/product.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { addDays } from "../utils/helper.js";

/**
 * CREATE PURCHASE
 */
export const createPurchase = async (req, res, next) => {
    try {
        const { productId, customerName, phone, salesDate } = req.body;

        if (!productId || !customerName || !phone || !salesDate) {
            throw new ApiError(400, "All fields are required");
        }

        const product = await Product.findOne({
            _id: productId,
            userId: req.user._id
        });

        if (!product) {
            throw new ApiError(404, "Product not found");
        }

        const saleDate = new Date(salesDate);

        const purchase = await Purchase.create({
            userId: req.user._id,
            productId,
            customerName,
            phone,
            salesDate: saleDate,

            lastECleaning: null,
            lastFilterCheck: null,
            lastDeepCleaning: null,

            nextECleaning: addDays(saleDate, product.eCleaningDays),
            nextFilterCheck: addDays(saleDate, product.filterDays),
            nextDeepCleaning: addDays(saleDate, product.deepCleanDays)
        });

        res.status(201).json(
            new ApiResponse(201, purchase, "Purchase created successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET ALL PURCHASES (Excel view)
 */
export const getPurchases = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";

        const pipeline = [
            {
                $match: {
                    userId: req.user._id,
                    $or: [
                        { customerName: { $regex: search, $options: "i" } },
                        { phone: { $regex: search, $options: "i" } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $project: {
                    customerName: 1,
                    phone: 1,
                    salesDate: 1,
                    nextECleaning: 1,
                    nextFilterCheck: 1,
                    nextDeepCleaning: 1,
                    status: 1,
                    "product.name": 1
                }
            }
        ];

        const aggregate = Purchase.aggregate(pipeline);

        const result = await Purchase.aggregatePaginate(aggregate, {
            page,
            limit,
            sort: { createdAt: -1 }
        });

        res.status(200).json(
            new ApiResponse(200, {
                items: result.docs,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                    totalRecords: result.totalDocs
                }
            }, "Purchases fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};


/**
 * GET SINGLE PURCHASE
 */
export const getPurchaseById = async (req, res, next) => {
    try {
        const purchase = await Purchase.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate("productId", "name");

        if (!purchase) {
            throw new ApiError(404, "Purchase not found");
        }

        res.status(200).json(
            new ApiResponse(200, purchase, "Purchase fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * UPDATE CUSTOMER DETAILS (NOT service dates)
 */
export const updatePurchase = async (req, res, next) => {
    try {
        const allowedFields = ["customerName", "phone", "status"];

        const updateData = {};
        allowedFields.forEach((f) => {
            if (req.body[f] !== undefined) updateData[f] = req.body[f];
        });

        const purchase = await Purchase.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            updateData,
            { new: true }
        );

        if (!purchase) {
            throw new ApiError(404, "Purchase not found");
        }

        res.status(200).json(
            new ApiResponse(200, purchase, "Purchase updated successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE PURCHASE
 */
export const deletePurchase = async (req, res, next) => {
    try {
        const purchase = await Purchase.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!purchase) {
            throw new ApiError(404, "Purchase not found");
        }

        res.status(200).json(
            new ApiResponse(200, null, "Purchase deleted successfully")
        );
    } catch (error) {
        next(error);
    }
};
