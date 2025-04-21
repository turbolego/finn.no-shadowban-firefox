// content.js - Hides listings from specific users on Finn.no (Firefox version)

// Store blocked user IDs in an array (will be loaded from storage)
let BLOCKED_USER_IDS = [];

// Store checked item IDs to avoid repeated checks
const checkedItems = new Set();
// Store blocked item IDs
const blockedItems = new Set();

// Detect if running on mobile (Firefox for Android)
const isMobile = navigator.userAgent.includes('Android') && navigator.userAgent.includes('Firefox');

// Load blocked user IDs from local storage
function loadBlockedUserIds() {
  console.log('Finn.no Shadowban: Loading blocked user IDs from storage');
  browser.storage.local.get('blockedUserIds').then(result => {
    if (result.blockedUserIds) {
      BLOCKED_USER_IDS = result.blockedUserIds;
      console.log('Finn.no Shadowban: Loaded blocked user IDs:', BLOCKED_USER_IDS);
      // Re-run shadowban with the loaded IDs
      shadowbanUser();
    } else {
      // Initialize with empty array if no blocked users exist
      console.log('Finn.no Shadowban: No blocked users found, initializing empty array');
      browser.storage.local.set({ blockedUserIds: [] });
      BLOCKED_USER_IDS = [];
    }
  }).catch(error => {
    console.error('Finn.no Shadowban: Error loading blocked users:', error);
  });
}

// Initialize by loading blocked user IDs
loadBlockedUserIds();

// Main function to handle the shadowban functionality
function shadowbanUser() {
  if (BLOCKED_USER_IDS.length === 0) return;

  if (window.location.href.includes('/search/') ||
      window.location.href.includes('/bap/') ||
      window.location.href.includes('/recommerce/') ||
      document.querySelector('article.sf-search-ad')) {
    console.log('Finn.no Shadowban: Scanning search results for blocked IDs:', BLOCKED_USER_IDS);
    const results = document.querySelectorAll('article.sf-search-ad');
    results.forEach(article => {
      const html = article.innerHTML;
      for (const id of BLOCKED_USER_IDS) {
        if (html.includes(`userId=${id}`)) {
          article.style.display = 'none';
          return;
        }
      }
      const link = article.querySelector('a.sf-search-ad-link');
      if (!link) return;
      const match = link.href.match(/\/item\/(\d+)/);
      if (!match) return;
      const itemId = match[1];
      if (blockedItems.has(itemId)) {
        article.style.display = 'none';
        return;
      }
      if (checkedItems.has(itemId)) return;
      checkedItems.add(itemId);
      checkItemSeller(link.href).then(blockedId => {
        if (blockedId) {
          article.style.display = 'none';
          blockedItems.add(itemId);
          const styleTag = document.createElement('style');
          styleTag.textContent = `[data-blocked-item-id="${itemId}"] { display: none !important; }`;
          document.head.appendChild(styleTag);
          article.setAttribute('data-blocked-item-id', itemId);
        }
      });
    });
  } else if (window.location.href.includes('/item/')) {
    const sellerLinks = document.querySelectorAll('a[href*="?userId="]');
    sellerLinks.forEach(link => {
      for (const id of BLOCKED_USER_IDS) {
        if (link.href.includes(`userId=${id}`)) {
          window.history.back();
          return;
        }
      }
    });

    // For mobile: Add shadowban button to item pages
    if (isMobile) {
      addMobileShadowbanButton();
    }
  }
}

async function checkItemSeller(itemUrl) {
  try {
    const response = await fetch(itemUrl, { credentials: 'same-origin' });
    if (!response.ok) return null;
    const html = await response.text();

    // First check if any of our blocked user IDs appear in the page
    for (const id of BLOCKED_USER_IDS) {
      if (html.includes(`userId=${id}`)) {
        console.log(`Finn.no Shadowban: Found blocked userId=${id} in item page`);
        return id;
      }
    }

    // If no blocked user ID was found by direct match, extract the owner ID
    // and check if it matches any of our blocked user IDs
    const ownerId = await extractOwnerIdFromHtml(html);
    if (ownerId && BLOCKED_USER_IDS.includes(ownerId)) {
      console.log(`Finn.no Shadowban: Found blocked ownerId=${ownerId} in item page`);
      return ownerId;
    }

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error checking item seller:', e);
    return null;
  }
}

