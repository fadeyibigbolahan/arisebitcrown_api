const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    walletBalance: { type: Number, default: 0 },
    transactions: [{ type: Schema.Types.ObjectId, ref: "transactions" }],
    compeltedTasks: [
      {
        taskId: { type: Schema.Types.ObjectId, ref: "tasks" },
        lastRewardDate: { type: Date, default: null }, // New field
      },
    ],
    referrals: [
      {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    phoneNumber: { type: String },
    verificationCode: { type: String },
  },
  { timestamps: true }
);

module.exports = model("users", UserSchema);
