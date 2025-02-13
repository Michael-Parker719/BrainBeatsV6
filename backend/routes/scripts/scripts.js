require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const { verifyJWT } = require("../../utils/jwt");
const {
  getUserExists,
  getTrackExists,
  getScriptExists,
} = require("../../utils/database");

function colorToHex(color) {
  var redHex = ("00" + color.r.toString(16)).slice(-2); //009A
  var greenHex = ("00" + color.g.toString(16)).slice(-2); //009A
  var blueHex = ("00" + color.b.toString(16)).slice(-2); //009A

  let ret = redHex + greenHex + blueHex;
  console.log(color);
  console.log("color: ", ret);
  return ret;
}

async function updateScript(scriptID, token, cards) {
  try {
    const queries = [];
    const sqlQuery1 = `
    DELETE FROM Card
    WHERE scriptID = ?;`;

    await promiseConnection.query(sqlQuery1, [scriptID]);

    for (let i = 0; i < cards.length; i++) {
      const newCard = [
        scriptID,
        i,
        colorToHex(cards[i].textColor),
        colorToHex(cards[i].backgroundColor),
        cards[i].imageURL,
        cards[i].audioURL,
        cards[i].text,
        cards[i].speed,
      ];
      console.log("#################################");
      console.log("NEW CARD");
      console.log(newCard);
      console.log("#################################");
      queries.push(newCard);
    }

    console.log("#################################");
    console.log("ALL QUERIES");
    console.log(queries);
    console.log("#################################");

    const sqlQuery2 = `
        INSERT INTO Card (scriptID, \`order\`, textColor, backgroundColor, imageURL, audioURL, text, speed)
        VALUES ?;
    `;

    let [newCards] = await promiseConnection.query(sqlQuery2, [queries]);

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
    console.log(req);

    const sqlQuery1 = `
        INSERT INTO Script (userID, title, thumbnail, public)
        VALUES (?, ?, ?, TRUE)
    `;

    const sqlQuery2 = `SELECT * FROM Script WHERE id = ?;`;
    let [insert] = await promiseConnection.query(sqlQuery1, [
      userID,
      title,
      thumbnail,
    ]);
    let id = insert.insertId;
    console.log("THE ID IS " + id);
    let [rows] = await promiseConnection.query(sqlQuery2, [id]);

    // console.log(rows);
    let newScript = rows[0];
    console.log("+++++++++++++++++++++++++++++++");
    console.log(rows);
    console.log("+++++++++++++++++++++++++++++++");
    console.log(newScript);
    console.log("+++++++++++++++++++++++++++++++");
    console.log(newScript.id);
    let newCards = updateScript(newScript.id, token, cards);

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

    const sqlQuery1 = `UPDATE Script
SET 
    user_id = ?,
    title = ?,
    thumbnail = ?,
    public = true
WHERE id = ?;`;

    await promiseConnection.query(sqlQuery1, [
      userID,
      title,
      thumbnail,
      scriptID,
    ]);

    const sqlQuery2 = `SELECT * FROM Script WHERE id = ?;`;
    let [newScript] = await promiseConnection.query(sqlQuery2, [scriptID]);

    let newCards = updateScript(newScript.id, token, cards);

    ret = { newScript, newCards };

    return res.status(201).json(ret);
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
      const [allTracks] = await promiseConnection.query(sqlQuery1, []);

      return res.json(allTracks);
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
JOIN user ON Script.userID = User.userID
WHERE Script.userID = ?;`;

      const [userScripts] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userScripts) {
        return res.status(404).json({
          msg: "Scripts not found",
        });
      }

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
      const [allTracks] = await promiseConnection.query(sqlQuery1, []);

      return res.json(allTracks);
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

      const [userScripts] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userScripts) {
        return res.status(404).json({
          msg: "Scripts not found",
        });
      }

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
    // console.log(req.query.id);
    if (scriptID === "") {
      const sqlQuery1 = "SELECT * FROM Card;";
      const [allTracks] = await promiseConnection.query(sqlQuery1, []);

      return res.json(allTracks);
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
      const [scriptCards] = await promiseConnection.query(sqlQuery2, [
        scriptID,
      ]);

      if (!scriptCards) {
        return res.status(404).json({
          msg: "Cards not found",
        });
      }

      return res.status(200).json(scriptCards);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

module.exports = router;
