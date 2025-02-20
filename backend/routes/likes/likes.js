require("dotenv").config();
const router = require("express").Router();
const { verifyJWT } = require("../../utils/jwt");
const {
  getUserExists,
  getTrackExists,
  getLikeExists,
} = require("../../utils/database");
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();

// Create a user like
router.post("/createUserLike", async (req, res) => {
  try {
    const { objectID, userID, token } = req.body;

    console.log("REQ.BODY");
    console.log(req.body);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(userID, "id");

    const trackExists = await getTrackExists(objectID, "id");

    if (!userExists) {
      console.log("user doesnt exist");
      return res.status(404).json({
        msg: "User not found",
      });
    } else if (!trackExists) {
      console.log("track doesn't exist")
      return res.status(404).json({
        msg: "Post not found",
      });
    } else {
      const likeExists = await getLikeExists(trackID, userID);
      console.log("In the else statement...")
      if (likeExists) {
        return res.status(409).json({
          msg: "Like already exists",
        });
      }

      // Create a like
      const sqlQuery1 = `
        INSERT INTO \`Like\` (userID, trackID)
        VALUES (?, ?);
    `;

      const sqlQuery2 = `UPDATE Track 
      SET likeCount = likeCount + 1 WHERE id = ?`;
      const [newLike] = await promiseConnection.query(sqlQuery1, [
        userID,
        trackID,
      ]);

      await promiseConnection.query(sqlQuery2, [trackID]);

      res.status(201).json(newLike);
    }
  } catch (err) {
    console.error("from createUserLike: ", err);
    res.status(500).send({ msg: err });
  }
});

// Remove a user like
router.delete("/removeUserLike", async (req, res) => {
  try {
    const { userID, trackID, token } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(userID, "id");

    const trackExists = await getTrackExists(trackID, "id");

    if (!userExists) {
      return res.status(404).json({
        msg: "User not found",
      });
    } else if (!trackExists) {
      return res.status(404).json({
        msg: "Post not found",
      });
    } else {
      const sqlQuery1 = `DELETE FROM \`Like\` WHERE userID = ? AND trackID = ?;`;
      const sqlQuery2 = `UPDATE Track SET likeCount = likeCount - 1 WHERE id = ?;`;

      const [deleteLike] = await promiseConnection.query(sqlQuery1, [
        userID,
        trackID,
      ]);

      if (!deleteLike) {
        return res.status(404).json({
          msg: "Like not found",
        });
      }

      await promiseConnection.query(sqlQuery2, [trackID]);

      res.status(200).send({ msg: "Deleted a user like" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

// Get user like status
router.get("/getUserLike", async (req, res) => {
  try {
    const { userID, trackID } = req.query;

    const sqlQuery = `SELECT * FROM \`Like\` WHERE userID = ? AND trackID = ?;`;
    const [likeStatus] = await promiseConnection.query(sqlQuery, [
      userID,
      trackID,
    ]);

    if (likeStatus == null) res.status(400);
    else res.status(200);

    // console.log("Like Status: " + likeStatus);
    console.log("Status Code: " + res.statusCode);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

// Get all user likes
router.get("/getAllUserLikes", async (req, res) => {
  try {
    const { userID } = req.query;
    const sqlQuery = `SELECT * FROM \`Like\` WHERE userID = ?;`;

    const [allLikes] = await promiseConnection.query(sqlQuery, [userID]);

    console.log(allLikes);
    res.status(200).json(allLikes);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

module.exports = router;
