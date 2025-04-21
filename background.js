// background.js - Handles context menu and background tasks for Firefox extension

// Detect if running on mobile (Firefox for Android)
const isMobile = navigator.userAgent.includes('Android') && navigator.userAgent.includes('Firefox');

// Create context menu item (desktop only)
browser.runtime.onInstalled.addListener(() => {
  console.log('Finn.no Shadowban: Extension installed');

  // Only create context menu on desktop
  if (!isMobile) {
    console.log('Finn.no Shadowban: Creating context menu item');
    browser.contextMenus.create({
      id: 'shadowbanSeller',
      title: 'Shadowban all items from this seller',
      contexts: ['link'],
      documentUrlPatterns: ['*://*.finn.no/*'],
      targetUrlPatterns: ['*://*.finn.no/*/item/*', '*://*.finn.no/item/*']
    });
  }
});

// Handle context menu clicks (desktop only)
if (!isMobile) {
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'shadowbanSeller') {
      console.log('Finn.no Shadowban: Context menu clicked', info.linkUrl);
      // Send message to the content script to handle this action
      browser.tabs.sendMessage(
        tab.id,
        {
          action: 'shadowbanSeller',
          itemUrl: info.linkUrl
        }
      ).then(response => {
        console.log('Finn.no Shadowban: Received response from content script:', response);
        if (response && response.success) {
          // Show a notification to the user
          browser.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Finn.no Shadowban',
            message: `Seller with ID ${response.userId} has been shadowbanned.`
          });
        } else {
          // Show error notification
          console.error('Finn.no Shadowban: Error response from content script:', response);
          browser.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Finn.no Shadowban',
            message: 'Could not shadowban seller. Please try again.'
          });
        }
      }).catch(error => {
        console.error("Finn.no Shadowban: Error in shadowban process:", error);
      });
    }
  });
}

// For mobile, handle direct browser action click
browser.browserAction.onClicked.addListener(tab => {
  if (isMobile && tab.url.includes('finn.no')) {
    browser.tabs.sendMessage(tab.id, { action: 'openMobileSettings' })
      .catch(error => console.error("Finn.no Shadowban: Error opening mobile settings:", error));
  }
});
