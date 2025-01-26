const mongoose = require("mongoose");

const OrderModel = new mongoose.Schema({
  Buyer: {
    type: String,
    required: true,
  },
  BuyerPhone: {
    type: String,
    required: true,
  },
  Seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  Product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  ProductName: {
    type: String,
    required: true,
  },
  Price: {
    type: Number,
    required: true,
  },
  Quantity: {
    type: Number,
  },
  OrderDate: {
    type: Date,
    default: Date.now,
  },
  DeliveryDate: {
    type: Date,
    required: false,
  },
  OrderStatus: {
    type: String,
    enum: ["Pending", "Delivered", "Cancelled"],
    default: "Pending",
  },
  ProductImageURL: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model("Order", OrderModel);