// Helper function to extract owner ID from HTML
async function extractOwnerIdFromHtml(html) {
  try {
    // Try to find the hydration data script
    let hydrationDataMatch = html.match(/<script>window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("(.*?)"\)<\/script>/s);

    if (!hydrationDataMatch) {
      hydrationDataMatch = html.match(/window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("([^<]+)"\)/s);
    }

    if (hydrationDataMatch && hydrationDataMatch[1]) {
      const hydrationContent = hydrationDataMatch[1];

      // Try different patterns to extract owner ID
      const ownerIdMatch = hydrationContent.match(/\\*"ownerId\\*":(\d+)/);
      if (ownerIdMatch && ownerIdMatch[1]) {
        return ownerIdMatch[1];
      }

      const adOwnerPattern = hydrationContent.match(/\\*"adId\\*":\\*"(\d+)\\*",\\*"ownerId\\*":(\d+)/);
      if (adOwnerPattern && adOwnerPattern[2]) {
        return adOwnerPattern[2];
      }

      const generalOwnerIdMatch = hydrationContent.match(/ownerId.{0,10}?(\d{7,})/);
      if (generalOwnerIdMatch && generalOwnerIdMatch[1]) {
        return generalOwnerIdMatch[1];
      }
    }

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error extracting owner ID from HTML:', e);
    return null;
  }
}

function addUserToBlockedList(userId) {
  console.log(`Finn.no Shadowban: Attempting to add user ${userId} to blocked list`);
  if (!userId) {
    console.error('Finn.no Shadowban: Cannot add null/undefined userId to blocked list');
    return;
  }

  if (BLOCKED_USER_IDS.includes(userId)) {
    console.log(`Finn.no Shadowban: User ${userId} is already in blocked list`);
    return;
  }

  BLOCKED_USER_IDS.push(userId);
  console.log(`Finn.no Shadowban: Added user ${userId} to BLOCKED_USER_IDS`);

  browser.storage.local.set({ blockedUserIds: BLOCKED_USER_IDS }).then(() => {
    console.log(`Finn.no Shadowban: Successfully saved user ${userId} to storage`);
    shadowbanUser();

    // Show mobile notification
    if (isMobile) {
      showMobileNotification(`Seller (ID: ${userId}) has been shadowbanned`);
    }
  }).catch(error => {
    console.error(`Finn.no Shadowban: Error saving user ${userId} to storage:`, error);
  });
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Finn.no Shadowban: Message received in content script:', request);

  if (request.action === 'shadowbanSeller' && request.itemUrl) {
    console.log('Finn.no Shadowban: Processing shadowbanSeller action for URL:', request.itemUrl);

    // Fixed promise handling - create a proper promise chain that calls sendResponse
    extractUserIdFromItemPage(request.itemUrl).then(id => {
      console.log('Finn.no Shadowban: Extracted user ID:', id);

      if (id) {
        addUserToBlockedList(id);
        sendResponse({ success: true, userId: id });
      } else {
        console.error('Finn.no Shadowban: Could not extract user ID from', request.itemUrl);
        sendResponse({ success: false, error: 'Could not extract user ID' });
      }
    }).catch(error => {
      console.error('Finn.no Shadowban: Error processing shadowban request:', error);
      sendResponse({ success: false, error: error.toString() });
    });

    return true; // async response
  }

  if (request.action === 'refreshBlockedList') {
    console.log('Finn.no Shadowban: Refreshing blocked list');
    loadBlockedUserIds();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'openMobileSettings') {
    openMobileSettings();
    sendResponse({ success: true });
    return true;
  }
});

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    shadowbanUser();

    // Re-add mobile buttons when URL changes
    if (isMobile && url.includes('/item/')) {
      setTimeout(addMobileShadowbanButton, 1000);
    }
  } else if (document.querySelector('article.sf-search-ad')) {
    shadowbanUser();
  }
}).observe(document, { childList: true, subtree: true });

