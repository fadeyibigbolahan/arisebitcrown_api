const { Schema, model } = require("mongoose");

const Transactions = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
    },
  },
  { timestamps: true }
);

module.exports = model("transactions", Transactions);
