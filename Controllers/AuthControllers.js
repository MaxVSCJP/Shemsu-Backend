const User = require("../Models/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const csrf = require("../Middlewares/CSRFProtectionMW");
const { body, validationResult } = require("express-validator");
const emailer = require("nodemailer");
require("dotenv").config();

const transporter = emailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.Signup = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 4 })
    .withMessage("Username must be at least 4 characters long"),

  body("email")
    .matches(/.*aau.edu.et$/)
    .withMessage("Invalid email address. Must be an AAU email address")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

  body("location")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),

  body("phone")
    .matches(/^\+?[0-9\s\-\(\)]+$/)
    .withMessage("Invalid phone number")
    .isLength({ min: 9, max: 15 })
    .withMessage("Phone number must be between 9 and 15 characters long"),

  body("BankAccount")
    .isInt()
    .withMessage("Invalid bank account number")
    .isLength({ min: 13, max: 13 })
    .withMessage("Bank account number must be 13 characters long"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, username, email, password, location, phone, BankAccount } =
      req.body;

    try {
      const existingUser = await User.findOne({
        $or: [{ email }, { username }, { phone }],
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Email, Username, or Phone Number already in use" });
      }

      const hashed = await bcrypt.hash(password, 13);

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const newUser = new User({
        name,
        username,
        email,
        password: hashed,
        location,
        phone,
        BankAccount,
        VerificationCode: verificationCode,
      });

      await newUser.save();

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Verify your email",
          text: `Your verification code is: ${verificationCode}`,
        });
        res.status(201).json({ message: "Verification email sent." });
      } catch (err) {
        console.log(err);
        res
          .status(500)
          .json({ message: "Error sending email.", error: err.message });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  },
];

exports.Login = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 4 })
    .withMessage("Username must be at least 4 characters long"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 6 characters long"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ error: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(403).json({ error: "Wrong Password" });

      if (!user.Verified) {
        return res.status(403).json({ error: "Email not verified" });
      }

      const token = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET
      );

      const csrfToken = csrf.generateToken(req, res, true, true);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
      });
      res.setHeader("csrfToken", csrfToken);

      res
        .status(200)
        .json({ message: "Succesfully logged in ", role: user.role });
    } catch (error) {
      res.status(500).json({ error: error.message });
      console.log(error);
    }
  },
];

exports.Logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
    });

    res.clearCookie("csrfToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
    });

    res.status(200).json({ message: "Logged out Succesfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.checkLogStatus = (req, res) => {
  res.status(204).send();
};

exports.Verify = [
  body("email")
    .matches(/.*aau.edu.et$/)
    .withMessage("Invalid email address. Must be an AAU email address")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("code")
    .isNumeric()
    .isInt({ min: 100000, max: 999999 })
    .withMessage("Invalid verification code"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.VerificationCode !== code)
        return res.status(403).json({ error: "Invalid verification code" });

      user.Verified = true;
      user.VerificationCode = null;

      await user.save();

      res
        .status(200)
        .json({ message: "Email verified. User Created Successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
      console.log(error);
    }
  },
];
