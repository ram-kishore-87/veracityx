// background.js - Service worker for extension (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
    console.log('VeracityX Extension Installed');
    
    // Set default API URL
    chrome.storage.local.get('apiUrl', (data) => {
        if (!data.apiUrl) {
            chrome.storage.local.set({ 'apiUrl': 'http://127.0.0.1:8000' });
        }
    });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeText') {
        console.log('Analyzing:', request.text);
        // Forward to popup for processing
        sendResponse({ status: 'received' });
    }
});
