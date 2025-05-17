import { supabase } from './lib/supabaseClient';

// Get a random GIF directly from Supabase
async function getRandomGifFromSupabase() {
  try {
    // First get the total count of GIFs
    const { count } = await supabase
      .from('gifs')
      .select('*', { count: 'exact', head: true });

    if (!count || count === 0) {
      console.warn('[Supabase] No GIFs found in database');
      return null;
    }

    // Get a random offset
    const randomOffset = Math.floor(Math.random() * count);
    
    // Fetch a single random GIF
    const { data, error } = await supabase
      .from('gifs')
      .select('gif_url')
      .range(randomOffset, randomOffset)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Generate public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gifs')
      .getPublicUrl(data.gif_url);

    return publicUrl;
    
  } catch (error) {
    console.error('[Supabase] Error fetching random GIF:', error);
    return null;
  }
}

// Updated message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getRandomGif") {
    getRandomGifFromSupabase().then((gifUrl) => {
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
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Extension] Initializing Supabase connection...');
});