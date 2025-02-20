const {readFileContent} = require("../fileReader/fileReader");

async function processUser(user) {
  try {
    // Read the file content and convert it to a base64 string
    const base64image = await readFileContent(user.profilePicture);

    // Replace the filepath with the base64 string
    user.profilePicture = base64image;
    return user;
  } catch (err) {
    console.error(`Error reading profilePicture for User ID ${user.id}:`, err);
    user.profilePicture = ""; // Handle the error (set to null or keep original path)
    return user;
  }
}

module.exports = {
  processUser: processUser,
};
