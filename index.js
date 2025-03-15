const express = require("express");
const { success, error } = require("consola");
const { connect } = require("mongoose");
const passport = require("passport");
const { DB, PORT } = require("./config");

const Task = require("./models/Tasks");
const User = require("./models/User");

const app = express(); // Initialize the application

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

// Webhooks
app.post("/webhook", async (req, res) => {
  try {
    const paymentData = req.body;
    console.log("Payment update received:", paymentData);

    // Check if payment is completed
    if (paymentData.payment_status === "finished") {
      const { order_id, price_amount, price_currency } = paymentData;

      // Extract user email & task ID from order_id
      const [userEmail, taskId] = order_id.split("_");

      // Find task to get reward amount
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Find and update the user's wallet
      const user = await User.findOneAndUpdate(
        { email: userEmail },
        {
          $inc: { walletBalance: task.reward }, // Add reward to wallet
          $push: { compeltedTasks: taskId }, // Mark task as completed
        },
        { new: true }
      );

      if (user) {
        console.log(
          `Task ${taskId} completed! ${userEmail} received ${task.reward} USDT.`
        );
      } else {
        console.log(`User not found: ${userEmail}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.sendStatus(500);
  }
});

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
        compleltedTasks: updatedCompletedTasks,
      });

      console.log(`Updated wallet for user ${user.email}: +$${totalReward}`);
    }
  }

  console.log("Reward distribution completed.");
};

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
