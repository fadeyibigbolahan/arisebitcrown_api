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
