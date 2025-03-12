const router = require("express").Router();
const User = require("../models/User");

const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const {
  accessKeyId,
  secretAccessKey,
  region,
  emailAddress,
} = require("../config");
const bcrypt = require("bcryptjs");
const transporter = require("../utils/emailConfig");

// Bring in the User Registration function
const {
  serializeUser,
  checkRole,
  userRegister,
  userLogin,
  userAuth,
} = require("../utils/Auth");

/***************************************************************************************************
REGISTRATIONS => STARTS
 ***************************************************************************************************/
// Users Registeration Route
router.post("/register-user", async (req, res) => {
  await userRegister(req.body, "user", res);
});

// Admins Registeration Route

router.post("/register-admin", async (req, res) => {
  console.log("reqBody", req.body);
  await userRegister(req.body, "admin", res);
});

/***************************************************************************************************
REGISTRATIONS => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
LOGIN => START
 ***************************************************************************************************/
// Users Login Route
router.post("/login-user", async (req, res) => {
  await userLogin(req.body, "user", res);
});

// Admin Login Route
router.post("/login-admin", async (req, res) => {
  await userLogin(req.body, "admin", res);
});
/****************************************************************************************************
LOGIN => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
VERIFY => STARTS
 ***************************************************************************************************/
router.patch("/verify", async (req, res) => {
  console.log("otp code", req.body.verificationCode);
  const user = await User.findOne({
    verificationCode: req.body.verificationCode,
  });

  if (user == null) {
    return res.status(404).json({
      message: "Verification code not valid",
      data: "",
      success: false,
    });
  } else {
    user.isVerified = true;

    function generateRandomNumbers() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const verificationCode = generateRandomNumbers();
    user.verificationCode = verificationCode;

    const savedUser = await user.save();
    console.log("saved user", savedUser);

    return res.status(200).json({
      message: "User successfully verified",
      data: savedUser,
      success: true,
    });
  }
});
/****************************************************************************************************
VERIFY => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
RE-VERIFY => STARTS
 ***************************************************************************************************/
