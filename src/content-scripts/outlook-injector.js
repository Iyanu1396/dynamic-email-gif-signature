(function() {
  console.log("Outlook GIF Signature - Secure Edition");

  const SIGNATURE_CLASS = 'outlook-gif-signature';
  const COMPOSE_BOX_SELECTOR = '.dFCbN.dPKNh.z8tsM.DziEn[aria-label="Message body, press Alt+F10 to exit"]';
  
  // Track the current GIF for persistence
  let currentGifDataUrl = null;
  // Your website URL that the GIF will link to
  const WEBSITE_URL = 'https://dynamic-gif-signature.netlify.app/dashboard/manage';
  
  // Base64 encoded transparent 1x1 GIF as placeholder
  const PLACEHOLDER_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  let composeBoxObserver;

  function initialize() {
    // Check immediately
    checkForComposeBox();
    
    // Set up observer for dynamic loading
    composeBoxObserver = new MutationObserver(() => checkForComposeBox());
    composeBoxObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Listen for clear events at document level
    document.addEventListener('keydown', handleClearEvents);
    
    // Listen for send button clicks
    listenForSendEvent();
  }

  function listenForSendEvent() {
    // Look for the send button in Outlook
    const sendButton = document.querySelector('[aria-label="Send"]');
    if (sendButton) {
      if (!sendButton.dataset.gifMonitored) {
        sendButton.dataset.gifMonitored = "true";
        sendButton.addEventListener('click', prepareSignaturesForSending);
      }
    }
    
    // Also look for keyboard shortcuts for send (Ctrl+Enter or Alt+S)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key === 'Enter') || (e.altKey && e.key === 's')) {
        prepareSignaturesForSending();
      }
    });
    
    // Set an interval to keep checking for the send button
    setInterval(() => {
      const sendBtn = document.querySelector('[aria-label="Send"]');
      if (sendBtn && !sendBtn.dataset.gifMonitored) {
        sendBtn.dataset.gifMonitored = "true";
        sendBtn.addEventListener('click', prepareSignaturesForSending);
      }
    }, 2000);
  }

  function prepareSignaturesForSending() {
    console.log("Preparing GIF signatures for sending");
    const composeBoxes = document.querySelectorAll(COMPOSE_BOX_SELECTOR);
    
    composeBoxes.forEach(composeBox => {
      const signature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
      if (signature) {
        // Remove protection attributes and make link clickable
        makeSignatureClickable(signature);
      }
    });
  }

  function makeSignatureClickable(signature) {
    // Get the image element
    const img = signature.querySelector('.gif-signature-image');
    if (!img) return;
    
    // Remove content-editable and pointer-events restrictions
    signature.contentEditable = 'true';
    signature.style.pointerEvents = 'auto';
    
    // Remove the overlay if it exists
    const overlay = signature.querySelector('.gif-overlay');
    if (overlay) overlay.remove();
    
    // Find the image container and link
    const imgContainer = signature.querySelector('.gif-container');
    const imgLink = signature.querySelector('.gif-link');
    
    if (imgContainer && !imgLink) {
      // Create a proper <a> tag around the image
      const imgParent = img.parentElement;
      const link = document.createElement('a');
      link.href = WEBSITE_URL;
      link.target = '_blank';
      link.className = 'gif-link';
      
      // Replace img with the linked version
      img.remove();
      link.appendChild(img);
      imgParent.appendChild(link);
      
      // Make sure the image is clickable
      img.style.pointerEvents = 'auto';
    } else if (imgLink) {
      // Update existing link
      imgLink.style.pointerEvents = 'auto';
      img.style.pointerEvents = 'auto';
    }
    
    // Re-enable all event handlers
    signature.removeEventListener('click', blockEvent);
    signature.removeEventListener('mousedown', blockEvent);
    signature.removeEventListener('contextmenu', blockEvent);
  }

  function handleClearEvents(e) {
    // Listen for Ctrl+A and Delete/Backspace
    if ((e.key === 'a' && (e.ctrlKey || e.metaKey)) || 
        e.key === 'Delete' || 
        e.key === 'Backspace') {
      // Small delay to let default action happen first
      setTimeout(() => {
        const composeBoxes = document.querySelectorAll(COMPOSE_BOX_SELECTOR);
        composeBoxes.forEach(composeBox => {
          if (!composeBox.querySelector(`.${SIGNATURE_CLASS}`)) {
            // Signature was cleared, restore the exact same one
            restoreSignature(composeBox);
          }
        });
      }, 50);
    }
  }

  function checkForComposeBox() {
    const composeBoxes = document.querySelectorAll(COMPOSE_BOX_SELECTOR);
    
    composeBoxes.forEach(composeBox => {
      if (!composeBox.dataset.gifProcessed) {
        composeBox.dataset.gifProcessed = "true";
        
        // Only inject if not already present
        if (!composeBox.querySelector(`.${SIGNATURE_CLASS}`)) {
          injectSignature(composeBox);
        }
        
        // Also add the toggle button
        if (!composeBox.parentElement?.querySelector('.gif-signature-button-container')) {
          injectToggleButton(composeBox);
        }
        
        // Watch for content changes to detect signature removal or new Outlook signature insertion
        const observer = new MutationObserver((mutations) => {
          // Look for signature changes
          const signatureAdded = mutations.some(m => 
            Array.from(m.addedNodes).some(n => 
              n.id === "Signature" || (n.querySelector && n.querySelector('#Signature'))
            )
          );
          
          if (signatureAdded) {
            // A new Outlook signature was added, make sure our GIF comes after it
            repositionGifAfterSignature(composeBox);
          }
          
          // Only restore if the signature is completely gone
          if (!composeBox.querySelector(`.${SIGNATURE_CLASS}`)) {
            restoreSignature(composeBox);
          }
        });
        
        observer.observe(composeBox, { 
          childList: true, 
          subtree: true,
          characterData: true 
        });
      }
    });
  }
  
  // Find the Outlook signature element
  function findOutlookSignature(composeBox) {
    // Look for the standard Outlook signature element
    const signature = composeBox.querySelector('#Signature');
    if (signature) {
      return signature;
    }
    
    // Look for other signature elements with class elementToProof
    const alternativeSignature = composeBox.querySelector('.elementToProof');
    if (alternativeSignature) {
      return alternativeSignature;
    }
    
    // No Outlook signature found
    return null;
  }
  
  // Function to reposition GIF after Outlook signature
  function repositionGifAfterSignature(composeBox) {
    const gifSignature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
    if (!gifSignature) return;
    
    const outlookSignature = findOutlookSignature(composeBox);
    if (!outlookSignature) return;
    
    console.log("Checking if GIF needs to be moved after Outlook signature");
    
    // Check position and move if needed
    if (isNodeBefore(gifSignature, outlookSignature)) {
      console.log("Moving GIF to appear after Outlook signature");
      // Insert after the signature block
      if (outlookSignature.nextSibling) {
        outlookSignature.parentNode.insertBefore(gifSignature, outlookSignature.nextSibling);
      } else {
        outlookSignature.parentNode.appendChild(gifSignature);
      }
    }
  }
  
  // Helper function to check if nodeA appears before nodeB in the DOM
  function isNodeBefore(nodeA, nodeB) {
    if (!nodeA || !nodeB) return false;
    let position = nodeA.compareDocumentPosition(nodeB);
    return !!(position & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  
  function restoreSignature(composeBox) {
    // Use the same GIF URL that was active before
    if (currentGifDataUrl) {
      injectSignature(composeBox, true);
    } else {
      injectSignature(composeBox);
    }
  }

  function injectSignature(composeBox, useExisting = false) {
    // Clean up existing if present (prevents duplicates)
    const existingSig = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
    if (existingSig) existingSig.remove();
    
    // Create signature container with proper protection
    const signature = document.createElement('div');
    signature.className = SIGNATURE_CLASS;
    
    // Make signature non-editable and non-selectable
    signature.contentEditable = 'false';
    
    Object.assign(signature.style, {
      marginTop: '20px',
      padding: '10px 0',
      borderTop: '1px solid #dddddd',
      userSelect: 'none',    // Prevent selection
      MozUserSelect: 'none', // Firefox
      WebkitUserSelect: 'none', // Safari
      msUserSelect: 'none',  // IE/Edge
      pointerEvents: 'none'  // Prevent clicking
    });
    
    // Create signature content with properly structured container for linking
    signature.innerHTML = `
      <div class="gif-signature-content" style="max-width: 250px; margin: 15px 0;">
        <div class="gif-container" style="max-width: 250px; max-height: 150px; position: relative;">
          <div class="gif-link-container">
            <img src="${useExisting && currentGifDataUrl ? currentGifDataUrl : PLACEHOLDER_GIF}" 
                 class="gif-signature-image"
                 style="max-width: 100%; height: auto; display: block; border: 0; pointer-events: none;">
          </div>
          <div class="gif-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></div>
        </div>
        <div style="font-size: 11px; color: #666666; margin-top: 5px; pointer-events: none;">
          Sent with Dynamic GIF Signature
        </div>
      </div>
    `;
    
    // Check for existing Outlook signature to position our GIF after it
    const outlookSignature = findOutlookSignature(composeBox);
    
    if (outlookSignature) {
      // Insert our GIF signature after the Outlook signature
      if (outlookSignature.nextSibling) {
        outlookSignature.parentNode.insertBefore(signature, outlookSignature.nextSibling);
      } else {
        outlookSignature.parentNode.appendChild(signature);
      }
    } else {
      // No Outlook signature found, append to compose box
      composeBox.appendChild(signature);
    }
    
    // Only load a new GIF if we're not using an existing one
    if (!useExisting || !currentGifDataUrl) {
      // Load actual GIF through background script
      chrome.runtime.sendMessage({action: "getRandomGif"}, (response) => {
        if (response?.gifUrl) {
          chrome.runtime.sendMessage({
            action: "getGifProxy",
            url: response.gifUrl
          }, (proxyResponse) => {
            if (proxyResponse?.dataUrl) {
              // Store the current GIF data URL for future restorations
              currentGifDataUrl = proxyResponse.dataUrl;
              
              // Find and update the signature image
              const img = signature.querySelector('.gif-signature-image');
              if (img) {
                img.src = currentGifDataUrl;
              }
            }
          });
        }
      });
    }
    
    // Add event listeners to block any potential interactions
    const overlay = signature.querySelector('.gif-overlay');
    if (overlay) {
      overlay.addEventListener('click', blockEvent);
      overlay.addEventListener('mousedown', blockEvent);
      overlay.addEventListener('contextmenu', blockEvent);
    }
    
    signature.addEventListener('click', blockEvent);
    signature.addEventListener('mousedown', blockEvent);
    signature.addEventListener('contextmenu', blockEvent);
    
    // Add additional protection against formatting changes
    addFormatProtection(composeBox, signature);
  }
  
  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  function addFormatProtection(composeBox, signature) {
    // Look for formatting buttons in the toolbar
    const toolbar = document.querySelector('[role="toolbar"]');
    if (toolbar) {
      const buttons = toolbar.querySelectorAll('button');
      buttons.forEach(button => {
        if (!button.dataset.protectionAdded) {
          button.dataset.protectionAdded = "true";
          button.addEventListener('click', () => {
            // Small delay to let format changes apply first
            setTimeout(() => {
              if (!composeBox.querySelector(`.${SIGNATURE_CLASS}`)) {
                restoreSignature(composeBox);
              }
              
              // Also check for signature position
              repositionGifAfterSignature(composeBox);
            }, 50);
          });
        }
      });
    }
    
    // Watch for any formatting shortcuts like Ctrl+B, Ctrl+I, etc.
    composeBox.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Common formatting shortcuts
        const formatKeys = ['b', 'i', 'u', 'k'];
        if (formatKeys.includes(e.key.toLowerCase())) {
          setTimeout(() => {
            if (!composeBox.querySelector(`.${SIGNATURE_CLASS}`)) {
              restoreSignature(composeBox);
            }
            
            // Also check for signature position
            repositionGifAfterSignature(composeBox);
          }, 50);
        }
      }
    });
  }

  // Add toggle button functionality
  function injectToggleButton(composeBox) {
    const buttonId = 'gif-signature-button-' + Date.now();
    const parent = composeBox.parentElement;
    
    if (!parent) return;
    
    // Make sure parent has position relative for absolute positioning
    parent.style.position = 'relative';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'gif-signature-button-container';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.right = '10px';
    buttonContainer.style.zIndex = '1000';
    
    // Create toggle button with purple gradient
    const button = document.createElement('button');
    button.id = buttonId;
    button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.padding = '6px 12px';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '13px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
    button.dataset.gifActive = "true";
    
    // Add button event
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isActive = button.dataset.gifActive === "true";
      const signature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
      
      if (isActive) {
        // Turn off GIF - just hide it
        if (signature) {
          signature.style.display = 'none';
        }
        button.style.background = 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)';
        button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF OFF';
        button.dataset.gifActive = "false";
      } else {
        // Turn on GIF - show it if it exists, or create it if it doesn't
        if (signature && signature.style.display === 'none') {
          signature.style.display = 'block';
        } else {
          // If somehow the signature got removed, recreate it
          restoreSignature(composeBox);
        }
        
        button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
        button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
        button.dataset.gifActive = "true";
      }
    });
    
    buttonContainer.appendChild(button);
    parent.appendChild(buttonContainer);
  }

  // Initialize the script
  initialize();
  
  // Extra check for reordering after page is fully loaded
  setTimeout(() => {
    document.querySelectorAll(COMPOSE_BOX_SELECTOR).forEach(composeBox => {
      repositionGifAfterSignature(composeBox);
      
      // Also add toggle button if not already present
      if (!composeBox.parentElement?.querySelector('.gif-signature-button-container')) {
        injectToggleButton(composeBox);
      }
    });
  }, 1000);
  
  // Set up periodic checks for signature position
  setInterval(() => {
    document.querySelectorAll(COMPOSE_BOX_SELECTOR).forEach(composeBox => {
      repositionGifAfterSignature(composeBox);
    });
  }, 2000);
})();