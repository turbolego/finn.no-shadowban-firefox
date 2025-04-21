// JavaScript for mobile settings page

// Function to load and display blocked users
function loadBlockedUsers() {
  browser.storage.local.get('blockedUserIds').then(result => {
    const userList = document.getElementById('user-list');
    
    // Clear current list
    userList.innerHTML = '';
    
    if (result.blockedUserIds && result.blockedUserIds.length > 0) {
      // Display each blocked user
      result.blockedUserIds.forEach(userId => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const userIdSpan = document.createElement('span');
        userIdSpan.textContent = `User ID: ${userId}`;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-btn';
        removeButton.textContent = 'Remove';
        removeButton.onclick = function() {
          removeBlockedUser(userId);
        };
        
        userItem.appendChild(userIdSpan);
        userItem.appendChild(removeButton);
        userList.appendChild(userItem);
      });
    } else {
      // Show empty message
      userList.innerHTML = '<div class="empty-message">No sellers have been blocked yet</div>';
    }
  }).catch(error => {
    console.error('Error loading blocked users:', error);
    const userList = document.getElementById('user-list');
    userList.innerHTML = '<div class="empty-message">Error loading blocked users</div>';
  });
}

// Function to remove a user from the blocked list
function removeBlockedUser(userId) {
  browser.storage.local.get('blockedUserIds').then(result => {
    if (result.blockedUserIds) {
      // Filter out the user to be removed
      const updatedList = result.blockedUserIds.filter(id => id !== userId);
      
      // Save the updated list
      browser.storage.local.set({blockedUserIds: updatedList}).then(() => {
        console.log(`Removed user ${userId} from blocked list`);
        
        // Refresh the display
        loadBlockedUsers();
        
        // Notify all tabs to update their blocked list
        browser.tabs.query({url: "*://*.finn.no/*"}).then(tabs => {
          tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {action: 'refreshBlockedList'})
              .catch(e => console.error('Error sending refresh message:', e));
          });
        });
      });
    }
  });
}

// Load blocked users when page loads
document.addEventListener('DOMContentLoaded', loadBlockedUsers);
