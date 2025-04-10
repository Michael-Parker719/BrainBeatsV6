require("dotenv").config();
const bcrypt = require("bcryptjs");
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const path = require('path');
const fs = require('fs');
const { createJWT, verifyJWT } = require("../../utils/jwt");
const { getUserExists, getIsTokenExpired } = require("../../utils/database");
const { generateFileName, writeToFile } = require("../../file/fileReader/fileReader");
var nodemailer = require("nodemailer");
const crypto = require("crypto");
const { processUser } = require("../../file/processUsers/processUsers");

// Create a new user
router.post("/createUser", async (req, res) => {
  try {
    const { firstName, lastName, email, username, password, profilePicture } =
      req.body;
    const userEmailExists = await getUserExists(email, "email");
    const userNameExists = await getUserExists(username, "username");

    if (userEmailExists || userNameExists) {
      return res.status(400).json({
        msg: "Email or username already exists. Please try again.",
      });
    } else {
      //Encrypt user password
      encryptedPassword = await bcrypt.hash(password, 10);

      //Create a single record
      const sqlQuery1 =
        "INSERT INTO User (firstName, lastName, email, username, password) VALUES ( ?, ?, ?, ?, ?)";
      const [user] = await promiseConnection.execute(sqlQuery1, [
        firstName,
        lastName,
        email,
        username,
        encryptedPassword,
      ]);


      // console.log(user);
      let id = user.insertId;

      const sqlQuery2 = "UPDATE User SET profilePicture = ? WHERE id = ?";
      
      const fileName = await generateFileName();
      const filePath = await writeToFile(fileName, profilePicture, id);

      await promiseConnection.execute(sqlQuery2, [ filePath, id,]);

      const sqlQuery3 = "SELECT * FROM User WHERE `email` = ?";
      let [rows] = await promiseConnection.execute(sqlQuery3, [email]);

      let newUser = rows[0];

      // Create JWT
      const token = createJWT(newUser.id, newUser.email);
      const data = {
        user: newUser,
        token: token,
      };

      res.json(data);
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      err,
      //msg: "Could not create user."
    });
  }
});

