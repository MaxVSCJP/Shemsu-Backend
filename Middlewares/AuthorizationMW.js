const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

function authorize() {
  return (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ error: "Empty token" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Unknown User, Possible Tampering" });
    }
  };
}

module.exports = authorize;
