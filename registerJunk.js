const userRegister = async (userDets, avatar, role, res) => {
  try {
    // Validate the username
    let usernameNotTaken = await validateUsername(userDets.userName);
    if (!usernameNotTaken) {
      return res.status(400).json({
        message: `Username is already taken.`,
        success: false,
      });
    }

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

    function generateRandomNumbers() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const verificationCode = generateRandomNumbers();

    console.log("verificode", verificationCode);

    console.log("new user");

    // console.log("password", password);

    console.log("user", userDets);

    // create a new user
    const newUser = new User({
      ...userDets,
      avatar,
      password,
      verificationCode,
      role,
    });

    await newUser.save();

    const mailOptions = {
      from: emailAddress,
      to: userDets.email,
      subject: "ACCOUNT VERIFICATION",
      text: `This is your verification code ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    if (newUser.role === "user") {
      const mainFacet = await Facet.findOne({ name: "main" });
      if (!mainFacet) {
        res.send("No facet of such");
      }
      mainFacet.subscribers.push(newUser._id.toString());
      await mainFacet.save();

      const newChannel = new Channel();
      newChannel.user = newUser._id;
      newChannel.name = `${newUser.userName}`;
      newChannel.facet = mainFacet._id;
      await newChannel.save();

      const newTimeline = new Timeline();
      newTimeline.user = newUser._id;
      await newTimeline.save();

      const newNotification = new Notification();
      newNotification.user = newUser._id;
      await newNotification.save();

      const newSuggestedChannels = new SuggestedChannels();
      newSuggestedChannels.user = newUser._id;
      await newSuggestedChannels.save();

      const newChats = new Chats();
      newChats.user = newUser._id;
      await newChats.save();

      const newSavedPosts = new SavedPosts();
      newSavedPosts.user = newUser._id;
      await newSavedPosts.save();
      console.log("got here inside");
    }
    console.log("got here outside");
    return res.status(201).json({
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