router.post("/resendVerify", async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });

  if (user == null) {
    return res.status(404).json({
      message: "Verification code not valid",
      data: "",
      success: false,
    });
  } else {
    const mailOptions = {
      from: emailAddress,
      to: user.email,
      subject: "ACCOUNT VERIFICATION",
      text: `This is your verification code ${user.verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Verification code sent successfully",
      data: "",
      success: true,
    });
  }
});
/****************************************************************************************************
RE-VERIFY => ENDS
 ***************************************************************************************************/
/****************************************************************************************************
PROFILE => START
 ***************************************************************************************************/
// Profile Route
router.get("/profile", userAuth, async (req, res) => {
  // const user = serializeUser(req.user);
  const mainFacet = await Facet.findOne({ name: "main" });
  const user = await Channel.findOne({
    facet: mainFacet._id,
    user: req.user,
  }).populate({
    path: "user",
    model: "users",
    select:
      "_id userName name avatar biography email gender role phoneNumber followings birthday dob location isActive isVerified ",
  });

  return res.status(200).json({
    message: "user found",
    data: user,
    success: true,
  });
});
/****************************************************************************************************
PROFILE => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET A USER BY USERNAME => START
****************************************************************************************************/
router.get("/", userAuth, async (req, res) => {
  const username = req.query.username;
  try {
    const user = await User.findOne({ userName: username });
    const userChannels = await Channel.find({ user: user._id });
    if (user.role === "admin") {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    const resData = {
      userDets: serializeUser(user),
      userChannel: userChannels,
    };
    console.log("res", resData);
    return res.json({
      message: "User found",
      data: resData,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: err,
      data: "",
      success: false,
    });
  }
});
/****************************************************************************************************
GET A USER BY USERNAME => ENDS
****************************************************************************************************/
/****************************************************************************************************
GET A USER BY CONTACT => START
****************************************************************************************************/
router.get("/search-contact", userAuth, async (req, res) => {
  const query = req.query.q; // Get the search query parameter from the URL
  console.log("search users query", query);

  try {
    // Perform a case-insensitive search for users whose name or email matches the query
    const users = await User.find({
      $or: [{ phoneNumber: { $regex: query, $options: "i" } }],
    });
    console.log("search users", users);
    var result = users.map((eachUser) => serializeUser(eachUser));
    res.json({ message: "Users found", data: result, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, data: "", success: false });
  }
});
/****************************************************************************************************
GET A USER BY CONTACT => ENDS
****************************************************************************************************/

/****************************************************************************************************
FORGET PASSWORD => START
****************************************************************************************************/
router.get("/forget-password/:email", async (req, res) => {
  try {
    // const email = req.body.email;
    console.log("backend", req.params.email);
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    console.log("uss", user);

    const mailOptions = {
      from: emailAddress,
      to: user.email,
      subject: "ACCOUNT RESET CODE",
      text: `This is your password reset code ${user.verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      data: user,
      message: "Password reset token sent",
      success: true,
    });
  } catch (err) {
    res.status(500).json({ data: err, message: err, success: false });
  }
});
/****************************************************************************************************
FORGET PASSWORD => ENDS
****************************************************************************************************/
/****************************************************************************************************
RESET PASSWORD => START
****************************************************************************************************/
router.put("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    console.log("token", token, "newPassword", newPassword);
    const user = await User.findOne({ verificationCode: token });
    console.log("user", user);
    if (!user) {
      return res.status(404).json({
        data: "",
        message: "Invalid or expired token",
        success: false,
      });
    }

    function generateRandomNumbers() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const verificationCode = generateRandomNumbers();

    const password = await bcrypt.hash(newPassword, 12);
    user.verificationCode = verificationCode;
    user.password = password;
    const savedUser = await user.save();

    console.log("res", savedUser);

    res.json({
      data: savedUser,
      message: "Password reset successful",
      success: true,
    });
  } catch (err) {
    console.log("res", err);
    res.status(500).json(err);
  }
});
/****************************************************************************************************
RESET PASSWORD => ENDS
****************************************************************************************************/

/****************************************************************************************************
GET ALL USERS => START
****************************************************************************************************/
// router.get("/all/users", userAuth, checkRole(["admin"]), async (req, res) => {
router.get("/all/users", userAuth, async (req, res) => {
  const user = await User.find({ role: "user" });
  try {
    var result = user.map((eachUser) => serializeUser(eachUser));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
GET ALL USERS => ENDS
****************************************************************************************************/

/****************************************************************************************************
UPDATE USER => START
****************************************************************************************************/
router.put("/profile", userAuth, async (req, res) => {
  const userId = req.user._id;
  const updates = req.body;

  try {
    // Validate updates here if needed

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }

    const mainFacet = await Facet.findOne({ name: "main" });
    const user = await Channel.findOne({
      facet: mainFacet._id,
      user: req.user,
    }).populate({
      path: "user",
      model: "users",
      select:
        "_id userName name avatar biography email gender role phoneNumber followings birthday dob location isActive isVerified ",
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      data: user,
      success: true,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});
/****************************************************************************************************
UPDATE USER => ENDS
****************************************************************************************************/
/****************************************************************************************************
QUERY USERS => START
****************************************************************************************************/
router.get("/search", userAuth, async (req, res) => {
  const query = req.query.q; // Get the search query parameter from the URL
  console.log("search users query", query);

  try {
    // Perform a case-insensitive search for users whose name or email matches the query
    const users = await User.find({
      role: "user", // Add this condition to filter by role
      $or: [
        { userName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    });
    console.log("search users", users);
    var result = users.map((eachUser) => serializeUser(eachUser));
    res.json({ message: "Users found", data: result, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, data: "", success: false });
  }
});
/****************************************************************************************************
QUERY USERS => ENDS
****************************************************************************************************/
module.exports = router;
