importScripts('pusher.min.js');

const PUSHER_KEY = 'ccc021de100d33e2beb3';
const PUSHER_CLUSTER = 'us2';
const SERVER_URL = 'https://remote-server-t2dh.onrender.com';

let workerId = null;

// Ensure Worker ID is loaded or generated
chrome.storage.local.get(['worker_id'], (result) => {
    if (result.worker_id) {
        workerId = result.worker_id;
    } else {
        workerId = 'WORKER-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        chrome.storage.local.set({ worker_id: workerId });
    }
    initializeAgent();
});

function initializeAgent() {
    if (!workerId) return;

    // Connect Pusher in Background
    const pusher = new Pusher(PUSHER_KEY, { 
        cluster: PUSHER_CLUSTER,
        forceTLS: true 
    });
    
    const commandChannel = pusher.subscribe(`channel-${workerId}`);

    // Broadcast commands to all matching active tabs
    commandChannel.bind('execute-command', (data) => {
        chrome.tabs.query({ status: 'complete' }, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, data).catch(() => {
                        // Ignore errors for tabs without content scripts injected
                    });
                }
            });
        });
    });

    // Keep-alive heartbeat loop
    setInterval(sendActivePing, 5000);
    sendActivePing();
}

async function sendActivePing() {
    if (!workerId) return;

    chrome.tabs.query({}, async (tabs) => {
        if (!tabs || tabs.length === 0) return;

        const openTabs = tabs.map(tab => ({
            tabId: 'TAB-' + tab.id,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            isLatest: Boolean(tab.active)
        }));

        const activeTab = tabs.find(t => t.active) || tabs[0];

        try {
            await fetch(`${SERVER_URL}/worker-active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workerId: workerId,
                    pageTitle: activeTab ? activeTab.title : 'No active tab',
                    url: activeTab ? activeTab.url : '',
                    timestamp: new Date().toISOString(),
                    openTabs: openTabs
                })
            });
        } catch (e) {
            console.error('[Agent Background] Ping error:', e);
        }
    });
}

// Handle incoming chat messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'send-worker-chat') {
        fetch(`${SERVER_URL}/worker-chat-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workerId: workerId,
                text: request.text,
                timestamp: new Date().toLocaleTimeString()
            })
        })
        .then(() => sendResponse({ status: 'ok' }))
        .catch(err => sendResponse({ status: 'error', error: err.toString() }));

        return true; // Keep message channel open for async response
    }
});