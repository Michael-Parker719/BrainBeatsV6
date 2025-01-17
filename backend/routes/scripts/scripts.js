require("dotenv").config();
const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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
      const newCard = {
        scriptID: scriptID,
        order: i,
        textColor: colorToHex(cards[i].textColor),
        backgroundColor: colorToHex(cards[i].backgroundColor),
        imageURL: cards[i].imageURL,
        audioURL: cards[i].audioURL,
        text: cards[i].text,
        speed: cards[i].speed,
      };
      console.log(newCard);
      queries.push(newCard);
    }
    console.log(queries);

    const sqlQuery2 = `
        INSERT INTO Card (scriptID, \`order\`, textColor, backgroundColor, imageURL, audioURL, text, speed)
        VALUES ?;
    `;

    let [ newCards ] = await promiseConnection.query(sqlQuery2, [queries]);

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

    // const newScript = await prisma.script.create({
    //   data: {
    //     user: {
    //       connect: {
    //         id: userID,
    //       },
    //     },
    //     title: title,
    //     thumbnail: thumbnail,
    //     public: true,
    //   },
    // });

    const sqlQuery = `
        INSERT INTO Script (userID, title, thumbnail, public)
        VALUES (?, ?, ?, TRUE);
    `;

    let [ rows ] = await promiseConnection.query(sqlQuery, [userID, title, thumbnail] );
    let newScript = rows[0];
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

    const sqlQuery = `UPDATE Script
SET 
    user_id = ?,
    title = ?,
    thumbnail = ?,
    public = true
WHERE id = ?;`;
    
let [ rows ] = await promiseConnection.query(sqlQuery, [])
    // const newScript = await prisma.script.update({
    //   where: {
    //     id: scriptID,
    //   },
    //   data: {
    //     user: {
    //       connect: {
    //         id: userID,
    //       },
    //     },
    //     title: title,
    //     thumbnail: thumbnail,
    //     public: true,
    //   },
    // });

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
      const allTracks = await prisma.script.findMany({
        include: { user: true },
      });

      return res.json(allTracks);
    }

    const userExists = await getUserExists(username, "username");

    if (!userExists) {
      return res.status(404).json({
        msg: "Username not found",
      });
    } else {
      // Find the records
      const userScripts = await prisma.script.findMany({
        where: { userID: userExists.id },
        include: { user: true },
      });

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

// Get all tracks based on a username
router.get("/getUserScriptsByID", async (req, res) => {
  try {
    const userID = req.query.userID;
    if (userID === "") {
      const allTracks = await prisma.script.findMany({
        include: { user: true },
      });

      return res.json(allTracks);
    }

    const userExists = await getUserExists(userID, "id");

    if (!userExists) {
      return res.status(404).json({
        msg: "Username not found",
      });
    } else {
      // Find the records
      const userScripts = await prisma.script.findMany({
        where: { userID: userExists.id },
        include: { user: true },
      });

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
    if (scriptID === "") {
      const allTracks = await prisma.card.findMany({
        include: { script: true },
      });

      return res.json(allTracks);
    }

    const scriptExists = await getScriptExists(scriptID, "id");

    if (!scriptExists) {
      return res.status(404).json({
        msg: "Script not found",
      });
    } else {
      // Find the records
      const scriptCards = await prisma.card.findMany({
        where: { scriptID: scriptExists.id },
        // include: { user: true }
      });

      if (!scriptCards) {
        return res.status(404).json({
          msg: "Cards not found",
        });
      }
      // function compareCards(card1, card2){
      //     return card1.order - card2.order
      // }
      // scriptCards.sort(compareCards)

      return res.status(200).json(scriptCards);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

module.exports = router;
