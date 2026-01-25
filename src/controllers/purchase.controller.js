import Purchase from "../models/purchase.model.js";
import Product from "../models/product.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { addDays } from "../utils/helper.js";
import mongoose from "mongoose";

/**
 * CREATE PURCHASE
 */
export const createPurchase = async (req, res, next) => {
    try {
        const { productIds, customerName, phone, salesDate } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0 || !customerName || !phone || !salesDate) {
            throw new ApiError(400, "All fields are required and at least one product must be selected");
        }

        // Validate phone number format (must be exactly 10 digits)
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            throw new ApiError(400, "Phone number must be exactly 10 digits");
        }

        // Check if phone number already exists for this user
        const existingPurchase = await Purchase.findOne({
            userId: req.user._id,
            phone: phone
        });

        if (existingPurchase) {
            throw new ApiError(400, "A purchase with this phone number already exists");
        }

        // Validate all products exist and belong to the user
        const products = await Product.find({
            _id: { $in: productIds },
            userId: req.user._id
        });

        if (products.length !== productIds.length) {
            throw new ApiError(404, "One or more products not found");
        }

        const saleDate = new Date(salesDate);

        // Use the first product's settings for service dates
        const firstProduct = products[0];

        const purchase = await Purchase.create({
            userId: req.user._id,
            productIds,
            customerName,
            phone,
            salesDate: saleDate,

            lastECleaning: null,
            lastFilterCheck: null,
            lastDeepCleaning: null,

            nextECleaning: addDays(saleDate, firstProduct.eCleaningDays),
            nextFilterCheck: addDays(saleDate, firstProduct.filterDays),
            nextDeepCleaning: addDays(saleDate, firstProduct.deepCleanDays)
        });

        res.status(201).json(
            new ApiResponse(201, purchase, "Purchase created successfully")
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET ALL PURCHASES
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
                    localField: "productIds",
                    foreignField: "_id",
                    as: "products"
                }
            },
            {
                $addFields: {
                    productNames: {
                        $reduce: {
                            input: "$products",
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                                    "$$this.name"
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    customerName: 1,
                    phone: 1,
                    salesDate: 1,
                    nextECleaning: 1,
                    nextFilterCheck: 1,
                    nextDeepCleaning: 1,
                    status: 1,
                    productNames: 1
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
 * GET ALL PURCHASES TABLE VIEW (Excel view)
 */
export const getPurchaseTable = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";

        const pipeline = [
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user._id),
                    $or: [
                        { customerName: { $regex: search, $options: "i" } },
                        { phone: { $regex: search, $options: "i" } }
                    ]
                }
            },

            // 🔹 Join Products
            {
                $lookup: {
                    from: "products",
                    localField: "productIds",
                    foreignField: "_id",
                    as: "products"
                }
            },
            {
                $addFields: {
                    productName: {
                        $reduce: {
                            input: "$products",
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                                    "$$this.name"
                                ]
                            }
                        }
                    }
                }
            },

            // 🔹 Join WhatsApp messages
            {
                $lookup: {
                    from: "whatsappmessages",
                    localField: "_id",
                    foreignField: "purchaseId",
                    as: "messages"
                }
            },

            // 🔹 Shape data for Excel-style UI
            {
                $project: {
                    salesDate: 1,
                    customerName: 1,
                    phone: 1,
                    productName: 1,

                    eCleaning: {
                        $let: {
                            vars: {
                                msg: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: {
                                                    $sortArray: {
                                                        input: "$messages",
                                                        sortBy: { timestamp: -1 }
                                                    }
                                                },
                                                as: "m",
                                                cond: {
                                                    $and: [
                                                        { $eq: ["$$m.serviceType", "e_cleaning"] },
                                                        { $eq: ["$$m.direction", "incoming"] }
                                                    ]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            },
                            in: { $ifNull: ["$$msg.responseType", "-"] }
                        }
                    },

                    filterCheck: {
                        $let: {
                            vars: {
                                msg: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: {
                                                    $sortArray: {
                                                        input: "$messages",
                                                        sortBy: { timestamp: -1 }
                                                    }
                                                },
                                                as: "m",
                                                cond: {
                                                    $and: [
                                                        { $eq: ["$$m.serviceType", "filter"] },
                                                        { $eq: ["$$m.direction", "incoming"] }
                                                    ]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            },
                            in: { $ifNull: ["$$msg.responseType", "-"] }
                        }
                    },

                    deepCleaning: {
                        $let: {
                            vars: {
                                msg: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: {
                                                    $sortArray: {
                                                        input: "$messages",
                                                        sortBy: { timestamp: -1 }
                                                    }
                                                },
                                                as: "m",
                                                cond: {
                                                    $and: [
                                                        { $eq: ["$$m.serviceType", "deep_clean"] },
                                                        { $eq: ["$$m.direction", "incoming"] }
                                                    ]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            },
                            in: { $ifNull: ["$$msg.responseType", "-"] }
                        }
                    },

                    remark: {
                        $let: {
                            vars: {
                                msg: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: {
                                                    $sortArray: {
                                                        input: "$messages",
                                                        sortBy: { timestamp: -1 }
                                                    }
                                                },
                                                as: "m",
                                                cond: { $eq: ["$$m.serviceType", "remark"] }
                                            }
                                        },
                                        0
                                    ]
                                }
                            },
                            in: { $ifNull: ["$$msg.remark", "-"] }
                        }
                    }

                }
            }
        ];

        const aggregate = Purchase.aggregate(pipeline);

        const result = await Purchase.aggregatePaginate(aggregate, {
            page,
            limit,
            sort: { salesDate: -1 }
        });

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    items: result.docs,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        totalRecords: result.totalDocs
                    }
                },
                "Purchase table fetched successfully"
            )
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
        }).populate("productIds", "name");

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

        // If phone is being updated, check for uniqueness
        if (updateData.phone) {
            // Validate phone number format
            const cleanPhone = updateData.phone.replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                throw new ApiError(400, "Phone number must be exactly 10 digits");
            }

            // Check if phone already exists for another purchase
            const existingPurchase = await Purchase.findOne({
                userId: req.user._id,
                phone: updateData.phone,
                _id: { $ne: req.params.id } // Exclude current purchase
            });

            if (existingPurchase) {
                throw new ApiError(400, "A purchase with this phone number already exists");
            }
        }

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
