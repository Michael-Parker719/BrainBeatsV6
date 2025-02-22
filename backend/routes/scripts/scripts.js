require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const path = require("path");
const fs = require("fs");
const { verifyJWT } = require("../../utils/jwt");
const { getUserExists, getScriptExists } = require("../../utils/database");
const {
  deleteFile,
  generateFileName,
  writeToFile,
} = require("../../file/fileReader/fileReader");
const {
  processMultipleScripts,
  processMultipleCards,
  processSingleScript,
} = require("../../file/processScripts/processScripts");

function colorToHex(color) {
  var redHex = ("00" + color.r.toString(16)).slice(-2); //009A
  var greenHex = ("00" + color.g.toString(16)).slice(-2); //009A
  var blueHex = ("00" + color.b.toString(16)).slice(-2); //009A

  let ret = redHex + greenHex + blueHex;
  console.log(color);
  console.log("color: ", ret);
  return ret;
}

async function updateScript(scriptID, cards) {
  try {
    const queries = [];
    const sqlQuery1 = "SELECT * FROM Card WHERE scriptID = ?";
    const sqlQuery2 = "DELETE FROM Card WHERE scriptID = ?;";


    let [rows] = await promiseConnection.query(sqlQuery1, [scriptID]);
    console.log("In the update script function...")
    console.log(rows);
    console.log("The rows are above");

    let imageURL = "";
    let audioURL = "";
    if (rows[0]) {

      imageURL = rows[0].imageURL;
      audioURL = rows[0].audioURL;
    }

    // Ensure deletion of files prior to updating a Script component
    await deleteFile(imageURL);
    await deleteFile(audioURL);

    await promiseConnection.query(sqlQuery2, [scriptID]);

    for (let i = 0; i < cards.length; i++) {
      const fileName1 = await generateFileName();
      const filePath1 = await writeToFile(fileName1, cards[i].imageURL);

      const fileName2 = await generateFileName();
      const filePath2 = await writeToFile(fileName2, cards[i].audioURL);

      const newCard = [
        scriptID,
        i,
        colorToHex(cards[i].textColor),
        colorToHex(cards[i].backgroundColor),
        filePath1,
        filePath2,
        cards[i].text,
        cards[i].speed,
      ];
      queries.push(newCard);
    }

    const sqlQuery3 = `
        INSERT INTO Card (scriptID, \`order\`, textColor, backgroundColor, imageURL, audioURL, text, speed)
        VALUES ?;
    `;

    let [newCards] = await promiseConnection.query(sqlQuery3, [queries]);

    return newCards;
  } catch (err) {
    throw err;
  }
}

