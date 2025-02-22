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

async function writeToFile(fileName, base64String) {

  return new Promise((resolve, reject) => {
    const filePath = path.join(BASE_DIR, path.basename(fileName, ".txt"));
  
      fs.writeFile(filePath, base64String, "utf8", (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(filePath);
      });
  })
}
// Function to convert base64 string to file
function base64ToFile(base64String, fileName) {
  return new Promise((resolve, reject) => {
    try {
      // Split the base64 string into metadata and the actual base64 data
      // const base64Data = base64String.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
      
      // Decode base64 data
      // const buffer = Buffer.from(base64Data, 'base64');
      
      // Define the file path
      const filePath = path.join(BASE_DIR, fileName);
      
      // Write the buffer to the file
      fs.writeFile(filePath, base64String, 'base64', (err) => {
        if (err) {
          return reject(err);
        }
        resolve(filePath);
      });

      // fs.writeFile(filePath, base64String, "utf8", (err) => {
      //   if (err) {
      //     return reject(err);
      //   }
      //   resolve(filePath);
      // });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  readFileContent: readFileContent,
  generateFileName: generateFileName,
  deleteFile: deleteFile,
  writeToFile: writeToFile,
  base64ToFile: base64ToFile,
  BASE_DIR: BASE_DIR
};

