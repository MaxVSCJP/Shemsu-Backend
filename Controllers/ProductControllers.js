const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { check, body, param, validationResult } = require("express-validator");
const Products = require("../Models/ProductModel");
const User = require("../Models/UserModel");
require("dotenv").config();

exports.AddProduct = [
  body("ProductName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("ProductName is required")
    .matches(/^[a-zA-Z0-9\s:-]+$/)
    .withMessage("Invalid product title"),

  body("Category")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        value = JSON.parse(value); // Parse JSON string to array
      }
      if (!Array.isArray(value)) {
        throw new Error("Category must be an array of strings");
      }
      if (!value.every((category) => typeof category === "string")) {
        throw new Error("Each category must be a string");
      }
      return true;
    }),
  body("Description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description should not exceed 2000 characters")
    .matches(/^[a-zA-Z0-9\s:,.\-']+$/)
    .withMessage("Invalid description"),

  body("Quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Number of Quantity must be a positive integer"),

  body("Price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  check("image")
    .optional()
    .custom((value, { req }) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Only JPG, PNG, WebP, and GIF images are allowed");
      }
      return true;
    })
    .custom((value, { req }) => {
      if (req.file.size > 6 * 1024 * 1024) {
        throw new Error("Image size should not exceed 10MB");
      }
      return true;
    }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.body.Category) {
      req.body.Category = JSON.parse(req.body.Category).map((g) => g.trim());
    }

    const { ProductName, Category, Quantity, Description, Price } = req.body;

    let result;
    if (req.file) {
      const uploadFromBuffer = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "ProductImages",
              width: 500,
              crop: "scale",
              quality: "60",
              format: "webp",
              unique_filename: true,
            },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          stream.end(buffer);
        });
      };

      result = await uploadFromBuffer(req.file.buffer);
    }

    const newProduct = new Products({
      ProductName,
      Category,
      Quantity,
      Description,
      Price,
      owner: req.user.userId,
      ProductImageURL: result ? result.secure_url : null,
      ProductImageID: result ? result.public_id : null,
    });

    try {
      const data = await newProduct.save();

      await User.findByIdAndUpdate(req.user.userId, {
        $push: { products: data._id },
      });
      res.status(201).json({ Status: "Successful", data });
    } catch (err) {
      console.error("Failed to Add Product: ", err);
      res
        .status(500)
        .json({ Status: "Failed", message: "Failed to add Product" });
    }
  },
];

exports.DeleteProduct = [
  param("productId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Product ID"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.productId;

    try {
      const product = await Products.findById(productId).select(
        "owner ProductImageID"
      );

      if (!product) {
        return res
          .status(404)
          .json({ Status: "Failed", message: "Product not found" });
      }

      if (product.owner.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ Status: "Failed", message: "Unauthorized to Delete" });
      }

      if (product.ProductImageID) {
        await cloudinary.uploader.destroy(product.ProductImageID, (error) => {
          if (error) {
            res.status(500).json({
              Status: "Failed",
              message: "Failed to Delete Product",
            });
          }
        });
      }

      await User.findByIdAndUpdate(req.user.userId, {
        $pull: { products: productId },
      });

      await Products.findByIdAndDelete(productId);

      res.status(204).send();
    } catch (err) {
      console.error("Failed to Delete Product: ", err);
      res
        .status(500)
        .json({ Status: "Failed", message: "Failed to Delete Product" });
    }
  },
];

exports.SearchProduct = [
  param("name")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Product name cannot be empty")
    .matches(/^[a-zA-Z0-9\s+]+$/)
    .withMessage("Invalid product name"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let name = req.params.name;
    name = name.replace("+", " ");

    try {
      const products = await Products.find({
        owner: req.user.userId,
        $or: [
          { ProductName: { $regex: `.*${name}.*`, $options: "i" } },
          { Category: { $regex: `.*${name}.*`, $options: "i" } },
        ],
      });

      if (!products.length) {
        return res
          .status(404)
          .json({ Status: "Failed", message: "No Products found" });
      }

      res.json({
        Status: "Successful",
        products,
      });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ Status: "Failed", message: "Failed to Find product" });
    }
  },
];

exports.EditProduct = [
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid Product ID"),

  body("ProductName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product needs a name")
    .matches(/^[a-zA-Z0-9\s:-]+$/)
    .withMessage("Invalid product name"),

  body("Category")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        value = JSON.parse(value); // Parse JSON string to array
      }
      if (!Array.isArray(value)) {
        throw new Error("Category must be an array of strings");
      }
      if (!value.every((category) => typeof category === "string")) {
        throw new Error("Each category must be a string");
      }
      return true;
    }),

  body("Quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("Description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description should not exceed 2000 characters"),

  body("Price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  check("image")
    .optional()
    .custom((value, { req }) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error("Only JPG, PNG, WebP, and GIF images are allowed");
      }
      return true;
    })
    .custom((value, { req }) => {
      if (req.file.size > 6 * 1024 * 1024) {
        throw new Error("Image size should not exceed 10MB");
      }
      return true;
    }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (req.body.Category) {
        req.body.Category = JSON.parse(req.body.Category).map((g) => g.trim());
      }
      const productId = req.params.id;
      const updateData = req.body;

      const product = await Products.findById(productId).select(
        "owner ProductImageID"
      );

      if (!product) {
        return res
          .status(404)
          .json({ Status: "Failed", message: "Product not found" });
      }

      if (product.owner.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ Status: "Failed", message: "Unauthorized to edit" });
      }

      let result;
      if (req.file) {
        await cloudinary.uploader.destroy(product.ProductImageID, (error) => {
          if (error) {
            res.status(500).json({
              Status: "Failed",
              message: "Failed to delete previous product image",
            });
          }
        });

        const uploadFromBuffer = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                public_id: product.ProductImageID.replace("ProductImages/", ""),
                folder: "ProductImages",
                width: 500,
                crop: "scale",
                quality: "60",
                format: "webp",
              },
              (error, result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(error);
                }
              }
            );
            stream.end(buffer);
          });
        };

        result = await uploadFromBuffer(req.file.buffer);

        updateData.ProductImageURL = result.secure_url;
      }

      const updatedProduct = await Products.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
      console.log(error);
    }
  },
];
