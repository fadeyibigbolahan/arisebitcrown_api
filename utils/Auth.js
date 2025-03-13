const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { SECRET, emailAddress } = require("../config");
const { registerValidation, loginValidation } = require("../utils/validation");
const transporter = require("./emailConfig");

/****************************************************************************************************
REGISTRATION AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC To register the user (ADMIN, USER)
 */

const userRegister = async (userDets, role, res) => {
  try {
    // Validate the email
    let emailNotRegistered = await validateEmail(userDets.email);
    if (!emailNotRegistered) {
      return res.status(400).json({
        message: `Email is already taken.`,
        success: false,
      });
    }

    console.log("email", emailNotRegistered);

    // Get the hashed password
    const password = await bcrypt.hash(userDets.password, 12);

    function generateReferralCode(length = 8) {
      return crypto.randomBytes(length).toString("hex").slice(0, length);
    }

    const verificationCode = generateReferralCode();

    console.log("user det", userDets);

    // create a new user
    const newUser = new User({
      ...userDets,
      password,
      verificationCode,
      role,
    });

    if (userDets.referral) {
      const referUser = await User.findOne({
        verificationCode: userDets.referral,
      });

      if (referUser) {
        // Check if a user was found
        referUser.walletBalance += 5;
        await referUser.save(); // Await the save operation
      }
    }

    const savedUser = await newUser.save();

    let token;
    if (savedUser) {
      //Sign in the token and issue it to the user
      console.log("trying to create token");
      token = jwt.sign(
        {
          _id: savedUser._id,
          role: savedUser.role,
          username: savedUser.userName,
          email: savedUser.email,
          walletBalance: savedUser.walletBalance,
          compeltedTasks: savedUser.compeltedTasks,
          transactions: savedUser.transactions,
          verificationCode: savedUser.verificationCode,
        },
        SECRET,
        { expiresIn: "7 days" }
      );
    }

    let result = {
      role: savedUser.role,
      _id: savedUser._id,
      email: savedUser.email,
      token: `Bearer ${token}`,
      expiresIn: 168,
    };

    return res.status(201).json({
      ...result,
      message: "Hurry! now you have successfully registered. Please now login.",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to create your account, try again later.",
      success: false,
    });
  }
};

/****************************************************************************************************
REGISTRATIONS AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
LOGIN AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC To login the user (ADMIN, USER)
 */
const userLogin = async (userCreds, role, res) => {
  let { input, password } = userCreds;
  let user = "";
  let userEmail = await User.findOne({ email: input });
  if (!userEmail) {
    let userUserName = await User.findOne({ userName: input });
    if (!userUserName) {
      return res.status(404).json({
        message: "User not found. Invalid login credentials.",
        success: false,
      });
    } else {
      user = userUserName;
      console.log("login by username");
    }
  } else {
    user = userEmail;
    console.log("login by email");
  }

  // That means user is existing and trying to signin from the right portal
  //Now check for the password
  let isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    //Sign in the token and issue it to the user
    let token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        username: user.userName,
        email: user.email,
        walletBalance: user.walletBalance,
        compeltedTasks: user.compeltedTasks,
        transactions: user.transactions,
        verificationCode: user.verificationCode,
      },
      SECRET,
      { expiresIn: "7 days" }
    );

    let result = {
      username: user.userName,
      role: user.role,
      _id: user._id,
      email: user.email,
      walletBalance: user.walletBalance,
      compeltedTasks: user.compeltedTasks,
      transactions: user.transactions,
      verificationCode: user.verificationCode,
      token: `Bearer ${token}`,
      expiresIn: 168,
    };

    return res.status(200).json({
      ...result,
      message: "Login successful.",
      success: true,
    });
  } else {
    return res.status(403).json({
      message: "Incorrect password",
      success: false,
    });
  }
};
/****************************************************************************************************
LOGIN AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
VALIDATE USERNAME => STARTS
 ***************************************************************************************************/
const validateUsername = async (userName) => {
  let user = await User.findOne({ userName });
  return user ? false : true;
};

/**
 * @DESC Passport middleware
 */
const userAuth = passport.authenticate("jwt", { session: false });
/****************************************************************************************************
VALIDATE USERNAME => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
ROLES BASED AUTHENTICATION => STARTS
 ***************************************************************************************************/
/**
 * @DESC Check Role Middleware
 */
const checkRole = (roles) => (req, res, next) =>
  !roles.includes(req.user.role)
    ? res.status(401).json("Unauthorized")
    : next();

/****************************************************************************************************
ROLES BASED AUTHENTICATION => ENDS
 ***************************************************************************************************/

/****************************************************************************************************
VALIDATE EMAIL => STARTS
 ***************************************************************************************************/
const validateEmail = async (email) => {
  let user = await User.findOne({ email });
  return user ? false : true;
};
/****************************************************************************************************
VALIDATE EMAIL => ENDS
****************************************************************************************************/

/****************************************************************************************************
SERIALIZE USER => STARTS
 ***************************************************************************************************/
const serializeUser = (user) => {
  return {
    username: user.userName,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    birthday: user.birthday,
    dob: user.dob,
    biography: user.biography,
    address: user.address,
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    followers: user.followers,
    followings: user.followings,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
    _id: user._id,
  };
};
/****************************************************************************************************
SERIALIZE USER => ENDS
 ***************************************************************************************************/

module.exports = {
  checkRole,
  serializeUser,
  userRegister,
  userLogin,
  userAuth,
};
