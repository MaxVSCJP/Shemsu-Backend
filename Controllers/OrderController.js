const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const https = require("https");
const Orders = require("../Models/OrderModel");
const Products = require("../Models/ProductModel");
const User = require("../Models/UserModel");
const emailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const transporter = emailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Ignore self-signed certificate errors
  }),
});

const CHAPA_URL =
  process.env.CHAPA_URL || "https://api.chapa.co/v1/transaction/initialize";
const CHAPA_AUTH = process.env.CHAPA_AUTH;

const config = {
  headers: {
    Authorization: `Bearer ${CHAPA_AUTH}`,
  },
};

exports.BuyProduct = [
  body("FirstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("First Name is required")
    .matches(/^[a-zA-Z]+$/)
    .withMessage("Invalid First Name"),

  body("LastName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Last Name is required")
    .matches(/^[a-zA-Z]+$/)
    .withMessage("Invalid Last Name"),

  body("Phone")
    .matches(/^\+?[0-9\s\-\(\)]+$/)
    .withMessage("Invalid phone number")
    .isLength({ min: 9, max: 15 })
    .withMessage("Phone number must be between 9 and 15 characters long"),

  body("Price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("ProductName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("ProductName is required")
    .matches(/^[a-zA-Z0-9\s:-]+$/)
    .withMessage("Invalid product title"),

  body("OwnerId")
    .custom((value) => {
      console.log("OwnerId:", value); // Log OwnerId for debugging
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage("Invalid Owner ID"),

  body("ProductId")
    .custom((value) => {
      console.log("ProductId:", value); // Log ProductId for debugging
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage("Invalid Product ID"),

  body("Quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),

  body("ReturnURL")
    .trim()
    .isLength({ min: 1 })
    .withMessage("ReturnURL is required")
    .matches(
      /^https:\/\/(shemsu\.(pro\.et|netlify\.app)|localhost:(5173|3000))\/product\/[a-zA-Z0-9]+$/
    )
    .withMessage("Invalid Return URL"),

  async (req, res) => {
    const {
      FirstName,
      LastName,
      Phone,
      Price,
      ProductName,
      OwnerId,
      ProductId,
      ReturnURL,
      Quantity,
      BuyerEmail,
    } = req.body;
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const Product = await Products.findById(ProductId);

    if (Product.Quantity < Quantity) {
      res.status(400).json({ message: "Order Amount more than available" });
    }

    const CALLBACK_URL = `${process.env.SERVER_URL}/order/verify-payment/`;

    const TEXT_REF = "tx-anbibuProductBuy-" + Date.now();

    const customData = `${ProductName}   ${ProductId}   ${Quantity}`;
    console.log(customData);
    /* 
    ProductName,
      ProductId,
      OwnerId,
      Phone,
      Quantity,
      BuyerEmail, */

    const data = {
      amount: `${Price * Quantity}`,
      currency: "ETB",
      phone_number: Phone,
      first_name: FirstName + "," + `${OwnerId}`,
      last_name: LastName + "," + `${BuyerEmail}`,
      tx_ref: TEXT_REF,
      callback_url: CALLBACK_URL + TEXT_REF,
      return_url: ReturnURL,
      customization: {
        title: `${Phone}`,
        description: customData,
      },
    };

    await axiosInstance
      .post(CHAPA_URL, data, config)
      .then((response) => {
        res.status(200).json({ checkout_url: response.data.data.checkout_url });
        setTimeout(async () => {
          await axiosInstance
            .get(CALLBACK_URL + TEXT_REF)
            .catch((err) => console.log("First error: ", err.message));
        }, 10000);
      })
      .catch((err) => console.log("making payment error", err.message));
  },
];

exports.VerifyPayment = async (req, res) => {
  var requestOptions = {
    method: "GET",
    headers: config.headers,
    redirect: "follow",
  };
  fetch(
    "https://api.chapa.co/v1/transaction/verify/" + req.params.id,
    requestOptions
  )
    .then((response) => response.json())
    .then(async (result) => {
      let { first_name, last_name, amount } = result.data;
      const Phone = result.data.customization.title;

      const firstNameParts = first_name.split(",");
      first_name = firstNameParts[0];
      let OwnerId = firstNameParts[1];

      let lastNameParts = last_name.split(",");
      last_name = lastNameParts[0];
      let BuyerEmail = lastNameParts[1];

      let someData = result.data.customization.description.split("   ");
      let ProductName = someData[0];
      let ProductId = someData[1];
      let Quantity = someData[2];

      let newOrder;
      try {
        const product = await Products.findById(ProductId);
        if (!product) {
          return res.status(404).json({ msg: "Product not found" });
        }
        const user = await User.findById(OwnerId);
        console.log(user);
        if (!user) {
          return res.status(404).json({ msg: "User not found" });
        }

        newOrder = new Orders({
          Buyer: first_name + " " + last_name,
          Seller: OwnerId,
          Product: ProductId,
          ProductName,
          BuyerPhone: Phone,
          Price: amount,
          Quantity,
          ProductImageURL: product.ProductImageURL,
        });
        console.log("here4");
        await newOrder.save();
        console.log("Payment Successful. Order placed successfully");
      } catch (error) {
        console.error("Making Order Error: ", error);
      }

      let updateProduct;

      console.log("here5");
      try {
        updateProduct = await Products.findByIdAndUpdate(
          ProductId,
          { $inc: { Quantity: -Quantity } },
          { new: true }
        );
        if (updateProduct.Quantity == 0) {
          const product = await Products.findById(ProductId).select(
            "owner ProductImageID"
          );

          if (product.ProductImageID) {
            await cloudinary.uploader.destroy(
              product.ProductImageID,
              (error) => {
                if (error) {
                  res.status(500).json({
                    Status: "Failed",
                    message: "Failed to Delete Product",
                  });
                }
              }
            );
          }

          await User.findByIdAndUpdate(product.owner, {
            $pull: { products: ProductId },
          });

          await Products.findByIdAndDelete(ProductId);
        }
      } catch (error) {
        console.error("Updating Product Error: ");
      }

      console.log("here6");
      let user;

      try {
        user = await User.findById(OwnerId);
        // const transferData = {
        //   account_name: user.name,
        //   account_number: user.BankAccount,
        //   amount: amount * 0.95,
        //   currency: "ETB",
        //   reference:
        //     "tx-anbibuProductTransfer-" +
        //     ProductId +
        //     "-" +
        //     user.name +
        //     "-" +
        //     Date.now(),
        //   bank_code: 946,
        // };
        // console.log("here7");
        // console.log(transferData);

        var raw = {
          account_name: user.name,
          account_number: user.BankAccount,
          amount: amount * 0.95,
          currency: "ETB",
          reference:
            "tx-anbibuProductTransfer-" +
            ProductId +
            "-" +
            user.name +
            "-" +
            Date.now(),
          bank_code: 946,
        };
        var requestOptions = {
          method: "POST",
          headers: config.headers,
          body: raw,
          redirect: "follow",
        };

        try {
          console.log(requestOptions);
          await fetch("https://api.chapa.co/v1/transfers", {
            method: "POST",
            headers: config.headers,
            body: raw,
          })
            .then((response) => response.json())
            .then((result) => console.log(result));
        } catch (error) {
          console.error("Transfering Payment Error: ", error);
        }

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: BuyerEmail,
            subject: "Your order has been created successfully",
            text: `Your order Details are stated Below:\n
            Product Name: ${ProductName}\n
            Quantity: ${Quantity}\n
            Price: ${amount}\n
            Order Date: ${newOrder.OrderDate}\n
            Delivery Date: ${newOrder.DeliveryDate}\n
            Seller Name: ${user.name}\n
            Seller Phone Number: ${user.phone}`,
          });
          res.status(201).json({ message: "Verification email sent." });
        } catch (err) {
          console.log("sending mail error", err);
          if (!res.headersSent) {
            res
              .status(500)
              .json({ message: "Error sending email.", error: err.message });
          }
        }

        res.status(200).json({
          Status: "Successful",
          message: "Payment Verified and Transfered",
        });
      } catch (error) {
        console.log("Transfering Payment Error ", error);
      }
    })
    .catch((err) => console.log("Payment can't be verfied: ", err));
};

exports.OrderHistory = async (req, res) => {
  try {
    console.log(req.user.userId);
    const orders = await Orders.find({ Seller: req.user.userId });
    if (!orders) {
      return res.status(404).json({
        Status: "Failed",
        message: "No Orders Found",
      });
    }
    res.status(200).json(orders);
  } catch (error) {
    console.error("Order History Error: ", error);
    res.status(500).json({
      Status: "Failed",
      message: "Failed to get Orders",
    });
  }
};

exports.FinishOrder = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({
        Status: "Failed",
        message: "Order not found",
      });
    }

    if (order.Seller != req.user.userId) {
      return res.status(403).json({
        Status: "Failed",
        message: "You are not authorized to finish this order",
      });
    }

    const updatedOrder = await Orders.findByIdAndUpdate(
      orderId,
      { OrderStatus: "Delivered" },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Finish Order Error: ", error);
    res.status(500).json({
      Status: "Failed",
      message: "Failed to Finish Order",
    });
  }
};

exports.CancelOrder = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({
        Status: "Failed",
        message: "Order not found",
      });
    }

    if (order.Seller != req.user.userId) {
      return res.status(403).json({
        Status: "Failed",
        message: "You are not authorized to finish this order",
      });
    }

    const updatedOrder = await Orders.findByIdAndUpdate(
      orderId,
      { OrderStatus: "Cancelled" },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Cancel Order Error: ", error);
    res.status(500).json({
      Status: "Failed",
      message: "Failed to Cancel Order",
    });
  }
};
