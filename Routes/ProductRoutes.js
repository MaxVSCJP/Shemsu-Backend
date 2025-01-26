const express = require("express");
const multer = require("multer");
const router = express.Router();
const ProductController = require("../Controllers/ProductControllers");
const authMW = require("../Middlewares/AuthorizationMW");
const csrf = require("../Middlewares/CSRFProtectionMW");
const morgan = require("morgan");
const morganLogs = require("../Middlewares/MorganLogs");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/AddProduct",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  upload.single("image"),
  ProductController.AddProduct
);
router.get(
  "/SearchProduct/:name",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  ProductController.SearchProduct
);
router.patch(
  "/EditProduct/:id",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  upload.single("image"),
  ProductController.EditProduct
);
router.delete(
  "/DeleteProduct/:productId",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  ProductController.DeleteProduct
);

module.exports = router;
