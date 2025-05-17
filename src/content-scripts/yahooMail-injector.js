(function() {
  console.log("Yahoo Mail GIF Signature - Enhanced Edition");

  const COMPOSE_BOX_SELECTOR = 'div[data-test-id="rte"][role="textbox"][aria-label="Message body"]';
  const SIGNATURE_CLASS = 'yahoo-gif-signature-enhanced';
  let currentGifUrl = null;

  function initialize() {
    setupObserver();
    checkForComposeBoxes();
  }

  function setupObserver() {
    const observer = new MutationObserver(() => checkForComposeBoxes());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function checkForComposeBoxes() {
    document.querySelectorAll(COMPOSE_BOX_SELECTOR).forEach(composeBox => {
      if (!composeBox.dataset.gifProcessed) {
        composeBox.dataset.gifProcessed = "true";
        injectGifSignature(composeBox);
        injectSignatureButton(composeBox);
        addSignatureProtection(composeBox);
      }
    });
  }

  function addSignatureProtection(composeBox) {
    // Handle keyboard events
    composeBox.addEventListener('keydown', (e) => {
      // Handle Ctrl+A (Select All)
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        handleSelectAll(e, composeBox);
      }
      
      // Handle delete/backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setTimeout(() => restoreSignatureIfNeeded(composeBox), 50);
      }
    });

    // Mutation observer to detect signature removal
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node.classList && node.classList.contains(SIGNATURE_CLASS)) {
            restoreSignatureIfNeeded(composeBox);
          }
        });
      });
    });

    observer.observe(composeBox, { childList: true, subtree: true });
  }

  function handleSelectAll(e, composeBox) {
    const signature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
    if (signature) {
      e.preventDefault();
      
      // Create a range that excludes the signature
      const selection = window.getSelection();
      const range = document.createRange();
      
      // Select from start to before signature
      range.setStart(composeBox, 0);
      
      let endNode = composeBox;
      let endOffset = 0;
      let found = false;
      
      // Walk through child nodes to find position before signature
      for (let i = 0; i < composeBox.childNodes.length; i++) {
        const node = composeBox.childNodes[i];
        if (node === signature) {
          found = true;
          break;
        }
        endNode = node;
        endOffset = node.length || node.childNodes.length;
      }
      
      if (found) {
        range.setEnd(endNode, endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  function restoreSignatureIfNeeded(composeBox) {
    const button = composeBox.parentElement?.querySelector('.gif-signature-button-container button');
    const signature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
    
    if (button && button.dataset.gifActive === "true" && !signature) {
      if (currentGifUrl) {
        createGifSignature(composeBox, currentGifUrl);
      } else {
        injectGifSignature(composeBox);
      }
    }
  }

  function injectSignatureButton(composeBox) {
    const parent = composeBox.parentElement;
    if (!parent) return;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'gif-signature-button-container';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.right = '10px';
    buttonContainer.style.zIndex = '1000';

    // Create toggle button
    const button = document.createElement('button');
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

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isActive = button.dataset.gifActive === "true";
      const signature = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
      
      if (isActive) {
        // Turn off GIF
        if (signature) signature.remove();
        button.style.background = 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)';
        button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF OFF';
        button.dataset.gifActive = "false";
      } else {
        // Turn on GIF
        if (currentGifUrl) {
          createGifSignature(composeBox, currentGifUrl);
        } else {
          injectGifSignature(composeBox);
        }
        button.style.background = 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)';
        button.innerHTML = '<span style="margin-right: 5px;">🎬</span> GIF ON';
        button.dataset.gifActive = "true";
      }
    });

    buttonContainer.appendChild(button);
    parent.appendChild(buttonContainer);
  }

  function injectGifSignature(composeBox) {
    chrome.runtime.sendMessage({action: "getRandomGif"}, (response) => {
      if (response?.gifUrl) {
        currentGifUrl = response.gifUrl;
        createGifSignature(composeBox, response.gifUrl);
      }
    });
  }

  function createGifSignature(composeBox, gifUrl) {
    // Remove existing signature if any
    const existingSig = composeBox.querySelector(`.${SIGNATURE_CLASS}`);
    if (existingSig) existingSig.remove();

    // Create signature container
    const signature = document.createElement('div');
    signature.className = SIGNATURE_CLASS;
    signature.style.marginTop = '20px';
    signature.style.paddingTop = '10px';
    signature.style.borderTop = '1px solid #dddddd';
    signature.style.userSelect = 'none';
    signature.setAttribute('contenteditable', 'false');

    // Create protected GIF structure
    signature.innerHTML = `
      <div style="max-width: 250px; margin: 15px 0; position: relative;">
        <div class="gif-protection-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></div>
        <a href="https://dynamic-gif-signature.netlify.app/dashboard/manage" target="_blank" class="gif-link" style="display: block; pointer-events: none;">
          <img src="${gifUrl}" class="protected-gif" style="max-width: 100%; max-height: 150px; display: block; border: 0; pointer-events: none;">
        </a>
      </div>
      <div style="font-size: 11px; color: #666666; margin-top: 5px;">
        Sent with GIF Signature
      </div>
    `;

    // Add protection event handlers
    const overlay = signature.querySelector('.gif-protection-overlay');
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

    // Modify the signature before sending to make the link clickable
    composeBox.addEventListener('keydown', (e) => {
      // Detect Ctrl+Enter or Cmd+Enter (send shortcut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        // Remove protection layers before sending
        signature.querySelector('.gif-link').style.pointerEvents = 'auto';
        signature.querySelector('.protected-gif').style.pointerEvents = 'auto';
        signature.querySelector('.gif-protection-overlay').remove();
      }
    });

    composeBox.appendChild(signature);
  }

  // Initialize
  initialize();
})();