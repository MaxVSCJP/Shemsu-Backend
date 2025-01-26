const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/UserControllers");
const authMW = require("../Middlewares/AuthorizationMW");
const csrf = require("../Middlewares/CSRFProtectionMW");
const morgan = require("morgan");
const morganLogs = require("../Middlewares/MorganLogs");

router.get("/GetUser", authMW(), csrf.csrfProtection, UserController.GetUser);
router.patch(
  "/EditUser",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  UserController.EditUser
);
router.delete(
  "/DeleteUser",
  authMW(),
  csrf.csrfProtection,
  morgan(morganLogs.logFormat, { stream: morganLogs.stream }),
  UserController.DeleteUser
);

module.exports = router;
