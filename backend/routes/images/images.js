require("dotenv").config();
const router = require("express").Router();
const { pool } = require("../../connect/connect");
const promiseConnection = pool.promise();
const { deleteFile } = require("../../fileReader/fileReader");
const { verifyJWT } = require("../../utils/jwt");
const { getUserExists } = require("../../utils/database");

router.put("/updateUserProfilePic", async (req, res) => {
  try {
    const { id, token, profilePicture } = req.body;
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    const userExists = await getUserExists(id, "id");

    if (!userExists) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    const fullPath = userExists.profilePicture + ".txt";
    await deleteFile(fullPath);

    const fileName = await generateFileName();

    // Full path to the new .txt file
    const filePath = path.join(BASE_DIR, path.basename(fileName, ".txt"));

    fs.writeFile(filePath, profilePicture, "utf8", (err) => {
      if (err) {
        return res.status(500).send("Error saving the file.");
      }
    });

    const sqlQuery1 = `
        UPDATE User SET profilePicture = ? WHERE id = ?`;

    const sqlQuery2 = "SELECT * FROM User WHERE id = ?";
    await promiseConnection.query(sqlQuery1, [filePath, id]);
    let [rows] = await promiseConnection.query(sqlQuery2, [id]);
    let updateUser = rows[0];

    return res.status(200).json({ updateUser });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});


/*

router.put("/updateTrackPic", async (req, res) => {
  try {
    const { id, token, thumbnail } = req.body;

    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({
        msg: "Invalid token",
      });
    }

    // Check if the user already exists in db
    const postExists = await getPostExists(id, "id");

    if (!postExists) {
      return res.status(404).json({
        msg: "Track ID not found",
      });
    } else {


      const sqlQuery1 = 'SELECT * FROM Track WHERE id = ?;';
      let [rows] = await promiseConnection.query(sqlQuery1, [id]);
      let oldThumbnail = rows[0];

      
      const sqlQuery2 = 'UPDATE Track SET thumbnail = ? WHERE id = ?';

      const updateTrack = await prisma.Post.update({
        where: { id },
        data: {
          thumbnail,
        },
      });


      console.log(updateTrack);
      res.status(200).send({ updateUser });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

*/

module.exports = router;
