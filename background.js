// background.js - Handles context menu and background tasks for Firefox extension

// Create context menu item
browser.runtime.onInstalled.addListener(() => {
  console.log('Finn.no Shadowban: Extension installed, creating context menu item');
  browser.contextMenus.create({
    id: 'shadowbanSeller',
    title: 'Shadowban all items from this seller',
    contexts: ['link'],
    documentUrlPatterns: ['*://*.finn.no/*'],
    targetUrlPatterns: ['*://*.finn.no/*/item/*', '*://*.finn.no/item/*']
  });
});

// Handle context menu clicks
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
