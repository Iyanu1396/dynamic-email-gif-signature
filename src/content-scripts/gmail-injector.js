(function() {
  console.log("Gmail GIF Signature content script loaded!");
  let observerActive = false;
  let currentGifUrl = null; // Store current GIF URL

  // Message listeners
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "updateCurrentGif" && message.gifUrl) {
      currentGifUrl = message.gifUrl;
      handleGifUpdate(message.gifUrl);
    }
    if (message.type === "applySpecificGif" && message.gifUrl) {
      currentGifUrl = message.gifUrl;
      handleGifUpdate(message.gifUrl);
    }
  });

  // Initialize
  setupObserver();
  checkForComposeBoxes();

  function handleGifUpdate(gifUrl) {
    const composeBox = document.querySelector('[role="textbox"][aria-label="Message Body"]');
    if (composeBox) {
      doUpdateGif(composeBox, gifUrl);
    }
  }

  function setupObserver() {
    if (observerActive) return;
    console.log("Setting up Gmail compose box observer");
    const observer = new MutationObserver(() => checkForComposeBoxes());
    observer.observe(document.body, { childList: true, subtree: true });
    observerActive = true;
  }

  function checkForComposeBoxes() {
    try {
      const composeBoxes = document.querySelectorAll('[role="textbox"][aria-label="Message Body"]');
      composeBoxes.forEach(composeBox => {
        if (!composeBox.dataset.gifProcessed) {
          composeBox.dataset.gifProcessed = "true";
          injectGifSignature(composeBox);
          injectSignatureButton(composeBox);
          
          // Add event listeners to protect signature
          addSignatureProtection(composeBox);
        }
      });
    } catch (error) {
      console.error("Error checking for compose boxes:", error);
    }
  }

  function addSignatureProtection(composeBox) {
    // Use a more lightweight approach - focus on the key events
    
    // Handle clear formatting button clicks
    const toolbar = document.querySelector('[role="toolbar"]');
    if (toolbar) {
      const clearButtons = toolbar.querySelectorAll('button');
      clearButtons.forEach(button => {
        if (!button.dataset.signatureProtected) {
          button.dataset.signatureProtected = "true";
          button.addEventListener('click', () => {
            // Delay to let Gmail's clear action complete
            setTimeout(() => restoreSignatureIfNeeded(composeBox), 50);
          });
        }
      });
    }
    
    // Handle keyboard shortcuts for select all and delete
    composeBox.addEventListener('keydown', (e) => {
      // For Ctrl/Cmd+A (Select All)
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        handleSelectAll(e, composeBox);
      }
      
      // After delete or backspace, check if signature needs restoration
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setTimeout(() => restoreSignatureIfNeeded(composeBox), 50);
      }
    });
    
    // Watch for any changes to the compose box content
    const observer = new MutationObserver(mutations => {
      // Check if we need to restore the signature
      if (mutations.some(m => Array.from(m.removedNodes).some(n => 
          n.classList && n.classList.contains('gif-signature-wrapper')))) {
        restoreSignatureIfNeeded(composeBox);
      }
      
      // Watch specifically for Gmail signature insertion
      if (mutations.some(m => Array.from(m.addedNodes).some(n => 
          (n.classList && n.classList.contains('gmail_signature')) || 
          (n.querySelector && n.querySelector('.gmail_signature'))))) {
        console.log("Gmail signature detected - repositioning GIF");
        setTimeout(() => repositionGifAfterGmailSignature(composeBox), 100);
      }
    });
    
    observer.observe(composeBox, { 
      childList: true,
      subtree: true
    });
  }
  
  function handleSelectAll(e, composeBox) {
    const signature = composeBox.querySelector('.gif-signature-wrapper');
    if (signature) {
      e.preventDefault(); // Prevent default select all
      
      // Create a custom selection that excludes the signature
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Select all content before the signature
      range.setStart(composeBox, 0);
      
      // Find the node just before signature
      let content = [];
      let node = composeBox.firstChild;
      
      while (node) {
        if (node !== signature && !signature.contains(node)) {
          content.push(node);
        }
        node = node.nextSibling;
      }
      
      if (content.length > 0) {
        const lastContentNode = content[content.length - 1];
        if (lastContentNode.nodeType === Node.TEXT_NODE) {
          range.setEnd(lastContentNode, lastContentNode.length);
        } else {
          range.setEndAfter(lastContentNode);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
  
  function restoreSignatureIfNeeded(composeBox) {
    const button = composeBox.parentElement?.querySelector('.gif-signature-button-container button');
    const signature = composeBox.querySelector('.gif-signature-wrapper');
    
    // If GIF should be active but signature is missing
    if (button && button.dataset.gifActive === "true" && (!signature || signature.style.display === 'none')) {
      // Use stored URL if available, otherwise request a new one
      if (currentGifUrl) {
        createGifSignature(composeBox, currentGifUrl);
      } else {
        chrome.runtime.sendMessage({action: "getRandomGif"}, (response) => {
          if (response?.gifUrl) {
            currentGifUrl = response.gifUrl;
            createGifSignature(composeBox, response.gifUrl);
          }
        });
      }
    }
  }

  function injectSignatureButton(composeBox) {
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
    button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ACTIVE';
    button.dataset.gifActive = "true";
    
    // Add button event
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isActive = button.dataset.gifActive === "true";
      const signature = composeBox.querySelector('.gif-signature-wrapper');
      
      if (isActive) {
        // Turn off GIF - just hide it
        if (signature) {
          signature.style.display = 'none';
        }
        button.style.background = 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)';
        button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF DISABLED';
        button.dataset.gifActive = "false";
      } else {
        // Turn on GIF - show it if it exists, or create it if it doesn't
        if (signature) {
          signature.style.display = 'block';
          button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
          button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
          button.dataset.gifActive = "true";
        } else {
          // If somehow the signature got removed, recreate it
          if (currentGifUrl) {
            createGifSignature(composeBox, currentGifUrl);
            button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
            button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
            button.dataset.gifActive = "true";
          } else {
            chrome.runtime.sendMessage({action: "getRandomGif"}, (response) => {
              if (response?.gifUrl) {
                currentGifUrl = response.gifUrl;
                createGifSignature(composeBox, response.gifUrl);
                button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
                button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
                button.dataset.gifActive = "true";
              } else {
                console.error("No GIF received from extension");
              }
            });
          }
        }
      }
    });
    
    buttonContainer.appendChild(button);
    parent.appendChild(buttonContainer);
  }

  function injectGifSignature(composeBox) {
    chrome.runtime.sendMessage({action: "getRandomGif"}, (response) => {
      if (response?.gifUrl) {
        currentGifUrl = response.gifUrl; // Store the current GIF URL
        createGifSignature(composeBox, response.gifUrl);
      } else {
        console.error("No GIF received from extension");
      }
    });
  }

  // Function to find Gmail's signature in the compose box
  function findGmailSignature(composeBox) {
    // Look specifically for Gmail signature elements
    const gmailSig = composeBox.querySelector('.gmail_signature');
    if (gmailSig) {
      console.log("Found Gmail signature with class");
      return gmailSig;
    }
    
    // Look for the signature prefix
    const sigPrefix = composeBox.querySelector('.gmail_signature_prefix');
    if (sigPrefix) {
      console.log("Found Gmail signature prefix");
      return sigPrefix;
    }
    
    // Alternative: look for the -- prefix that often comes before signatures
    const nodes = composeBox.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '--') {
        console.log("Found -- prefix for signature");
        return node;
      }
    }
    
    // No Gmail signature found
    return null;
  }
  
  // Function to reposition GIF after Gmail signature when needed
  function repositionGifAfterGmailSignature(composeBox) {
    const gifSignature = composeBox.querySelector('.gif-signature-wrapper');
    if (!gifSignature || gifSignature.style.display === 'none') return;
    
    const gmailSignature = findGmailSignature(composeBox);
    if (!gmailSignature) return;
    
    console.log("Checking if GIF needs to be moved after Gmail signature");
    
    // Get the entire Gmail signature block
    let sigBlock = gmailSignature;
    
    // If we found just the prefix, we need the entire block
    if (gmailSignature.classList?.contains('gmail_signature_prefix')) {
      const nextSibling = gmailSignature.nextElementSibling;
      if (nextSibling?.classList?.contains('gmail_signature')) {
        sigBlock = nextSibling;
      }
    }
    
    // Check position and move if needed
    if (isNodeBefore(gifSignature, sigBlock) || gifSignature.compareDocumentPosition(sigBlock) === 0) {
      console.log("Moving GIF to appear after Gmail signature");
      // Insert after the signature block
      if (sigBlock.nextSibling) {
        sigBlock.parentNode.insertBefore(gifSignature, sigBlock.nextSibling);
      } else {
        sigBlock.parentNode.appendChild(gifSignature);
      }
    }
  }
  
  // Helper function to check if nodeA appears before nodeB in the DOM
  function isNodeBefore(nodeA, nodeB) {
    if (!nodeA || !nodeB) return false;
    let position = nodeA.compareDocumentPosition(nodeB);
    return !!(position & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function createGifSignature(composeBox, gifUrl) {
    // Remove any existing signature
    const existingSignature = composeBox.querySelector('.gif-signature-wrapper');
    if (existingSignature) {
      existingSignature.remove();
    }
    
    // Create a wrapper for the signature
    const signatureWrapper = document.createElement('div');
    signatureWrapper.className = 'gif-signature-wrapper';
    signatureWrapper.style.marginTop = '30px';
    signatureWrapper.setAttribute('contenteditable', 'false');
    signatureWrapper.style.userSelect = 'none';
    
    // Create the signature HTML structure
    const signatureHTML = `
      <div style="border-top: 1px solid #dddddd; margin: 20px 0 15px 0; width: 100%;"></div>
      <div style="margin: 15px 0; font-family: Arial, sans-serif;">
        <!-- We'll add the GIF separately to attach proper event handlers -->
        <div class="gif-container" style="max-width: 250px; max-height: 150px; position: relative;">
          <a href="https://dynamic-gif-signature.netlify.app/dashboard/manage" target="_blank" class="gif-link" style="display: block; pointer-events: none;">
            <img src="${gifUrl}" class="protected-gif" style="max-width: 100%; max-height: 150px; display: block; border: 0; pointer-events: none;">
          </a>
          <div class="gif-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; pointer-events: auto;"></div>
        </div>
        <div style="font-size: 12px; color: #444444; margin-top: 8px; line-height: 1.4;">
          Sent with Dynamic GIF Signature
        </div>
      </div>
    `;
    
    signatureWrapper.innerHTML = signatureHTML;
    
    // Get references to the elements we need to protect
    const gifContainer = signatureWrapper.querySelector('.gif-container');
    const gifLink = signatureWrapper.querySelector('.gif-link');
    const gifImage = signatureWrapper.querySelector('.protected-gif');
    const overlay = signatureWrapper.querySelector('.gif-overlay');
    
    // Add protection event handlers
    overlay.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    
    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // This is the key part - we'll modify the HTML right before sending
    const originalHTML = signatureWrapper.innerHTML;
    composeBox.addEventListener('keydown', (e) => {
      // Detect Ctrl+Enter or Cmd+Enter (send shortcut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Remove our protection layers before sending
        signatureWrapper.innerHTML = originalHTML
          .replace('pointer-events: none;', '')
          .replace(/<div class="gif-overlay".*?<\/div>/, '');
      }
    });
  
    try {
      // Insert the signature into the compose box
      const gmailSignature = findGmailSignature(composeBox);
      
      if (gmailSignature) {
        let sigBlock = gmailSignature;
        if (gmailSignature.classList?.contains('gmail_signature_prefix')) {
          const nextSibling = gmailSignature.nextElementSibling;
          if (nextSibling?.classList?.contains('gmail_signature')) {
            sigBlock = nextSibling;
          }
        }
        
        if (sigBlock.nextSibling) {
          sigBlock.parentNode.insertBefore(signatureWrapper, sigBlock.nextSibling);
        } else {
          sigBlock.parentNode.appendChild(signatureWrapper);
        }
      } else {
        composeBox.appendChild(signatureWrapper);
      }
      
      // Update button state
      const buttonContainer = composeBox.parentElement?.querySelector('.gif-signature-button-container');
      if (buttonContainer) {
        const button = buttonContainer.querySelector('button');
        if (button) {
          button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
          button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
          button.dataset.gifActive = "true";
        }
      }
      
      // Focus at the beginning of the compose box
      setTimeout(() => {
        composeBox.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(composeBox, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }, 100);
      
    } catch (error) {
      console.error("Error inserting GIF signature:", error);
    }
  }

  function doUpdateGif(composeBox, gifUrl) {
    console.log("Updating GIF in compose box with:", gifUrl);
    currentGifUrl = gifUrl; // Store the current GIF URL
    createGifSignature(composeBox, gifUrl);
  }

  // Initial checks
  setInterval(checkForComposeBoxes, 2000);
  setTimeout(checkForComposeBoxes, 500);
  
  // Add a specific check for Gmail signature and reposition GIF if needed
  setInterval(() => {
    document.querySelectorAll('[role="textbox"][aria-label="Message Body"]').forEach(composeBox => {
      restoreSignatureIfNeeded(composeBox);
      // Also check if we need to reposition GIF after Gmail signature
      repositionGifAfterGmailSignature(composeBox);
    });
  }, 1500); // More frequent checks for better responsiveness
})();