router.post("/createScript", async (req, res) => {
  try {
    const { userID, title, token, thumbnail, cards } = req.body;
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(userID, "id");
    if (!userExists) {
      return res.status(404).json({
        msg: "User not found",
      });
    }
    // Create a single record
    // console.log(req);

    let filePath;

    if (!thumbnail) {
      filePath = "";
    } else {
      const fileName = await generateFileName();
      filePath = await writeToFile(fileName, thumbnail);
    }

    const sqlQuery1 = `
        INSERT INTO Script (userID, title, thumbnail, public)
        VALUES (?, ?, ?, TRUE)
    `;

    const sqlQuery2 = `SELECT * FROM Script WHERE id = ?;`;
    let [insert] = await promiseConnection.query(sqlQuery1, [
      userID,
      title,
      filePath,
    ]);
    let id = insert.insertId;
    console.log("THE ID IS " + id);
    let [rows] = await promiseConnection.query(sqlQuery2, [id]);

    // console.log(rows);
    let newScript = rows[0];
    let newCards = updateScript(newScript.id, cards);

    ret = { newScript, newCards };

    return res.status(201).json(ret);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

router.post("/updateScript", async (req, res) => {
  try {
    const { scriptID, userID, title, token, thumbnail, cards } = req.body;
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(userID, "id");
    if (!userExists) {
      return res.status(404).json({
        msg: "User not found",
      });
    }
    // Create a single record
    console.log(req);

    const sqlQuery1 = "SELECT * From Script WHERE id = ?";
    let [rows] = await promiseConnection.query(sqlQuery1, [scriptID]);
    let thumbnailPath = rows[0].thumbnail;

    await deleteFile(thumbnailPath);

    const fileName = await generateFileName();
    const filePath = await writeToFile(fileName, thumbnail);

    const sqlQuery2 = `UPDATE Script
SET 
    user_id = ?,
    title = ?,
    thumbnail = ?,
    public = true
WHERE id = ?;`;

    await promiseConnection.query(sqlQuery2, [
      userID,
      title,
      filePath,
      scriptID,
    ]);

    const sqlQuery3 = `SELECT * FROM Script WHERE id = ?;`;
    let [newScript] = await promiseConnection.query(sqlQuery3, [scriptID]);

    let newCards = updateScript(newScript.id, token, cards);

    ret = { newScript, newCards };

    return res.status(201).json(ret);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

router.delete("/deleteScript", async (req, res) => {
  try {
    const { scriptID } = req.body;
    const sqlQuery1 = `DELETE FROM Card WHERE scriptID = ?`;
    const sqlQuery2 = `DELETE FROM Script WHERE id = ?`;

    await promiseConnection.query(sqlQuery1, [scriptID]);
    console.log("Deleting cards...");
    await promiseConnection.query(sqlQuery2, [scriptID]);
    console.log("Deleting script...");

    return res.status(200).send({ msg: "Sucessfully deleted script!" });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});
// Get all tracks based on a username
router.get("/getUserScriptsByUsername", async (req, res) => {
  try {
    const username = req.query.username;
    if (username === "") {
      const sqlQuery1 = "SELECT * FROM Script;";
      const [allScripts] = await promiseConnection.query(sqlQuery1, []);

      allScripts = await processMultipleScripts(allScripts);
      return res.json(allScripts);
    }

    const userExists = await getUserExists(username, "username");

    if (!userExists) {
      return res.status(404).json({
        msg: "Username not found",
      });
    } else {
      // Find the records
      const sqlQuery2 = `SELECT * 
FROM Script
JOIN User ON Script.userID = User.userID
WHERE Script.userID = ?;`;

      const [userScripts] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userScripts) {
        return res.status(404).json({
          msg: "Scripts not found",
        });
      }

      userScripts = await processMultipleScripts(userScripts);

      return res.status(200).json(userScripts);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all tracks based on a ID
router.get("/getUserScriptsByID", async (req, res) => {
  try {
    const userID = req.query.userID;
    if (userID === "") {
      const sqlQuery1 = "SELECT * FROM Script;";
      const [allScripts] = await promiseConnection.query(sqlQuery1, []);

      allScripts = await processMultipleScripts(allScripts);
      return res.json(allScripts);
    }

    const userExists = await getUserExists(userID, "id");

    if (!userExists) {
      return res.status(404).json({
        msg: "Username not found",
      });
    } else {
      // Find the records

      const sqlQuery2 = `SELECT Script.id as id, 
      Script.title, Script.thumbnail, Script.createdAt, Script.public, 
      User.id as userID, User.firstName, User.lastName
FROM Script
JOIN User ON Script.userID = User.id
WHERE Script.userID = ?;`;

      let [userScripts] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userScripts) {
        return res.status(404).json({
          msg: "Scripts not found",
        });
      }

      userScripts = await processMultipleScripts(userScripts);

      return res.status(200).json(userScripts);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

router.get("/getCardsByScriptID", async (req, res) => {
  try {
    const scriptID = req.query.id;

    if (scriptID === "") {
      const sqlQuery1 = "SELECT * FROM Card;";
      let [allCards] = await promiseConnection.query(sqlQuery1, []);

      allCards = await processMultipleCards(allCards);
      return res.json(allCards);
    }

    console.log("IN THE getCardsByScriptID FUNCTION");
    const scriptExists = await getScriptExists(scriptID, "id");

    if (!scriptExists) {
      return res.status(404).json({
        msg: "Script not found",
      });
    } else {
      // Find the records
      const sqlQuery2 = "SELECT * FROM Card WHERE scriptID = ?;";
      let [scriptCards] = await promiseConnection.query(sqlQuery2, [
        scriptID,
      ]);

      if (!scriptCards) {
        return res.status(404).json({
          msg: "Cards not found",
        });
      }

      scriptCards = await processMultipleCards(scriptCards);

      return res.status(200).json(scriptCards);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Requires Preprocessing!!!
router.get("/downloadScript", async (req, res) => {
  console.log("In the download route...");
  const scriptID = req.body.id; // Use query params or req.params depending on how you send the ID

  // Query to get scripts and their related cards
  const sqlQuery1 = "SELECT * from Script WHERE id = ?";
  const sqlQuery2 = "SELECT * from Card WHERE scriptID = ?";

  try {
    console.log("Running query...");
    // Execute the query and await the result
    const [res1] = await promiseConnection.query(sqlQuery1, [scriptID]);
    let script = await processSingleScript(res1[0]);

    const [res2] = await promiseConnection.query(sqlQuery2, [scriptID]);
    let cards = await processMultipleCards(res2);

    console.log("Organizing Scripts...");
    // Organize data by script
    const download = {
      title: script.title,
      thumbnail: script.thumbnail,
      userID: script.userID,
      createdAt: script.createdAt,
      public: script.public,
      cards: [],
    };

    cards.forEach((card) => {
      download.cards.push({
        order: card.order,
        textColor: card.textColor,
        backgroundColor: card.backgroundColor,
        imageURL: card.imageURL,
        audioURL: card.audioURL,
        text: card.text,
        speed: card.speed,
      });
    });

    console.log("Creating json object...");
    // Create JSON file
    const jsonData = JSON.stringify(Object.values(download), null, 2);
    const fileName = download.title + ".json";
    console.log("Writing to file...");
    // Write to file and send it for download
    fs.writeFile(fileName, jsonData, (err) => {
      if (err) throw err;

      console.log("Downloading...");
      // Send the file for download
      res.download(fileName, fileName, (err) => {
        if (err) throw err;

        console.log("Unlinking...");
        // Delete the file after download
        // fs.unlink(fileName, (err) => {
        //   if (err) throw err;
        // });
      });
    });
  } catch (err) {
    console.error("Error during the query execution:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
