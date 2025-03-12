// emailConfig.js
const nodemailer = require("nodemailer");
const { emailAddress, emailPassword } = require("../config");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailAddress,
    pass: emailPassword,
  },
});

module.exports = transporter;
