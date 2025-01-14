require("dotenv").config();
const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { user, track } = new PrismaClient();
// const { JSON } = require("express");
const { getJWT, verifyJWT} = require("../../utils/jwt");
const { getUserExists, getTrackExists } = require("../../utils/database");

// Create a track
router.post('/createTrack', async (req, res) => {
    try {
        const { userID, title, bpm, key, scale, midi, instruments, noteTypes, token, thumbnail, likeCount} = req.body;
        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(401).json({
                msg: "Invalid token"
            });
        }

        const userExists = await getUserExists(userID, "id");
        if (!userExists) {
            return res.status(404).json({
                msg: "User not found"
            });
        } else {
            // Create a single record
            console.log(req)

            
            // const newTrack = await prisma.track.create({
            //     data: {
            //         user: {
            //             connect: {
            //                 id: userID
            //             }
            //         },
            //         title: title,
            //         bpm: bpm,
            //         key: key,
            //         scale: scale,
            //         instruments: instruments,
            //         noteTypes: noteTypes,
            //         thumbnail: thumbnail,
            //         midi: midi,
            //         likeCount: likeCount,
            //         public: true,
            //     }
            // });

            let sqlQuery = "INSERT INTO Track (title, bpm, key, scale, instruments, noteTypes, thumbnail, midi, likeCount, public, userID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await new Promise((resolve, reject) => {
                pool.query(sqlQuery, 
                    [title, bpm, key, scale, instruments, noteTypes, thumbnail, midi, likeCount, public, userID], (error, rows) => {
                        if (error) throw error;
                        resolve(rows[0]);
                    });
            });
            
            let newTrack = await new Promise((resolve, reject) => {
                pool.query('SELECT * FROM Track WHERE `midi` = ?', midi, (error, rows) => {
                    if (error) throw error;
                    resolve(rows[0]);
                })
            });
          return res.status(201).json(newTrack);
        }
    } catch (err) {
        console.log(err);
      return res.status(500).send({ msg: err });
    }
});

