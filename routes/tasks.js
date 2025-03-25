const router = require("express").Router();
const Task = require("../models/Tasks");
const User = require("../models/User");
const mongoose = require("mongoose");
const axios = require("axios");

const {
  serializeUser,
  checkRole,
  userRegister,
  userLogin,
  userAuth,
} = require("../utils/Auth");

const BITNOB_API_KEY = process.env.BITNOB_API_KEY;
const CALLBACK_URL = "arisebitcrown.com/bitnob-webhook";
const BASE_URL = "https://api.bitnob.co/api/v1"; // Bitnob API base URL

/***************************************************************************************************
POST: CREAT TASKS (ADMIN ONLY) => START
 ***************************************************************************************************/
router.post("/", userAuth, checkRole(["admin"]), async (req, res) => {
  try {
    const { title, description, fee, reward } = req.body;
    const task = new Task({ title, description, fee, reward });
    await task.save();

    res.status(201).json({
      message: "Task created successfully",
      data: task,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error", data: error, success: false });
  }
});
/***************************************************************************************************
POST: CREAT TASKS (ADMIN ONLY) => END
 ***************************************************************************************************/

/***************************************************************************************************
GET: GET ALL TASKS => START
 ***************************************************************************************************/
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find();

    res.status(201).json({
      message: "Tasks fetched",
      data: tasks,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error", data: error, success: false });
  }
});
/***************************************************************************************************
GET: GET ALL TASKS => END
***************************************************************************************************/

/***************************************************************************************************
POST: COMPLETE TASK => START
 ***************************************************************************************************/
router.get("/complete/:taskId", userAuth, async (req, res) => {
  console.log("user", req.user._id);
  try {
    const { taskId } = req.params;

    // Check if user has already completed the task
    if (req.user.compeltedTasks.includes(taskId)) {
      return res.status(400).json({ message: "Task already completed" });
    }

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Create a NOWPayments payment request (user pays the `fee`)
    const paymentResponse = await axios.post(
      `${BASE_URL}/payments/initiate`,
      {
        amount: task.fee,
        currency: "USDT", // BTC, USDT, NGN supported
        customer_email: req.user.email,
        callback_url: "https://arisebitcrown.com/bitnob-webhook",
      },
      {
        headers: {
          Authorization: `Bearer ${BITNOB_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("payment res", paymentResponse);

    // Return payment link to the user
    res.status(200).json({
      message: "Send the payment to the address below.",
      payment_url: response.data.data.checkoutUrl,
    });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ message: "Server error", success: false });
  }
});
/***************************************************************************************************
  POST: COMPLETE TASK => END
  ***************************************************************************************************/

// Route to update user's completed tasks
router.post("/complete-task", async (req, res) => {
  try {
    const { email, taskId } = req.body;

    if (!email || !taskId) {
      return res
        .status(400)
        .json({ message: "Email and Task ID are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid Task ID" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the task was already completed
    const taskExists = user.compeltedTasks.find(
      (t) => t.taskId.toString() === taskId
    );
    if (taskExists) {
      return res.status(400).json({ message: "Task already completed" });
    }

    // Add the completed task with lastRewardDate
    user.compeltedTasks.push({ taskId, lastRewardDate: new Date() });

    // Update the user's wallet balance with the reward
    user.walletBalance += task.reward;

    // Save the updated user
    await user.save();

    return res.status(200).json({
      message: "Task marked as completed and reward added",
      completedTasks: user.compeltedTasks,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
