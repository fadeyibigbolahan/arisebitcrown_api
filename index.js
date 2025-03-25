const express = require("express");
const { success, error } = require("consola");
const { connect } = require("mongoose");
const passport = require("passport");
const { DB, PORT } = require("./config");

const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");

const { emailAddress, emailPassword } = require("./config");

const Task = require("./models/Tasks");
const User = require("./models/User");

const app = express(); // Initialize the application
const upload = multer({ dest: "uploads/" }); // Temporary storage for images

var cors = require("cors");
app.use(cors({ origin: true, credentials: true }));

// Import cron jobs
require("./cron/cronJobs"); // ✅ Run scheduled tasks

// Middlewares
app.use(express.json());
app.use(passport.initialize());

require("./middlewares/passport")(passport);

// User Router Middleware
app.use("/api/users", require("./routes/users"));
app.use("/api/tasks", require("./routes/tasks"));

// working on cron

app.get("/api/run-cron", async (req, res) => {
  try {
    await rewardDistributionFunction(); // Call the function directly
    res.send("Cron job executed.");
  } catch (error) {
    console.error("Error in manual cron trigger:", error);
    res.status(500).send("Error running cron job");
  }
});

const rewardDistributionFunction = async () => {
  console.log("Running reward distribution job...");

  const now = new Date();
  const users = await User.find({ compeltedTasks: { $exists: true } });

  for (const user of users) {
    let totalReward = 0;
    let updatedCompletedTasks = [];

    for (let taskData of user.compeltedTasks) {
      const { taskId, lastRewardDate } = taskData;
      console.log("task data", taskData);

      // If last reward was given within the last 24 hours, skip
      if (
        lastRewardDate &&
        new Date(lastRewardDate).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      ) {
        updatedCompletedTasks.push(taskData);
        continue;
      }

      const task = await Task.findById(taskId);
      if (!task) continue;

      totalReward += task.reward;

      // Update lastRewardDate
      updatedCompletedTasks.push({
        taskId,
        lastRewardDate: now,
      });
    }

    // Update user's wallet and completed tasks
    if (totalReward > 0) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { walletBalance: totalReward },
        compeltedTasks: updatedCompletedTasks,
      });

      console.log(`Updated wallet for user ${user.email}: +$${totalReward}`);
    }
  }
  console.log("Reward distribution completed.");
};

app.post("/send-email", async (req, res) => {
  const { text, email } = req.body;
  console.log("Received Data:", { text, email });

  if (!text || !email) {
    return res
      .status(400)
      .json({ error: "Email and task selection are required." });
  }

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailAddress, // Your Gmail
        pass: emailPassword, // Your App Password
      },
    });

    let mailOptions = {
      from: "emailAddress",
      to: "areaforsuccess45@gmail.com", // Replace with your email
      subject: "Payment Confirmation",
      text: `User Email: ${email}\nSelected Task: ${text}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");

    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Error sending email" });
  }
});

const startApp = async () => {
  try {
    // Connection with DB
    await connect(DB, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    success({
      message: `Successfully connected with the Database \n${DB}`,
      badge: true,
    });

    // Start listening for the server on PORT
    app.listen(PORT, () =>
      success({ message: `Server started on PORT ${PORT}`, badge: true })
    );
  } catch (err) {
    error({
      message: `Unable to connect with Database \n${err}`,
      badge: true,
    });
    process.exit(1); // Exit the process with an error code
  }
};

startApp();
