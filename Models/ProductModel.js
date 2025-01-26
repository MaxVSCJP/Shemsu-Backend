const mongoose = require("mongoose");

const productModel = new mongoose.Schema({
  ProductName: {
    type: String,
    required: true,
  },
  Category: {
    type: [String],
  },
  Quantity: {
    type: Number,
    default: 1,
  },
  Description: {
    type: String,
    required: false,
  },
  Price: {
    type: Number,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ProductImageID: {
    type: String,
    required: false,
  },
  ProductImageURL: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("Product", productModel);
