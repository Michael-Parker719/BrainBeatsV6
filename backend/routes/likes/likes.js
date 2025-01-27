require("dotenv").config();
const router = require("express").Router();
const { verifyJWT } = require("../../utils/jwt");
const { pool } = require("../../connect/connect");

// Create a promise-based connection pool
const promiseConnection = pool.promise();

// Create a user like
router.post('/createUserLike', async (req, res) => {
    try {
        const { trackID, userID, token } = req.body;

        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(401).json({ msg: "Invalid token" });
        }

        // Check if the user exists
        const [userExists] = await promiseConnection.query('SELECT * FROM User WHERE id = ?', [userID]);

        // Check if the track exists
        const [trackExists] = await promiseConnection.query('SELECT * FROM Tracks WHERE id = ?', [trackID]);

        if (userExists.length === 0) {
            return res.status(404).json({ msg: "User not found" });
        }
        if (trackExists.length === 0) {
            return res.status(404).json({ msg: "Track not found" });
        }

        // Check if the like already exists
        const [likeExists] = await promiseConnection.query(
            'SELECT * FROM Likes WHERE userID = ? AND trackID = ?',
            [userID, trackID]
        );

        if (likeExists.length > 0) {
            return res.status(409).json({ msg: "Like already exists" });
        }

        // Create a new like and update the track's like count in a transaction
        await promiseConnection.beginTransaction();

        try {
            const [newLike] = await promiseConnection.query(
                'INSERT INTO Likes (userID, trackID) VALUES (?, ?)',
                [userID, trackID]
            );

            await promiseConnection.query(
                'UPDATE Tracks SET likeCount = likeCount + 1 WHERE id = ?',
                [trackID]
            );

            await promiseConnection.commit();
            res.status(201).json({ msg: "Like created successfully", like: newLike });
        } catch (err) {
            await promiseConnection.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Error in createUserLike:", err);
        res.status(500).json({ msg: "Internal server error", error: err });
    }
});

// Remove a user like
router.delete('/removeUserLike', async (req, res) => {
    try {
        const { userID, trackID, token } = req.body;

        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(401).json({ msg: "Invalid token" });
        }

        // Check if the user exists
        const [userExists] = await promiseConnection.query('SELECT * FROM User WHERE id = ?', [userID]);

        // Check if the track exists
        const [trackExists] = await promiseConnection.query('SELECT * FROM Tracks WHERE id = ?', [trackID]);

        if (userExists.length === 0) {
            return res.status(404).json({ msg: "User not found" });
        }
        if (trackExists.length === 0) {
            return res.status(404).json({ msg: "Track not found" });
        }

        // Check if the like exists
        const [likeExists] = await promiseConnection.query(
            'SELECT * FROM Likes WHERE userID = ? AND trackID = ?',
            [userID, trackID]
        );

        if (likeExists.length === 0) {
            return res.status(404).json({ msg: "Like not found" });
        }

        // Delete the like and update the track's like count in a transaction
        await promiseConnection.beginTransaction();

        try {
            await promiseConnection.query(
                'DELETE FROM Likes WHERE userID = ? AND trackID = ?',
                [userID, trackID]
            );

            await promiseConnection.query(
                'UPDATE Tracks SET likeCount = likeCount - 1 WHERE id = ?',
                [trackID]
            );

            await promiseConnection.commit();
            res.status(200).json({ msg: "Like removed successfully" });
        } catch (err) {
            await promiseConnection.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Error in removeUserLike:", err);
        res.status(500).json({ msg: "Internal server error", error: err });
    }
});

// Get user like status
router.get('/getUserLike', async (req, res) => {
    try {
        const { userID, trackID } = req.query;

        const [likeStatus] = await promiseConnection.query(
            'SELECT * FROM Likes WHERE userID = ? AND trackID = ?',
            [userID, trackID]
        );

        if (likeStatus.length === 0) {
            return res.status(404).json({ msg: "Like not found" });
        }

        res.status(200).json(likeStatus[0]);
    } catch (err) {
        console.error("Error in getUserLike:", err);
        res.status(500).json({ msg: "Internal server error", error: err });
    }
});

// Get all user likes
router.get('/getAllUserLikes', async (req, res) => {
    try {
        const { userID } = req.query;

        const [allLikes] = await promiseConnection.query(
            'SELECT * FROM Likes WHERE userID = ?',
            [userID]
        );

        if (allLikes.length === 0) {
            return res.status(404).json({ msg: "No likes found for this user" });
        }

        res.status(200).json(allLikes);
    } catch (err) {
        console.error("Error in getAllUserLikes:", err);
        res.status(500).json({ msg: "Internal server error", error: err });
    }
});

module.exports = router;