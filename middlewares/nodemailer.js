const express = require("express");
const router = express.Router();
const transporter = require("../utils/emailConfig"); // Path to your email configuration module

router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    const mailOptions = {
      from: "kingwaretech@gmail.com",
      to: "fadeyibi26@gmail.com",
      subject: "testing",
      text: "testing this app",
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