// Logout an existing user
router.post("/logoutUser", async (req, res) => {
  try {
    // Get user input
    const { email, jwt } = req.body;

    // Validate if user exists in our database
    const userExists = await getUserExists(email, "email");

    // If password is related to the email console log a successful login
    if (userExists && verifyJWT(jwt)) {
      console.log("this works!!!");
      return res.status(200);
    } else {
      return res.status(400).json({
        msg: "Logout failed",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Login an existing user
router.post("/loginUser", async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.body;
    console.log("IN THE LOGIN ROUTE");
    // Validate if user exists in our database
    let userExists = await getUserExists(email, "email");
    userExists = await processUser(userExists);
    console.log(userExists);

    // If password is related to the email console log a successful login
    if (userExists && (await bcrypt.compare(password, userExists.password))) {
      const token = createJWT(userExists.id, userExists.email);

      const data = {
        user: {
          id: userExists.id,
          firstName: userExists.firstName,
          lastName: userExists.lastName,
          email: userExists.email,
          username: userExists.username,
          bio: userExists.bio,
          profilePicture: userExists.profilePicture,
        },
        token: token,
      };

      res.json(data);
    } else {
      return res.status(400).json({
        msg: "Invalid credentials",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Get all users in the database
router.get("/getAllUsers", async (req, res) => {
  try {
    const sqlQuery = `SELECT id, firstName, lastName, 
       email, username, password, bio, createdAt FROM User`;
    const [users] = await promiseConnection.query(sqlQuery);
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Get user by username
router.get("/getUserByUsername", async (req, res) => {
  try {
    let userExists = await getUserExists(req.body.username, "username");
    //console.log(userExists);
    if (!userExists) {
      return res.status(400).json({
        msg: "Username does not exist",
      });
    }
    res.json(userExists);
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Get user by user ID
router.get("/getUserByID", async (req, res) => {
  try {
    const userID = req.query.id;
    const userExists = await getUserExists(userID, "id");

    if (!userExists) {
      return res.status(400).json({
        msg: "User does not exist",
      });
    }

    let user = await processUser(userExists);
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Get user profilePictures by id
router.get("/getUserImages", async (req, res) => {
  try {
    const userExists = await getUserExists(req.body.id, "id", {
      include: {
        profilePicture: true,
      },
    });

    if (!userExists) {
      return res.status(400).json({
        msg: "User does not exist",
      });
    }
    res.json(userExists);
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Update user info
router.put("/updateUser", async (req, res) => {
  try {
    const {
      id,
      firstName,
      lastName,
      email,
      username,
      bio,
      token,
      tracks,
      playlists,
      likes,
    } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    // Check if the user already exists in db
    const userExists = await getUserExists(id, "id");

    if (!userExists) {
      return res.status(400).json({
        msg: "User ID not found",
      });
    }

    const sqlQuery = `
        UPDATE User
        SET 
            firstName = IFNULL(?, firstName),
            lastName = IFNULL(?, lastName),
            email = IFNULL(?, email),
            bio = IFNULL(?, bio),
            username = IFNULL(?, username)
        WHERE id = ?;
        `;
    // If the only some data is passed, say firstName is not passed,
    // and we want it to be unchanged, we pass undefined as the value instead.

    await promiseConnection.query(sqlQuery, [
      firstName,
      lastName,
      email,
      bio,
      username,
      id
    ]);

    // const updateUser = await new Promise(resolve);
    res.status(200).send({ msg: "User updated" }); //.send(updateUser);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

// Delete user by ID
router.delete("/deleteUser", async (req, res) => {
  const decoded = verifyJWT(req.body.token);

  if (!decoded) {
    return res.status(400).json({
      msg: "Invalid token",
    });
  }

  try {
    const sqlQuery = `DELETE FROM User WHERE id = ?`;
    const id = req.body.id;

    const [rows] = await promiseConnection.query(sqlQuery, [id]);
    let deleteUser = rows[0];

    res.status(200).send({ deleteUser });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

// Do forgot password
router.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;

    const userExists = await getUserExists(email, "email");

    if (!userExists) {
      return res.status(400).json({
        msg: "Email does not exist",
      });
    } else {
      // Generate token
      const token = crypto.randomBytes(48).toString("hex");

      // Update user in database with token and expiry date
      const resetPasswordExpires = new Date(Date.now() + 1400000);
      const sqlQuery1 =
        "UPDATE User SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?;";

      const [updateUser] = await promiseConnection.query(sqlQuery1, [
        token,
        resetPasswordExpires,
        email,
      ]);

      // Set up transporter for email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: `${process.env.EMAIL_ADDRESS}`,
          // pass: "pdpiipdhdfzzvzfp"
          pass: `${process.env.APP_PASSWORD}`.toString(),
        },
      });

      // DEV Use, later will be checked from .env
      let devDomain = `http://localhost:2001/`;
      let prodDomain = `http://brainbeats.dev/`;

      // Create mailOptions to build the email
      const mailOptions = {
        from: `${process.env.EMAIL_ADDRESS}`,
        to: email,
        subject: "Forgot Password - BrainBeats",
        text:
          "Hi " +
          `${updateUser.username}` +
          ", \n\n You are receiving this email beacuse you (or someone else) have requested to reset your password for your BrainBeats account. \n\n" +
          "Please click the following link, or paste this into your browser to complete the process within one hour of receiving it: \n\n" +
          devDomain + // TODO Change back to prodDomain
          `reset-password?token=${token} \n\n` +
          "Your reset link will remain valid for 30 minutes.\n\n" +
          "If you did not request this, please ignore this email and your password will remain unchanged. \n\n",
      };

      // Send email
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
          res.status(200).json("Recovery email sent.");
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});

// Confirms reset of a password from an email by verifying token integrity, then updates that users password
router.put("/reset", async (req, res) => {
  try {
    const { resetPasswordToken, newPassword } = req.body;

    // Check if the token is expired
    let tok = await getIsTokenExpired(resetPasswordToken);

    if (tok) {
      return res.status(400).send({
        msg: "Password reset link is expired.",
      });
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(newPassword, 10);

    // Select the user by reset token and update their password

    const sqlQuery2 = `UPDATE User
SET password = ?, resetPasswordExpires = NULL, resetPasswordToken = NULL
WHERE resetPasswordToken = ?;`;

    const [user] = await promiseConnection.query(sqlQuery2, [
      encryptedPassword,
      resetPasswordToken,
    ]);

    res.status(200).send({ msg: "Password was successfully changed" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ msg: err });
  }
});
module.exports = router;
