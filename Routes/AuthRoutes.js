const express = require("express");
const router = express.Router();
const authController = require("../Controllers/AuthControllers");
const usernameAvailabilityMW = require("../Middlewares/UsernameAvailabilityMW");
const authMW = require("../Middlewares/AuthorizationMW");
const csrf = require("../Middlewares/CSRFProtectionMW");

router.post("/login", authController.Login);
router.post("/signup", usernameAvailabilityMW, authController.Signup);
router.post("/logout", authMW(), csrf.csrfProtection, authController.Logout);
router.get(
  "/check",
  authMW(),
  csrf.csrfProtection,
  authController.checkLogStatus
);

router.post("/verify", authController.Verify);

module.exports = router;
