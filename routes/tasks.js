const router = require("express").Router();
const Task = require("../models/Tasks");
const axios = require("axios");

const {
  serializeUser,
  checkRole,
  userRegister,
  userLogin,
  userAuth,
} = require("../utils/Auth");

// const NOWPAYMENTS_API_KEY = "TWHP3XG-FTN496Z-JGPAVCH-CNVB0A5";
const NOWPAYMENTS_API_KEY = "JPSM42F-VCG4ZB6-MV16CR2-BC8Y0YX";
const CALLBACK_URL = "http://localhost:5000/webhook";

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
      "https://api.nowpayments.io/v1/payment",
      {
        price_amount: task.fee, // Task Fee (user must pay this)
        price_currency: "usd", // Base currency
        pay_currency: "usdttrc20", // Accept USDT (TRC20)
        ipn_callback_url: CALLBACK_URL, // Webhook URL
        order_id: `${req.user.email}_${taskId}`, // Store user email + task ID
        order_description: `Fee payment for task ${taskId}`,
      },
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("payment res", paymentResponse);

    // Return payment link to the user
    res.status(200).json({
      message: "Send the payment to the address below.",
      payment_id: paymentResponse.data.payment_id,
      pay_address: paymentResponse.data.pay_address, // Address to send the USDT
      amount_to_pay: paymentResponse.data.pay_amount, // Amount of USDT to send
      currency: paymentResponse.data.pay_currency, // USDT (TRC20)
      expiration: paymentResponse.data.valid_until, // Payment deadline
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

module.exports = router;
