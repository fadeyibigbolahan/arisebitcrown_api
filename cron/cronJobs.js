const cron = require("node-cron");
const User = require("../models/User");
const Task = require("../models/Tasks");
const mongoose = require("mongoose");

const { DB } = require("../config");

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

cron.schedule("*/15 * * * *", async () => {
  try {
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
          new Date(lastRewardDate).getTime() >
            now.getTime() - 24 * 60 * 60 * 1000
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
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});
