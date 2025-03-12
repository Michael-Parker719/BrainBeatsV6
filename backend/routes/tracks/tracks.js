require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const { verifyJWT } = require("../../utils/jwt");
const { getUserExists, getTrackExists } = require("../../utils/database");
const {
  processSingleTrack,
  processMultipleTracks,
} = require("../../file/processTracks/processTracks");
const {
  deleteFile,
  generateFileName,
  writeToFile,
} = require("../../file/fileReader/fileReader");

router.post("/testCreateTrack", async (req, res) => {
  try {
    const sqlQuery1 = `
  INSERT INTO Track 
      (title, bpm, \`key\`, \`scale\`, likeCount, midi, thumbnail, 
      userID, public) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?);
`;


    // Placeholder values for each column (in order)
    const values = [
      "My Track", // title
      120, // bpm
      "C", // key
      "major", // scale
      0, // likeCount
      "/path/to/midi/file", // midi
      "/path/to/thumbnail/image", // thumbnail
      43, // userID
      true, // public
    ];

    await promiseConnection.query(sqlQuery1, values, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
      } else {
        console.log("Record inserted:", results);
      }
    });

    return res.status(201).send("Sucess!!!");
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});
// Create a track
router.post("/createTrack", async (req, res) => {
  try {
    const {
      userID,
      title,
      bpm,
      key,
      scale,
      midi,
      instruments,
      noteTypes,
      token,
      thumbnail,
      likeCount,
    } = req.body;

    console.log("IN THE CREATE TRACK ROUTE!!!!!");

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
    } else {
      // Create a single record
      // console.log(req);

      const sqlQuery1 = `
  INSERT INTO Track 
      (title, bpm, \`key\`, \`scale\`, instruments, 
      noteTypes, likeCount, midi, thumbnail, 
      userID, public) VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

      const fileName1 = await generateFileName();
      const filePath1 = await writeToFile(fileName1, thumbnail);

      const fileName2 = await generateFileName();
      const filePath2 = await writeToFile(fileName2, midi);

      await promiseConnection.query(sqlQuery1, [
        title,
        bpm,
        key,
        scale,
        JSON.stringify(instruments),
        JSON.stringify(noteTypes),
        likeCount,
        filePath2,
        filePath1,
        userID,
        1,
      ]);

      const sqlQuery2 = "SELECT * FROM Track WHERE `midi` = ?";
      let [rows] = await promiseConnection.query(sqlQuery2, [filePath2]);
      
      let newTrack = await processSingleTrack(rows[0]);
      console.log(newTrack);
      return res.status(201).json(newTrack);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all tracks based on a username
router.get("/getUserTracksByUsername", async (req, res) => {
  try {
    const username = req.query.username;
    if (username === "") {
      const sqlQuery1 = "SELECT * FROM Track";
      let [rows] = await promiseConnection.query(sqlQuery1);
      let tracks = await processMultipleTracks(rows);

      return res.json(tracks);
    }

    const userExists = await getUserExists(username, "username");

    if (!userExists) {
      return res.status(404).json({
        msg: "Username not found",
      });
    } else {
      const sqlQuery2 = "SELECT * FROM Track WHERE `userID` = ?";
      let [userTracks] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userTracks) {
        return res.status(404).json({
          msg: "Tracks not found",
        });
      }

      userTracks = await processMultipleTracks(userTracks);

      return res.status(200).json(userTracks);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

router.get("/getNumberUserTracks", async (req, res) => {
  try {
    const userID = req.query.userID;

    const userExists = await getUserExists(userID, "id");

    if (!userExists) {
      return res.status(404).json({
        msg: "UserId not found",
      });
    } else {
      const sqlQuery2 = "SELECT * FROM Track WHERE `userID` = ?";
      let [userTracks] = await promiseConnection.query(sqlQuery2, [
        userExists.id,
      ]);

      if (!userTracks) {
        return res.status(404).json({
          msg: "Tracks not found",
        });
      }

      // console.log("***********************");
      // console.log(userTracks);
      // console.log(userTracks.length);
      // console.log("***********************");
      return res.status(200).json(userTracks.length);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});
// Get all tracks based on a title
router.get("/getTracksByTitle", async (req, res) => {
  try {
    const title = req.query.title;
    if (title === "") {
      const sqlQuery1 = `
      SELECT Track.*, User.firstName, User.lastName
      FROM Track
      INNER JOIN User ON Track.userID = User.id
      `;
      let [allTracks] = await promiseConnection.query(sqlQuery1);
      allTracks = await processMultipleTracks(allTracks);

      return res.json(allTracks);
    }

    const sqlQuery2 = `
    SELECT Track.*, User.firstName, User.lastName
    FROM Track 
    INNER JOIN User ON Track.userID = User.id
    WHERE \`title\` = ?`;
    let [tracks] = await promiseConnection.query(sqlQuery2, [title]);

    if (!tracks) {
      return res.status(404).json({
        msg: "Tracks not found",
      });
    }

    tracks = await processMultipleTracks(tracks);
    return res.status(200).json(tracks);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all tracks based on a user ID
router.get("/getUserTracksByID", async (req, res) => {
  try {
    const userID = req.query.userID;
    const userExists = await getUserExists(userID, "id");

    // console.log(userID);
    if (!userExists) {
      return res.status(404).json({
        msg: "User not found",
      });
    } else {
      const sqlQuery = `
      SELECT Track.*, User.firstName, User.lastName
      FROM Track 
      INNER JOIN User ON Track.userID = User.id
      WHERE Track.userID = ?`;
      let [userTracks] = await promiseConnection.query(sqlQuery, [
        userExists.id,
      ]);

      if (!userTracks) {
        return res.status(404).json({
          msg: "User ID not found",
        });
      }

      userTracks = await processMultipleTracks(userTracks);
      // console.log(userTracks);
      return res.status(200).json(userTracks);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

router.get("/getTrackByID", async (req, res) => {
  const trackID = req.query.id;
  try {
    const sqlQuery = "SELECT * FROM Track WHERE `id` = ?";
    let [rows] = await promiseConnection.query(sqlQuery, [trackID]);
    let track = await processSingleTrack(rows[0]);

    if (!track) {
      return res.status(404).json({
        msg: "Track ID not found",
      });
    }

    return res.status(200).json(track);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all tracks
router.get("/getAllTracks", async (req, res) => {
  try {
    const sqlQuery = "SELECT * FROM Track";
    let [tracks] = await promiseConnection.query(sqlQuery);
    tracks = await processMultipleTracks(tracks);

    return res.status(200).json(tracks);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

// Delete a track
router.delete("/deleteTrack", async (req, res) => {
  const trackID = req.body.id;
  try {
    const decoded = verifyJWT(req.body.token);
    console.log("JWT: " + req.body.token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const sqlQuery1 = "SELECT * FROM Track WHERE id = ?";
    const sqlQuery2 = "DELETE FROM Track WHERE id = ?";

    let [rows] = await promiseConnection.query(sqlQuery1, [trackID]);

    let thumbnail = "";
    let midi = "";
    if (rows[0]) {
      thumbnail = rows[0].thumbnail;
      midi = rows[0].midi;
    }

    await deleteFile(thumbnail);
    await deleteFile(midi);

    await promiseConnection.query(sqlQuery2, [trackID]);

    return res.status(200).send({ msg: "Deleted a user track" });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

/*  This API call just gets the top 8 popular tracks to display on the home page,
    it can be altered by changing the take below but since we are displaying 4 tracks
    on each row it should be a multiple of 4. */
router.get("/getPublicPopularTracks", async (req, res) => {
  try {
    const sqlQuery = `
    SELECT t.*, u.firstName, u.lastName 
    FROM Track t 
    JOIN User u ON t.userID = u.id 
    WHERE t.public = 1 
    ORDER BY t.likeCount DESC 
    LIMIT 8`;

    let [tracks] = await promiseConnection.query(sqlQuery, []);
    tracks = await processMultipleTracks(tracks);

    return res.status(200).json(tracks);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

// Update user track info
router.put("/updateTrack", async (req, res) => {
  try {
    const { id, title, midi, thumbnail, likeCount, public, token } = req.body;

    console.log("****************************");
    console.log(req.body);
    console.log("****************************");
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    // Check if the id already exists in db
    const trackExists = await getTrackExists(id, "id");
    console.log("tracksExists: " + trackExists);

    // No track, return
    if (!trackExists) {
      return res.status(404).json({
        msg: "Track not found",
      });
    }

    await deleteFile(trackExists.thumbnail);
    await deleteFile(trackExists.midi);

    const sqlQuery = `
        UPDATE Track
        SET 
            title = ?, 
            likeCount = ?, 
            midi = ?, 
            public = ?, 
            thumbnail = ?
        WHERE 
            id = ?;
    `;

    const fileName1 = await generateFileName();
    const filePath1 = await writeToFile(fileName1, thumbnail);

    const fileName2 = await generateFileName();
    const filePath2 = await writeToFile(fileName2, midi);

    let [tracks] = await promiseConnection.query(sqlQuery, [
      title,
      likeCount,
      filePath2,
      public,
      filePath1,
      id,
    ]);

    return res.status(200).json(tracks);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ msg: err });
  }
});

module.exports = router;
