require("dotenv").config();
const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { user, track } = new PrismaClient();
// const { JSON } = require("express");
const { getJWT, verifyJWT } = require("../../utils/jwt");
const { getUserExists, getTrackExists } = require("../../utils/database");

async function updateScript(scriptId, token, cards) {

    const queries = [];
    const deleteCards = prisma.user.deleteMany({
        where: {
            userID: scriptID,
        },
    })
    queries.push(deleteCards);

    for (let i = 0; i < cards.length; i++) {
        const newCard = prisma.card.create({
            data: {
                script: {
                    connect: {
                        id: scriptID,
                    }
                },
                order: i,
                textColor: cards[i].textColor,
                backgroundColor: cards[i].backgroundColor,
                imageURL: cards[i].imageURL,
                audioURL: cards[i].audioURL,
                text: cards[i].text,
                speed: cards[i].speed,


            }
        });
        queries.push(newCard);

    }
    let newCards = await prisma.batch(queries);
    return res.status(201).json(newCards);
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
        } else {
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


            return res.status(201).json(newScript);
        }
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