async function extractUserIdFromItemPage(itemUrl) {
  console.log('Finn.no Shadowban: Extracting user ID from item page:', itemUrl);
  try {
    const resp = await fetch(itemUrl, { credentials: 'same-origin' });
    if (!resp.ok) {
      console.error('Finn.no Shadowban: HTTP error while fetching item page:', resp.status);
      return null;
    }
    const txt = await resp.text();
    console.log('Finn.no Shadowban: Retrieved item page HTML, length:', txt.length);

    // Try multiple patterns to find the user ID
    // Pattern 1: Profile link with userId parameter
    const profileMatch = txt.match(/href="\/profile\/ads\?userId=(\d+)"/);
    if (profileMatch) {
      console.log('Finn.no Shadowban: Found user ID in profile link:', profileMatch[1]);
      return profileMatch[1];
    }

    // Pattern 2: Any link with userId parameter
    const userIdMatch = txt.match(/href="[^"]*\?userId=(\d+)"/);
    if (userIdMatch) {
      console.log('Finn.no Shadowban: Found user ID in link:', userIdMatch[1]);
      return userIdMatch[1];
    }

    // Pattern 3: userId as data attribute
    const dataMatch = txt.match(/data-user-id="(\d+)"/);
    if (dataMatch) {
      console.log('Finn.no Shadowban: Found user ID in data attribute:', dataMatch[1]);
      return dataMatch[1];
    }

    // Pattern 4: userId anywhere in the HTML
    const generalMatch = txt.match(/userId=(\d+)/);
    if (generalMatch) {
      console.log('Finn.no Shadowban: Found user ID with general pattern:', generalMatch[1]);
      return generalMatch[1];
    }

    // Pattern 5: Looking for seller info section
    const sellerSectionMatch = txt.match(/<h2[^>]*>Sold by<\/h2>[\s\S]*?href="[^"]*?userId=(\d+)"/i) ||
                               txt.match(/<div[^>]*seller[^>]*>[\s\S]*?userId=(\d+)/i);
    if (sellerSectionMatch) {
      console.log('Finn.no Shadowban: Found user ID in seller section:', sellerSectionMatch[1]);
      return sellerSectionMatch[1];
    }

    // Pattern 6: Looking for ownerId in the window.__staticRouterHydrationData
    // First try: using a non-greedy match for the entire script content
    let hydrationDataMatch = txt.match(/<script>window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("(.*?)"\)<\/script>/s);

    // If first attempt fails, try with a more lenient pattern
    if (!hydrationDataMatch) {
      hydrationDataMatch = txt.match(/window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("([^<]+)"\)/s);
    }

    // If we found hydration data, try to extract the ownerId
    if (hydrationDataMatch && hydrationDataMatch[1]) {
      try {
        console.log('Finn.no Shadowban: Found hydration data, looking for ownerId');

        // The JSON is double-escaped because it's inside a JS string
        const hydrationContent = hydrationDataMatch[1];

        // Try direct regex extraction without full JSON parsing
        const ownerIdMatch = hydrationContent.match(/\\*"ownerId\\*":(\d+)/);
        if (ownerIdMatch && ownerIdMatch[1]) {
          console.log('Finn.no Shadowban: Found owner ID in hydration data:', ownerIdMatch[1]);
          return ownerIdMatch[1];
        }

        // Look for adId and ownerId pattern
        const adOwnerPattern = hydrationContent.match(/\\*"adId\\*":\\*"(\d+)\\*",\\*"ownerId\\*":(\d+)/);
        if (adOwnerPattern && adOwnerPattern[2]) {
          console.log('Finn.no Shadowban: Found owner ID in ad/owner pattern:', adOwnerPattern[2]);
          return adOwnerPattern[2];
        }

        // Fallback: try more general pattern for any ownerId
        const generalOwnerIdMatch = hydrationContent.match(/ownerId.{0,10}?(\d{7,})/);
        if (generalOwnerIdMatch && generalOwnerIdMatch[1]) {
          console.log('Finn.no Shadowban: Found owner ID with general pattern:', generalOwnerIdMatch[1]);
          return generalOwnerIdMatch[1];
        }

        // If still not found, log a snippet for debugging
        console.log('Finn.no Shadowban: Hydration data excerpt for debugging:',
                   hydrationContent.substring(0, Math.min(500, hydrationContent.length)));
      } catch (e) {
        console.error('Finn.no Shadowban: Error parsing hydration data:', e);
      }
    }

    // Debug output for inspection
    console.warn('Finn.no Shadowban: Could not find user ID in item page HTML using standard patterns');
    console.log('Finn.no Shadowban: HTML excerpt for debugging:');
    // Log key sections that might contain the user ID
    const sellerSectionHtml = txt.match(/<h2[^>]*>Sold by<\/h2>[\s\S]*?<\/section>/i) ||
                              txt.match(/<div[^>]*seller[^>]*>[\s\S]*?<\/div>/i);

    if (sellerSectionHtml) {
      console.log('Seller section HTML:', sellerSectionHtml[0].substring(0, 500) + '...');
    }

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error extracting user ID:', e);
    return null;
  }
}

