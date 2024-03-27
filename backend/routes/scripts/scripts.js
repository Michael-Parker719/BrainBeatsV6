require("dotenv").config();
const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { user, track } = new PrismaClient();
// const { JSON } = require("express");
const { getJWT, verifyJWT } = require("../../utils/jwt");
const { getUserExists, getTrackExists, getScriptExists } = require("../../utils/database");

function colorToHex(color){
    var redHex = ('00' + color.r.toString(16)).slice(-2); //009A
    var greenHex = ('00' + color.g.toString(16)).slice(-2); //009A
    var blueHex = ('00' + color.b.toString(16)).slice(-2); //009A

    let ret = redHex + greenHex + blueHex;
    console.log(color);
    console.log("color: ", ret);
    return ret;
}

async function updateScript(scriptID, token, cards) {

    const queries = [];
    const deleteCards = await prisma.card.deleteMany({
        where: {
            scriptID: scriptID,
        },
    })

    for (let i = 0; i < cards.length; i++) {
        const newCard = {
            // script: {
            //     connect: {
            //         id: scriptID,
            //     }
            // },
            scriptID: scriptID,
            order: i,
            textColor: colorToHex(cards[i].textColor),
            backgroundColor: colorToHex(cards[i].backgroundColor),
            imageURL: cards[i].imageURL,
            audioURL: cards[i].audioURL,
            text: cards[i].text,
            speed: cards[i].speed,


        };
        queries.push(newCard);

    }
    console.log(queries);
    let newCards = await prisma.card.createMany({
        data: queries,
    }
    );
    return newCards;
}

router.post('/createScript', async (req, res) => {
    try {
        const { userID, title, token, thumbnail, cards } = req.body;
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
        }
        // Create a single record
        console.log(req)
        const newScript = await prisma.script.create({
            data: {
                user: {
                    connect: {
                        id: userID
                    }
                },
                title: title,
                thumbnail: thumbnail,
                public: true,
            }
        });

        let newCards = updateScript(newScript.id, token, cards);

        ret = { newScript, newCards };

        return res.status(201).json(ret);
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

router.post('/updateScript', async (req, res) => {
    try {
        const { scriptID, token, cards } = req.body;

        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(401).json({
                msg: "Invalid token"
            });
        }
        const scriptExists = await getScriptExists(scriptID, "id");
        if (!scriptExists) {
            return res.status(404).json({
                msg: "Script not found"
            });
        }
        return updateScript(scriptID, token, cards);
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }

});

// Get all tracks based on a username
router.get('/getUserScriptsByUsername', async (req, res) => {
    try {
        const username = req.query.username;
        if (username === "") {
            const allTracks = await prisma.script.findMany({
                include: { user: true }
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
            const userScripts = await prisma.script.findMany({
                where: { userID: userExists.id },
                include: { user: true }
            });

            if (!userScripts) {
                return res.status(404).json({
                    msg: "Scripts not found"
                });
            }

            return res.status(200).json(userScripts);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send({ msg: err });
    }
});

router.get('/getCardsByScript', async (req, res) => {
});


module.exports = router;