// Get all tracks based on a username
router.get('/getUserTracksByUsername', async (req, res) => {
    try {
        const username = req.query.username;
        if (username === "") {
            // const allTracks = await prisma.Track.findMany({
            //     include: {user : true}
            // });

            let allTracks = await new Promise((resolve, reject) => {
                pool.query('SELECT * FROM Track', (error, rows) => {
                    if (error) throw error;
                    resolve(rows);
                })
            });

            return res.json(allTracks);
        }

        const userExists = await getUserExists(username, "username");

        if (!userExists) {
            return res.status(404).json({
                msg: "Username not found"
            });
        } else {
            // Find the records
            // const userTracks = await prisma.Track.findMany({
            //     where: { userID: userExists.id },
            //     include: {user: true}
            // });

            let userTracks = await new Promise((resolve, reject) => {
                pool.query('SELECT * FROM Track WHERE `userID` = ?', userExists.id, (error, rows) => {
                    if (error) throw error;
                    resolve(rows);
                })
            });

            if (!userTracks) {
                return res.status(404).json({
                    msg: "Tracks not found"
                });
            }
            
            return res.status(200).json(userTracks);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

// Get all tracks based on a title
router.get('/getTracksByTitle', async (req, res) => {
    try {
        const title = req.query.title;
        if (title === "") {
            // const allTracks = await prisma.Track.findMany({
            //     include: {user : true}
            // });

            let allTracks = await new Promise((resolve, reject) => {
                pool.query('SELECT * FROM Track', (error, rows) => {
                    if (error) throw error;
                    resolve(rows);
                })
            });
            return res.json(allTracks);
        }
        
        // Find the records
        // const tracks = await prisma.Track.findMany({
        //     where: { title: 
        //         {
        //             contains: title 
        //         },
        //     },
        //     include: {user: true}
        // });

        let tracks = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Track WHERE `title` = ?', title, (error, rows) => {
                if (error) throw error;
                resolve(rows[0]);
            })
        });

        if (!tracks) {
            return res.status(404).json({
                msg: "Tracks not found"
            });
        }

        return res.status(200).json(tracks);
        
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

// Get all tracks based on a user ID
router.get('/getUserTracksByID', async (req, res) => {
    try {
        const userID = req.query.userID;
        const userExists = await getUserExists(userID, "id");
        
        if (!userExists) {
            return res.status(404).json({
                msg: "User not found"
            });
        } else {
            // const userTracks = await prisma.Track.findMany({
            //     where: { userID: req.query.userID },
            //     include: {user: true}
            // });

            let userTracks = await new Promise((resolve, reject) => {
                pool.query('SELECT * FROM Track WHERE `userID` = ?', userExists.id, (error, rows) => {
                    if (error) throw error;
                    resolve(rows);
                })
            });

            if (!userTracks) {
                return res.status(404).json({
                    msg: "User ID not found"
                });
            }

            return res.status(200).json(userTracks);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

router.get('/getTrackByID', async (req, res) => {

    const trackID = req.query.id;
    try {
        // const decoded = verifyJWT(req.body.token);

        // if (!decoded) {
        //     return res.status(401).json({
        //         msg: "Invalid token"
        //     });
        // }

        // const track = await prisma.Track.findUnique({
        //     where: { id: req.query.id },
        //     include: {user: true}
        // });

        let track = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Track WHERE `id` = ?', trackID, (error, rows) => {
                if (error) throw error;
                resolve(rows[0]);
            })
        });
        if (!track) {
            return res.status(404).json({
                msg: "Track ID not found"
            });
        }

        return res.status(200).json(track);
    }
    catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

// Get all tracks
router.get('/getAllTracks', async (req, res) => {
    try {
        // const tracks = await prisma.Track.findMany({
        //     include: {user: true}
        // });

        let tracks = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Track', (error, rows) => {
                if (error) throw error;
                resolve(rows);
            })
        });

        return res.status(200).json(tracks);
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

// Delete a track
router.delete('/deleteTrack', async (req, res) => {

    const trackID = req.body.id;
    try {
        const decoded = verifyJWT(req.body.token);
        console.log("JWT: " + req.body.token);

        if (!decoded) {
            return res.status(401).json({
                msg: "Invalid token"
                });
        }

        // await prisma.Track.delete({
        //     where: { id: req.body.id }
        // });

        await new Promise((resolve, reject) => {
            pool.query('DELETE FROM Track WHERE `id` = ?', trackID, (error, rows) => {
                if (error) throw error;
                resolve(rows[0]);
            })
        });

        return res.status(200).send({ msg: "Deleted a user track" });
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
});

/*  This API call just gets the top 8 popular tracks to display on the home page,
    it can be altered by changing the take below but since we are displaying 4 tracks
    on each row it should be a multiple of 4. */
router.get('/getPublicPopularTracks', async(req, res) => {
    try {
        const tracks = await prisma.Track.findMany({
            take: 8,
            orderBy: 
            {
                likeCount: 'desc',
            },
            where: {
                public: {
                    equals: true
                }
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
        })
        return res.status(200).json(tracks)
    } catch (err) {
        console.log(err);
        return res.status(500).send(err);
    }
});

// Update user track info 
router.put('/updateTrack', async (req, res) => {

    try {
        const { id, title, midi, thumbnail, likeCount, public, token} = req.body;

        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(401).json({
                msg: "Invalid token"
            });
        }

        // Check if the id already exists in db
        const trackExists = await getTrackExists(id, "id");
        console.log("tracksExists: " + trackExists);

        // No track, return
        if (!trackExists) {
            return res.status(404).json({
                msg: "Track not found"
            });
        } 

        // Get the updated track
        const updateTrack = await prisma.Track.update({
            where: { id },
            data: {
                title: title,
                likeCount: likeCount,
                midi: midi,
                public: public,
                thumbnail: thumbnail
            }
        });

        return res.status(200).json(updateTrack);
      
    } catch (err) {
        console.log(err);
        return res.status(500).send({msg: err});
    }
});

module.exports = router;