// Mobile-specific functions
function addMobileShadowbanButton() {
  // Only proceed if we're on a seller's page and not already added the button
  if (!isMobile || document.getElementById('shadowban-mobile-button')) {
    return;
  }

  // Find the seller section or any appropriate container
  let sellerSection = document.querySelector('.panel.u-mb16.u-p16') ||
                      document.querySelector('.panel.u-mb-16') ||
                      document.querySelector('.grid__unit.grid__unit--col-2') ||
                      document.querySelector('.object-page__info-section');

  if (!sellerSection) {
    console.log('Finn.no Shadowban: Could not find appropriate container for shadowban button');
    return;
  }

  // Create the button
  const shadowbanButton = document.createElement('button');
  shadowbanButton.id = 'shadowban-mobile-button';
  shadowbanButton.innerText = 'Shadowban Seller';
  shadowbanButton.className = 'shadowban-mobile-button';

  // Add click event
  shadowbanButton.addEventListener('click', async () => {
    try {
      const userId = await extractUserIdFromItemPage(window.location.href);
      if (userId) {
        addUserToBlockedList(userId);
        showMobileNotification(`Seller (ID: ${userId}) has been shadowbanned`);
      } else {
        showMobileNotification('Could not find seller ID. Please try again.');
      }
    } catch (e) {
      console.error('Error shadowbanning seller:', e);
      showMobileNotification('Error shadowbanning seller');
    }
  });

  // Add the button to the page
  sellerSection.appendChild(shadowbanButton);
}

function addMobileSettingsButton() {
  if (!isMobile || document.getElementById('shadowban-settings-button')) {
    return;
  }

  // Create a floating button in the bottom right corner
  const settingsButton = document.createElement('button');
  settingsButton.id = 'shadowban-settings-button';
  settingsButton.innerHTML = '<img src="' + browser.runtime.getURL('images/icon48.png') + '" alt="Settings" width="24" height="24">';
  settingsButton.className = 'shadowban-settings-button';

  settingsButton.addEventListener('click', () => {
    openMobileSettings();
  });

  document.body.appendChild(settingsButton);
}

function openMobileSettings() {
  // Create or focus the existing iframe
  let settingsFrame = document.getElementById('shadowban-settings-frame');

  if (settingsFrame) {
    // If frame exists, just show it
    settingsFrame.style.display = 'block';
    return;
  }

  // Create frame
  settingsFrame = document.createElement('iframe');
  settingsFrame.id = 'shadowban-settings-frame';
  settingsFrame.src = browser.runtime.getURL('mobile-settings.html');
  settingsFrame.className = 'shadowban-settings-frame';

  // Add close button to the frame
  const closeButton = document.createElement('button');
  closeButton.className = 'shadowban-settings-close';
  closeButton.innerText = '×';
  closeButton.addEventListener('click', () => {
    settingsFrame.style.display = 'none';
  });

  // Add them to the page
  document.body.appendChild(settingsFrame);
  document.body.appendChild(closeButton);
}

function showMobileNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('shadowban-notification');

  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'shadowban-notification';
    notification.className = 'shadowban-notification';
    document.body.appendChild(notification);
  }

  // Set message and show the notification
  notification.textContent = message;
  notification.classList.add('show');

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Initialize mobile UI if needed
if (isMobile) {
  window.addEventListener('DOMContentLoaded', () => {
    // Add settings button to all finn.no pages
    addMobileSettingsButton();

    // Add shadowban button to item pages
    if (window.location.href.includes('/item/')) {
      addMobileShadowbanButton();
    }
  });
}
