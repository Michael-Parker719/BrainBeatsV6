//Pool is the database name
require("dotenv").config();
const { pool } = require('../../connect/connect');
const router = require("express").Router();

router.get('/getUsers', async (req, res) => {
    pool.query('SELECT * FROM User', (error, rows) => {
        if (error) throw error;

        //console.log("This works!");
        //res.json(rows + "This works!");
        
        res.json(rows);
    });
});


router.get('/verifyUserId', async (req, res) => {
    pool.query('SELECT * FROM User WHERE `username` = ?', req.body.username, (error, rows) => {
        if (error) throw error;

        //console.log("This works!");
        //res.json(rows + "This works!");
        
        res.json(rows);
    });
});


// Get user by username
router.get('/verifyUser', async (req, res) => {
    try {

        let userExists = await getUserExist(req.body.id, "id");
        
        if (!userExists) {
            return res.status(400).json({
                msg: "Username does not exist"
            });
        }
        res.json(userExists);
    } catch (err) {
        console.log(err);
        res.status(500).send({ msg: err });
    }
});


async function getUserExist(searchVal, searchType) {
    if (!searchType) return false;
    if (!searchVal) return false;

    let promise;
    if (searchType === "username") {

        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM User WHERE `username` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    } else if (searchType === "id") {
        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM User WHERE `id` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    } else if (searchType === "email") {
        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM User WHERE `email` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    }

    if (!promise) promise = false;
    console.log("Testing...");
    console.log(promise);
    return promise;
}
module.exports = router;