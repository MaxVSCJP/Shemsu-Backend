const { param, validationResult } = require("express-validator");
const Products = require("../Models/ProductModel");
const User = require("../Models/UserModel");

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

    const name = req.params.name;

    try {
      const products = await Products.find({
        $or: [
          { ProductName: { $regex: `.*${name}.*`, $options: "i" } },
          { Category: { $regex: `.*${name}.*`, $options: "i" } },
        ],
      });

      if (!Products.length) {
        return res
          .status(404)
          .json({ Status: "Failed", message: "No products found" });
      }

      res.status(200).json({
        Status: "Successful",
        products,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ Status: "Failed", message: err.message });
    }
  },
];

exports.SearchOwner = [
  param("id")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Product ID cannot be empty")
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage("Invalid product id"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = req.params.id;

    try {
      const owner = await User.findById(id).select("username email");

      if (!owner) {
        return res
          .status(404)
          .json({ Status: "Failed", message: "No Owner found with such id" });
      }

      res.status(200).json({
        Status: "Successful",
        owner,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ Status: "Failed", message: err.message });
    }
  },
];
