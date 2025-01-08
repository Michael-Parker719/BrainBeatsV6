const { PrismaClient } = require("@prisma/client");
//const { join } = require("@prisma/client/runtime");
const { pool } = require('../connect/connect');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');


// Gets whether a user exists or not based on the field leading the query.
// async function getUserExists(searchVal, searchType) {
//     if (!searchType) return false;
//     if (!searchVal) return false;
//     let result;
//     switch (searchType) {
//         case 'email':
//             result = await prisma.User.findUnique({
//                 where: { email: searchVal },
//                 select: {
//                     email: true,
//                     password: true,
//                     firstName: true,
//                     username: true,
//                     lastName: true,
//                     bio: true,
//                     profilePicture: true,
//                     id: true,
//                     likes: true,
//                     playlists: true,
//                     tracks: true,
//                     verified: true
//                 }
//             });
//             break;
//         case 'id':
//             result = await prisma.User.findUnique({
//                 where: { id: searchVal }
//             });
//             break;
//         case 'username':
//             result = await prisma.User.findUnique({
//                 where: { username: searchVal }
//             });
//             break;
//     }
//     if (!result) result = false;
//     return result;
// }

async function getUserExists(searchVal, searchType) {
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

async function getIsTokenExpired(searchVal) {
    let data = await prisma.User.findUnique({
        where: { resetPasswordToken: searchVal },
        select: {
            resetPasswordExpires: true,
        }
    });

    return data == null ? false : data.resetPasswordExpires < Date.now();
}

// Gets whether a post exists or not based on the field leading the query.
async function getTrackExists(searchVal, searchType) {
    //let result;

    let promise;
    if (searchType === "id") {

        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Track WHERE `id` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    }

    // switch (searchType) {
    //     case 'id':
    //         result = await prisma.Track.findUnique({
    //             where: { id: searchVal }
    //         });

    //         break;
    // }

    if (!promise) promise = false;
    return promise;
}

// Gets whether a playlist exists or not based on the field leading the query.
async function getPlaylistExists(searchVal, searchType) {
    //let result;

    let promise;
    if (searchType === "id") {

        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Playlist WHERE `id` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    }

    // switch (searchType) {
    //     case 'id':
    //         result = await prisma.Playlist.findUnique({
    //             where: { id: searchVal }
    //         });

    //         break;
    // }

    if (!promise) promise = false;
    return promise;
}

async function getLikeExists(trackID, userID) {

    let promise = await new Promise((resolve, reject) => {
        pool.query('SELECT * FROM `Like` WHERE `trackID` = ? AND `userID` = ?', trackID, userID, (error, rows) => {
            if (error) throw error;
            
            resolve(rows[0]);
        })
    });

    // let result = await prisma.Like.findUnique({
    //     where: {
    //         trackID_userID:{
    //             trackID: trackID,
    //             userID: userID
    //         }
    //     }
    // });

    if (!promise) promise = false;
    return promise;
}

async function getScriptExists(searchVal, searchType) {

    let promise;
    if (searchType === "id") {

        promise = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM Script WHERE `id` = ?', searchVal, (error, rows) => {
                if (error) throw error;
                
                resolve(rows[0]);
            })
        });
    }

    // let result;
    // switch (searchType) {
    //     case 'id':
    //         result = await prisma.script.findUnique({
    //             where: { id: searchVal }
    //         });

    //         break;
    // }

    if (!promise) promise = false;
    return promise;
}

// async function getUserLIkes(userID) {
//     let res = await prisma.Like.findUnique({
//         where: {
//             userID
//         }
//     })
//     return res;
// }

module.exports = {
    getUserExists: getUserExists,
    getTrackExists: getTrackExists,
//    getTrackExists1: getTrackExists1,
    getPlaylistExists: getPlaylistExists,
    getLikeExists: getLikeExists,
    getScriptExists: getScriptExists,
    getIsTokenExpired: getIsTokenExpired
}
