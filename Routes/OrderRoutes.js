const express = require("express");
const router = express.Router();
const multer = require("multer");
const OrderController = require("../Controllers/OrderController");
const authMW = require("../Middlewares/AuthorizationMW");
const csrf = require("../Middlewares/CSRFProtectionMW");
const morgan = require("morgan");
const morganLogs = require("../Middlewares/MorganLogs");

const upload = multer().none();

router.post(
  "/BuyProduct",
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  upload,
  OrderController.BuyProduct
);

router.get(
  "/verify-payment/:id",
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  OrderController.VerifyPayment
);

router.get(
  "/history",
  authMW(),
  csrf.csrfProtection,
  OrderController.OrderHistory
);

router.patch(
  "/finish/:id",
  authMW(),
  csrf.csrfProtection,
  OrderController.FinishOrder
);

router.patch(
  "/cancel/:id",
  authMW(),
  csrf.csrfProtection,
  OrderController.CancelOrder
);

module.exports = router;
