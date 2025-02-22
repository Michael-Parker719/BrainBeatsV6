const { readFileContent } = require("../fileReader/fileReader");

async function processMultipleScripts(scripts) {
  // Use Promise.all to process all playlists concurrently
  return await Promise.all(
    scripts.map(async (script) => {
      script = await processSingleScript(script);
      return script;
    })
  );
}

async function processSingleScript(script) {
  try {
    // Read the file content and convert it to a base64 string
    const base64Thumbnail = await readFileContent(script.thumbnail);

    // Replace the filepath with the base64 string
    script.thumbnail = base64Thumbnail;
    return script;
  } catch (err) {
    console.error(`Error reading thumbnail for script ID ${script.id}:`, err);
    script.thumbnail = ""; // Handle the error (set to null or keep original path)
    return script;
  }
}

async function processMultipleCards(cards) {
  // Use Promise.all to process all playlists concurrently
  return await Promise.all(
    cards.map(async (card) => {
      card = await processSingleCard(card);
      return card;
    })
  );
}

async function processSingleCard(card) {
  try {
    // Read the file content and convert it to a base64 string
    const base64Image = await readFileContent(card.imageURL);
    const base64Audio = await readFileContent(card.audioURL);

    // Replace the filepath with the base64 string
    card.imageURL = base64Image;
    card.audioURL = base64Audio;

    return card;
  } catch (err) {
    console.error(`Error reading URLS for card ID ${card.id}:`, err);

    // Handle the error (set to null or keep original path)
    card.imageURL = "";
    card.audioURL = "";
    return card;
  }
}

module.exports = {
  processMultipleScripts: processMultipleScripts,
  processMultipleCards: processMultipleCards,
  processSingleScript: processSingleScript,
  processSingleCard: processSingleCard,
};
