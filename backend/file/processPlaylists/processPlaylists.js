const {readFileContent} = require("../fileReader/fileReader");

async function processMultiplePlaylists(playlists) {
  // Use Promise.all to process all playlists concurrently
  return await Promise.all(
    playlists.map(async (playlist) => {
      playlist = await processSinglePlayList(playlist);
      return playlist;
    })
  );
}

async function processSinglePlayList(playlist) {
  try {
    // Read the file content and convert it to a base64 string
    const base64Thumbnail = await readFileContent(playlist.thumbnail);

    // Replace the filepath with the base64 string
    playlist.thumbnail = base64Thumbnail;
    return playlist;
  } catch (err) {
    console.error(
      `Error reading thumbnail for playlist ID ${playlist.id}:`,
      err
    );
    playlist.thumbnail = ""; // Handle the error (set to null or keep original path)
    return playlist;
  }
}

module.exports = {
  processMultiplePlaylists: processMultiplePlaylists,
  processSinglePlayList: processSinglePlayList,
};
