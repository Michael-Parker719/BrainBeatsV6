require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const path = require("path");
const promiseConnection = pool.promise();
const { verifyJWT } = require("../../utils/jwt");
const { getUserExists, getPlaylistExists } = require("../../utils/database");
const {
  generateFileName,
  deleteFile,
  writeToFile,
} = require("../../file/fileReader/fileReader");

const {
  processMultiplePlaylists,
  processSinglePlayList,
} = require("../../file/processPlaylists/processPlaylists");
// Create a new playlist

//Thumbnail is a file upload is here
router.post("/createPlaylist", async (req, res) => {
  try {
    const { name, userID, token, thumbnail } = req.body;
    const decoded = verifyJWT(token);


    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(userID, "id");

    if (!userExists) {
      return res.status(400).json({
        msg: "User not found",
      });
    }

    const fileName = await generateFileName();
    const filePath = await writeToFile(fileName, thumbnail, userExists.id);

    const sqlQuery = `
    INSERT INTO Playlist (name, userID, thumbnail)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
    const [rows] = await promiseConnection.query(sqlQuery, [
      name,
      userID,
      filePath,
    ]);

    const newPlaylist = rows[0];

    return res.json(newPlaylist);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all playlists
router.get("/getAllPlaylists", async (req, res) => {
  try {
    const sqlQuery = "SELECT * FROM Playlist;";
    let [rows] = await promiseConnection.query(sqlQuery, []);

    const playlists = await processMultiplePlaylists(rows);

    return res.json(playlists);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all playlists for a user
router.get("/getUserPlaylists", async (req, res) => {
  const userID = req.query.userID;

  try {
    const sqlQuery = "SELECT * FROM Playlist WHERE `userID` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [userID]);
    const playlists = await processMultiplePlaylists(rows);

    return res.json(playlists);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});

// Get playlist by ID
router.get("/getPlaylistByID", async (req, res) => {
  try {
    const playlistExists = await getPlaylistExists(req.query.id, "id");

    if (!playlistExists) {
      return res.status(400).json({
        msg: "Playlist does not exist.",
      });
    }

    const playlist = await processSinglePlayList(playlistExists);

    return res.json(playlist);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});

// Get all playlists for a post by post ID
/*
router.get("/getPlaylistsByPostID", async (req, res) => {
  try {
    const postID = req.query.postID;

    const sqlQuery = `
    SELECT DISTINCT playlistID
    FROM PlaylistTrack
    WHERE postID = $1;
  ;`;

    const [playlists] = await promiseConnection.query(sqlQuery, [postID]);

    if (!playlists) {
      return res.status(400).json({
        msg: "Post does not exist",
      });
    }

    return res.json(playlists);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});
*/

// Get all posts in a playlist
/*
router.get("/getPostsByPlaylistID", async (req, res) => {
  try {
    const playlistExists = await getPlaylistExists(req.query.id, "id");

    if (!playlistExists) {
      return res.status(400).json({
        msg: "Playlist does not exist.",
      });
    } else {
      const posts = await prisma.PlaylistTrack.findMany({
        where: { playlistID: req.query.id },
        select: { post: true },
      });

      return res.json(posts);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});
*/

// Delete a playlist
router.delete("/deletePlaylist", async (req, res) => {
  try {
    let playlistID = req.body.id;
    const decoded = verifyJWT(req.body.token);

    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    const sqlQuery1 = "SELECT thumbnail FROM Playlist WHERE id = ?;";
    const [playlist] = await promiseConnection.query(sqlQuery1, [playlistID]);
    const thumbnailPath = playlist[0].thumbnail;
    await deleteFile(thumbnailPath);

    const sqlQuery2 = "DELETE FROM Playlist WHERE id = ?;";
    await promiseConnection.query(sqlQuery2, [playlistID]);

    return res.status(200).send({ msg: "Deleted a user playlist" });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});

// Put post in playlist
/*
router.post("/addPostToPlaylist", async (req, res) => {
  try {
    const { playlistID, postID, token } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    const playlistExists = await getPlaylistExists(playlistID, "id");

    const postExists = await getPostExists(postID, "id");

    if (!playlistExists) {
      return res.status(400).json({
        msg: "Playlist does not exist.",
      });
    } else if (!postExists) {
      return res.status(400).json({
        msg: "Post does not exist.",
      });
    } else {
      const newPost = await prisma.PlaylistTrack.create({
        data: {
          postID: postID,
          playlistID: playlistID,
        },
      });
      return res.json(newPost);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send({ msg: err });
  }
});
*/

// Remove a post from a playlist
/*
router.delete("/removePostFromPlaylist", async (req, res) => {
  try {
    const { postID, playlistID, token } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    const removePost = await prisma.PlaylistTrack.delete({
      where: {
        postID_playlistID: {
          postID: postID,
          playlistID: playlistID,
        },
      },
    });
    return res.status(200).send({ msg: "Removed a post from a playlist" });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});
*/

// TODO : Update a playlist

router.put("/updatePlaylist", async (req, res) => {
  try {
    const { id, name, thumbnail, token } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(400).json({
        msg: "Invalid token",
      });
    }

    const sqlQuery1 = "SELECT * FROM Playlist WHERE id = ?";
    const sqlQuery2 = "UPDATE Playlist SET name = ?, thumbnail = ? WHERE id = ?;";
    
    let [playlist] = await promiseConnection.query(sqlQuery2, [id]);
    const thumbnailPath = playlist[0].thumbnail;
    await deleteFile(thumbnailPath);

    const fileName = await generateFileName();
    const filePath = await writeToFile(fileName, thumbnail, playlist[0].userID);

    await promiseConnection.query(sqlQuery1, [name, filePath, id]);
    let [rows] = await promiseConnection.query(sqlQuery2, [id]);
    let updatePlaylist = rows[0];

    //   return res.status(200).send({msg: "Updated OK"});
    return res.json(updatePlaylist);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});

module.exports = router;
