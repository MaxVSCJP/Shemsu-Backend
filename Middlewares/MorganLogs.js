const morgan = require("morgan");
const Log = require("../Models/MorganLogModel");

morgan.token("userid", function (req, res) {
  return req.user ? req.user.userId : "Guest";
});

morgan.token("username", function (req, res) {
  return req.user ? req.user.username : "Guest";
});

morgan.token("ip", function (req, res) {
  return req.ip;
});

exports.logFormat =
  ":method :url :status :response-time ms :userid :username :ip ";

exports.stream = {
  write: function (message) {
    const logData = message.trim().split(" ");
    const log = new Log({
      method: logData[0],
      url: logData[1],
      status: parseInt(logData[2]),
      responseTime: parseInt(logData[3]),
      userId: logData[5],
      username: logData[6],
      ip: logData[7],
    });
    log.save().catch((err) => console.error(err));
  },
};
