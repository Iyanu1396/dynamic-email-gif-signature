// Default GIFs
const defaultGifs = [
  "https://media4.giphy.com/media/yoJC2iZ13CCkYd3aDK/giphy.gif",
  "https://media2.giphy.com/media/xYGnFm4mVcMxYIVq3v/giphy.gif",
  "https://media2.giphy.com/media/iibH5ymW6LFvSIVyUc/giphy.gif",
  "https://media0.giphy.com/media/MJp9HJBMGVfLps9zsN/giphy.gif",
  "https://media0.giphy.com/media/2yqyPZUR4mPFyRTpYi/giphy.gif",
  "https://media0.giphy.com/media/3DmODIoUHALa9QDUp2/giphy.gif",
  "https://media3.giphy.com/media/5quxvnjc77jutz5KGR/giphy.gif",
  "https://media0.giphy.com/media/Mx936qy6jLxyjbqTiR/giphy.gif",
  "https://media0.giphy.com/media/fUQ4rhUZJYiQsas6WD/giphy.gif",
  "https://media1.giphy.com/media/tTc43DeTm2kkJTrI2G/giphy.gif",
  "https://media3.giphy.com/media/8VrtCswiLDNnO/giphy.gif",
  "https://media4.giphy.com/media/n4oKYFlAcv2AU/giphy.gif",
  "https://media2.giphy.com/media/DbV0RlRbSWYBG/giphy.gif",
  "https://media4.giphy.com/media/Dh5q0sShxgp13DwrvG/giphy.gif",
];

// Initialize storage with default GIFs
async function initializeStorage() {
  const result = await chrome.storage.local.get(["gifs"]);
  if (!result.gifs || result.gifs.length === 0) {
    await chrome.storage.local.set({ gifs: defaultGifs });
  }
}

// Get a random GIF
async function getRandomGif() {
  await initializeStorage();
  const result = await chrome.storage.local.get(["gifs"]);
  const gifs = result.gifs || defaultGifs;
  return gifs[Math.floor(Math.random() * gifs.length)];
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getRandomGif") {
    getRandomGif().then((gifUrl) => {
      sendResponse({ gifUrl });
    });
    return true; // Required for async response
  }

  if (message.action === "getGifProxy") {
    fetch(message.url)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch(() => sendResponse({ error: "Failed to load GIF" }));
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(initializeStorage);
