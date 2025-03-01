const {readFileContent} = require("../fileReader/fileReader");

async function processMultipleTracks(tracks) {
  // Use Promise.all to process all playlists concurrently
  return await Promise.all(
    tracks.map(async (track) => {
      track = await processSingleTrack(track);
      return track;
    })
  );
}

async function processSingleTrack(track) {
  try {
    // Read the file content and convert it to a base64 string
    const base64Thumbnail = await readFileContent(track.thumbnail);
    const base64Midi = await readFileContent(track.midi);

    // Replace the filepath with the base64 string
    track.thumbnail = base64Thumbnail;
    track.midi = base64Midi;

    return track;
  } catch (err) {
    console.error(`Error reading files for track ID ${track.id}:`, err);

    // Handle the error (set to null or keep original path)
    track.thumbnail = "";
    track.midi = "";
    return track;
  }
}

module.exports = {
  processMultipleTracks: processMultipleTracks,
  processSingleTrack: processSingleTrack,
};
