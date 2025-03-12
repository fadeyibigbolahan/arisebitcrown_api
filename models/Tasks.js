const { Schema, model } = require("mongoose");

const Tasks = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    fee: { type: Number, required: true },
    reward: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = model("tasks", Tasks);
