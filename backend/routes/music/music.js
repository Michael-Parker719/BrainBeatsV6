require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const { getBPMValues } = require("../../utils/music");
const { getUserExists } = require("../../utils/database");

// TODO : Don't think this is needed, change it to actually work for our case for downloading to
// Get user midi information by ID
router.get("/findMidi", async (req, res) => {
  const { username } = req.body;
  const userExists = await getUserExists(username, "username");

  if (!userExists) {
    return res.status(400).json({
      msg: "User not found",
    });
  } else {
    const sqlQuery = `
        SELECT Track.midi
        FROM User
        JOIN Track ON Track.userID = users.id
        WHERE User.username = ?;`;

        let [ posts ] = await promiseConnection.query(sqlQuery, [username]);
    /*
        const posts = await prisma.User.findUnique({
      where: { username: username },
      select: {
        posts: {
          select: {
            midi: true,
            data: true,
          },
        },
      },
    });
    */
    res.json(posts);
  }
});

// Get BPM values
router.get("/getBPMValues", async (req, res) => {
  const bpmValues = await getBPMValues();
  res.json(bpmValues);
});

module.exports = router;
