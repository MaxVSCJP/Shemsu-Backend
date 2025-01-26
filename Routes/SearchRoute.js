const express = require("express");
const router = express.Router();
const SearchController = require("../Controllers/SearchController");
const morgan = require("morgan");
const morganLogs = require("../Middlewares/MorganLogs");

router.get(
  "/product/:name",
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  SearchController.SearchProduct
);
router.get(
  "/owner/:id",
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  SearchController.SearchOwner
);

module.exports = router;
