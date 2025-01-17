//Pool is the database name
require("dotenv").config();
const { pool } = require("../../connect/connect");
const { generateFileName } = require("../../fileReader/fileReader");
const promiseConnection = pool.promise(); 
const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { createJWT, verifyJWT } = require("../../utils/jwt");

// Directory where the txt files will be stored
const BASE_DIR = path.join(__dirname, "../../uploads");

// Ensure the base directory exists, create it if not
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR);
}

router.get("/getUsers", async (req, res) => {
  pool.query("SELECT * FROM User", (error, rows) => {
    if (error) throw error;

    //console.log("This works!");
    //res.json(rows + "This works!");

    res.json(rows);
  });
});

router.get("/verifyUserId", async (req, res) => {
  pool.query(
    "SELECT * FROM User WHERE `username` = ?",
    req.body.username,
    (error, rows) => {
      if (error) throw error;

      //console.log("This works!");
      //res.json(rows + "This works!");

      res.json(rows);
    }
  );
});

// Get user by username
router.get("/verifyUser", async (req, res) => {
  try {
    let userExists = await getUserExist(req.body.id, "id");

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

async function getUserExist(searchVal, searchType) {
  if (!searchType) return false;
  if (!searchVal) return false;

  let promise;
  if (searchType === "username") {
    promise = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM User WHERE `username` = ?",
        searchVal,
        (error, rows) => {
          if (error) throw error;

          resolve(rows[0]);
        }
      );
    });
  } else if (searchType === "id") {
    promise = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM User WHERE `id` = ?",
        searchVal,
        (error, rows) => {
          if (error) throw error;

          resolve(rows[0]);
        }
      );
    });
  } else if (searchType === "email") {
    promise = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM User WHERE `email` = ?",
        searchVal,
        (error, rows) => {
          if (error) throw error;

          resolve(rows[0]);
        }
      );
    });
  }

  if (!promise) promise = false;
  console.log("Testing...");
  console.log(promise);
  return promise;
}

// Create a new user
router.post("/createUser", async (req, res) => {
  try {

    const { firstName, lastName, email, username, password, profilePicture } =
      req.body;
    const userEmailExists = await getUserExist(email, "email");
    const userNameExists = await getUserExist(username, "username");

    if (userEmailExists || userNameExists) {
      return res.status(400).json({
        msg: "Email or username already exists. Please try again.",
      });
    } else {
      //Encrypt user password
      encryptedPassword = await bcrypt.hash(password, 10);

      const fileName = await generateFileName();

      // Full path to the new .txt file
      const filePath = path.join(BASE_DIR, path.basename(fileName, ".txt"));

      fs.writeFile(filePath, profilePicture, "utf8", (err) => {
        if (err) {
          return res.status(500).send("Error saving the file.");
        }
      });

      //Create a single record
      const query1 =
        "INSERT INTO User (firstName, lastName, email, username, password, profilePicture) VALUES (?, ?, ?, ?, ?, ?)";
      await promiseConnection.execute(query1, [firstName, lastName, email, username, encryptedPassword, filePath]);
      
      const query2 = "SELECT * FROM User WHERE `email` = ?";
      let [ rows ] = await promiseConnection.execute(query2, [email]);
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
module.exports = router;
