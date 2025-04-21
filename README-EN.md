Google Chrome -version: https://github.com/turbolego/finn.no-shadowban

# Finn.no Shadowban Firefox Extension

This Firefox extension allows you to hide listings from specific sellers on finn.no by adding them to your personal blocklist.

## Features

- Automatically scans search result pages on finn.no
- Checks each listing to see if it belongs to any blocked seller
- Hides listings from all blocked sellers
- Right-click menu option to easily block new sellers
- Popup interface to manage your blocked sellers list
- Works with infinite scrolling and different listing types

## Installation

To install this extension in Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" and select the `manifest.json` file from the folder containing this extension
3. The extension should now be installed and active for the current Firefox session

> **Note**: The extension must be reloaded each time Firefox is restarted unless it is packaged and signed for permanent installation.

## How It Works

The extension works by:
1. Scanning search result pages on finn.no
2. For each listing, checking if it's from a blocked seller
3. Hiding any listings that belong to blocked sellers
4. Maintaining a list of blocked user IDs in the browser's local storage
5. Continuously monitoring for new content as you scroll

## Adding Sellers to the Blocklist

There are two ways to block a seller:

1. **Right-click method**:
    - Right-click on any item in search results
    - Select "Shadowban all items from this seller" from the context menu
    - The extension will extract the seller's user ID and add it to your blocklist

2. **Manual addition**:
    - Find the seller's user ID (from their profile URL)
    - Add it to the blocklist through the extension's popup interface

## Managing Blocked Sellers

To manage your list of blocked sellers:

1. Click on the extension icon in your browser toolbar
2. View all currently blocked seller IDs
3. Remove any seller from the blocklist by clicking the "Remove" button next to their ID

## Permissions

This extension requires the following permissions to function:

- **activeTab**: To read the content of the active tab and perform actions like hiding listings.
- **scripting**: To inject scripts that handle filtering logic directly on the website.
- **contextMenus**: To add a right-click menu option that allows you to block sellers directly from search results.
- **storage**: To store the list of blocked user IDs locally in the browser.
- **notifications**: To display notifications when a seller is blocked or if an error occurs.
- **host permissions**: This permission is required to allow the extension to interact with all pages on finn.no, including search results and individual item pages, to identify and hide listings from blocked sellers.

## Files

- `manifest.json` - Configuration file for the extension
- `popup.html` - User interface for managing blocked sellers
- `popup.js` - Script that handles the popup interface functionality
- `content.js` - Main script that handles the filtering logic
- `background.js` - Background script that manages context menus and messaging
- `images/` - Directory containing the extension icons

## Note

This extension is for personal use only and designed to enhance your browsing experience on finn.no by allowing you to filter out listings from specific sellers.
