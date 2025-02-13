const { pool } = require("../connect/connect");
const promiseConnection = pool.promise();

// Gets whether a user exists or not based on the field leading the query.
async function getUserExists(searchVal, searchType) {
  if (!searchType) return false;
  if (!searchVal) return false;

  let promise;
  if (searchType === "username") {
    const sqlQuery = "SELECT * FROM User WHERE `username` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  } else if (searchType === "id") {
    const sqlQuery = "SELECT * FROM User WHERE `id` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  } else if (searchType === "email") {
    const sqlQuery = "SELECT * FROM User WHERE `email` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  }

  if (!promise) promise = false;
  // console.log("Testing...");
  // console.log(promise);

  return promise;
}

async function getIsTokenExpired(searchVal) {
  const sqlQuery = `SELECT resetPasswordExpires
FROM User
WHERE resetPasswordToken = ?;`;

  let [data] = await promiseConnection.query(sqlQuery, [true]);

  return data == null ? false : data.resetPasswordExpires < Date.now();
}

// Gets whether a post exists or not based on the field leading the query.
async function getTrackExists(searchVal, searchType) {
  //let result;

  let promise;
  if (searchType === "id") {
    const sqlQuery = "SELECT * FROM Track WHERE `id` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  }

  if (!promise) promise = false;
  return promise;
}

// Gets whether a playlist exists or not based on the field leading the query.
async function getPlaylistExists(searchVal, searchType) {
  //let result;

  let promise;
  if (searchType === "id") {
    const sqlQuery = "SELECT * FROM Playlist WHERE `id` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  }

  if (!promise) promise = false;
  return promise;
}

async function getLikeExists(trackID, userID) {
  const sqlQuery = "SELECT * FROM `Like` WHERE `trackID` = ? AND `userID` = ?;";
  let [rows] = await promiseConnection.query(sqlQuery, [trackID, userID]);
  let promise = rows[0];

  if (!promise) promise = false;
  return promise;
}

async function getScriptExists(searchVal, searchType) {
  let promise;
  if (searchType === "id") {
    const sqlQuery = "SELECT * FROM Script WHERE `id` = ?;";
    let [rows] = await promiseConnection.query(sqlQuery, [searchVal]);
    promise = rows[0];
  }

  if (!promise) promise = false;
  return promise;
}

module.exports = {
  getUserExists: getUserExists,
  getTrackExists: getTrackExists,
  getPlaylistExists: getPlaylistExists,
  getLikeExists: getLikeExists,
  getScriptExists: getScriptExists,
  getIsTokenExpired: getIsTokenExpired,
};
