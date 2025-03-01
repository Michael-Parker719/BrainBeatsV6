const {readFileContent} = require("../fileReader/fileReader");

async function processMusic(posts) {
  return await Promise.all(
    posts.map(async (post) => {
      try {

        // Read the file content and convert it to a base64 string
        const base64Midi = await readFileContent(post.midi);

        // Replace the filepath with the base64 string
        post.midi = base64Midi;

        return post;
      } catch (err) {
        console.error(`Error reading files for post`, err);

        // Handle the error (set to null or keep original path)
        post.midi = "";
        return post;
      }
    })
  );
}

module.exports = {
  processMusic: processMusic,
};
