const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../../uploads");

// Function to read the file and store its contents into a constant
async function readFileContent(fileName) {
  // const filePath = path.join(__dirname, "../uploads", fileName); // Path to your file
  const filePath = fileName;
  if (fileName == "") {
    return "";
  }
  // Return a Promise that will resolve to the file contents
  return new Promise((resolve, reject) => {
    let fileContent = ""; // Initialize an empty string to accumulate file content

    const stream = fs.createReadStream(filePath, "utf8"); // Create a readable stream with utf8 encoding

    // On data event, append each chunk to the fileContent
    stream.on("data", (chunk) => {
      fileContent += chunk;
    });

    // On end event, resolve the Promise with the full file content
    stream.on("end", () => {
      resolve(fileContent);
    });

    // On error event, reject the Promise with the error
    stream.on("error", (err) => {
      reject(err);
    });
  });
}

// Function to generate a filename based on the current datetime
async function generateFileName() {
  const now = new Date();

  // Format the datetime as YYYY-MM-DD_HH-mm-ss
  const timestamp = now.toISOString().replace(/[-:.]/g, "");

  // Generate the filename (you can modify the prefix or extension as needed)
  const filename = `file_${timestamp}.txt`;

  return filename;
}

// Function to delete a file based on its file path
async function deleteFile(filePath) {
   // Check if the file exists before attempting to delete it
   if (!fs.existsSync(filePath)) {
    console.log("File does not exist.");
    return;
  }

  // Use fs.unlink to delete the file
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting the file:", err);
    } else {
      console.log(`File deleted successfully: ${filePath}`);
    }
  });
}

async function writeToFile(fileName, base64String, userID) {

  return new Promise((resolve, reject) => {


    const userDir = path.join(BASE_DIR, `user_${userID}`);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(userDir, path.basename(fileName, ".txt"));
  
      fs.writeFile(filePath, base64String, "utf8", (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(filePath);
      });
  })
}


async function getUserIdFromCookie(req) {
  return req.cookies.userID;
}


module.exports = {
  readFileContent: readFileContent,
  generateFileName: generateFileName,
  deleteFile: deleteFile,
  writeToFile: writeToFile,
  getUserIdFromCookie: getUserIdFromCookie
};

