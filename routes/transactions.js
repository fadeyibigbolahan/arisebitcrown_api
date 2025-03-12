const router = require("express").Router();
const Transaction = require("../models/Transactions");

const {
  serializeUser,
  checkRole,
  userRegister,
  userLogin,
  userAuth,
} = require("../utils/Auth");

/***************************************************************************************************
POST: Withdraw Funds (Crypto via Coinbase API) => START
 ***************************************************************************************************/
router.post("/withdraw", userAuth, async (req, res) => {
  try {
    const { amount, walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" });
    }
    if (amount > req.user.walletBalance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const transaction = new Transaction({
      userId: req.user._id,
      amount,
      walletAddress,
      type: "withdrawal",
      status: "pending",
    });
    await transaction.save();

    // Deduct balance
    req.user.walletBalance -= amount;
    req.user.transactions.push(transaction._id);
    await req.user.save();

    res.status(201).json({
      message: "Withdrawal request submitted",
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error", data: error, success: false });
  }
});
/***************************************************************************************************
POST: Withdraw Funds (Crypto via Coinbase API) => END
 ***************************************************************************************************/
