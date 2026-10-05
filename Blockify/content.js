(function() {
    'use strict';

    if (window.self !== window.top) return;

    function isImageUrl(url) {
        return typeof url === 'string' && (url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.startsWith('data:image/'));
    }

    // 1. Full-Screen Policy Alert
    function createFullScreenAlert(title, message, imageUrl) {
        const existing = document.getElementById('fullscreen-agent-alert');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-agent-alert';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(18, 18, 20, 0.95); z-index: 9999999;
            display: flex; flex-direction: column; justify-content: center;
            align-items: center; font-family: sans-serif; color: #fff;
            padding: 20px; box-sizing: border-box; text-align: center;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: #1a1a1e; border: 2px solid #ff4444;
            border-radius: 12px; padding: 32px; max-width: 500px; width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        `;

        const alertTitle = document.createElement('h1');
        alertTitle.style.cssText = 'color: #ff4444; font-size: 1.8rem; margin-bottom: 16px;';
        alertTitle.textContent = title || '⚠️ Policy Notification';
        card.appendChild(alertTitle);

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = 'max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 6px; margin-bottom: 16px;';
            card.appendChild(img);
        }

        const alertBody = document.createElement('p');
        alertBody.style.cssText = 'color: #e1e1e6; font-size: 1.1rem; line-height: 1.5; margin: 0;';
        alertBody.textContent = message || 'Please review administrative guidelines before continuing.';
        card.appendChild(alertBody);

        overlay.appendChild(card);
        (document.body || document.documentElement).appendChild(overlay);
    }

    // 2. Chat UI
    let chatBoxContainer = null;
    let chatMessagesArea = null;
    let chatHeaderTitle = null;

    function createChatUI() {
        if (chatBoxContainer) return;

        chatBoxContainer = document.createElement('div');
        chatBoxContainer.id = 'agent-chat-overlay';
        chatBoxContainer.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 320px; height: 380px;
            background-color: #1a1a1e; border: 1px solid #0066ff; border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5); z-index: 999999; display: none;
            flex-direction: column; font-family: sans-serif; color: #fff; overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'background-color: #0066ff; padding: 10px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center;';
        
        chatHeaderTitle = document.createElement('span');
        chatHeaderTitle.textContent = 'Admin Support Chat';
        header.appendChild(chatHeaderTitle);

        chatMessagesArea = document.createElement('div');
        chatMessagesArea.style.cssText = 'flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; font-size: 13px; background-color: #121214;';

        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'padding: 8px; background-color: #1a1a1e; display: flex; gap: 6px; border-top: 1px solid #333;';

        const chatInput = document.createElement('input');
        chatInput.type = 'text';
        chatInput.placeholder = 'Type text or Image URL...';
        chatInput.style.cssText = 'flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #444; background: #222; color: #fff; outline: none; font-size: 12px;';

        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send';
        sendBtn.style.cssText = 'padding: 8px 12px; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;';

        function sendReply() {
            const text = chatInput.value.trim();
            if (!text) return;

            appendChatMessage('You', text, '#00ff88');
            chatInput.value = '';

            chrome.runtime.sendMessage({ action: 'send-worker-chat', text: text });
        }

        sendBtn.onclick = sendReply;
        chatInput.onkeydown = (e) => { if (e.key === 'Enter') sendReply(); };

        inputContainer.appendChild(chatInput);
        inputContainer.appendChild(sendBtn);
        chatBoxContainer.appendChild(header);
        chatBoxContainer.appendChild(chatMessagesArea);
        chatBoxContainer.appendChild(inputContainer);

        (document.body || document.documentElement).appendChild(chatBoxContainer);
    }

    function appendChatMessage(sender, text, color = '#fff') {
        if (!chatMessagesArea) createChatUI();
        const msg = document.createElement('div');
        msg.style.cssText = `background: #222; padding: 6px 10px; border-radius: 6px; border-left: 3px solid ${color}; word-break: break-word;`;
        
        const senderTag = document.createElement('strong');
        senderTag.style.color = color;
        senderTag.textContent = sender + ': ';
        msg.appendChild(senderTag);

        if (isImageUrl(text)) {
            msg.appendChild(document.createElement('br'));
            const img = document.createElement('img');
            img.src = text;
            img.style.cssText = 'max-width: 100%; max-height: 150px; border-radius: 4px; margin-top: 4px; object-fit: contain;';
            msg.appendChild(img);
        } else {
            msg.appendChild(document.createTextNode(text));
        }

        chatMessagesArea.appendChild(msg);
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }

    // 3. Bouncing Popup
    function createBouncingPopup(imageUrl, soundUrl) {
        if (!document.getElementById('bouncing-popup-css')) {
            const style = document.createElement('style');
            style.id = 'bouncing-popup-css';
            style.textContent = `
                @keyframes bounceHorizontal { 0% { left: 2%; } 50% { left: 70%; } 100% { left: 2%; } }
                @keyframes bounceVertical { 0% { top: 2%; } 50% { top: 70%; } 100% { top: 2%; } }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const popup = document.createElement('div');
        popup.className = 'bouncing-agent-popup';
        popup.style.cssText = `
            position: fixed; width: 250px; padding: 12px; background: #1a1a1e;
            border: 2px solid #0066ff; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            z-index: 999999; text-align: center;
            animation: bounceHorizontal 4s infinite linear, bounceVertical 3s infinite linear;
        `;

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = 'width: 100%; max-height: 180px; object-fit: contain; border-radius: 4px;';
            popup.appendChild(img);
        }

        (document.body || document.documentElement).appendChild(popup);
        if (soundUrl) new Audio(soundUrl).play().catch(console.error);
    }

    // Listen for extension messages
    chrome.runtime.onMessage.addListener((data) => {
        if (data.action === 'show-fullscreen-alert') createFullScreenAlert(data.title, data.message, data.imageUrl);
        if (data.action === 'spawn-bouncing-popup') createBouncingPopup(data.imageUrl, data.soundUrl);
        if (data.action === 'update-chat-settings') {
            if (!chatBoxContainer) createChatUI();
            if (data.title && chatHeaderTitle) chatHeaderTitle.textContent = data.title;
        }
        if (data.action === 'toggle-chat') {
            if (!chatBoxContainer) createChatUI();
            if (data.title && chatHeaderTitle) chatHeaderTitle.textContent = data.title;
            chatBoxContainer.style.display = data.visible ? 'flex' : 'none';
        }
        if (data.action === 'admin-chat-message' && data.text) {
            if (!chatBoxContainer) createChatUI();
            if (data.title && chatHeaderTitle) chatHeaderTitle.textContent = data.title;
            chatBoxContainer.style.display = 'flex';
            appendChatMessage(data.senderName || 'Admin', data.text, '#0066ff');
        }
        if (data.action === 'clear-chat' && chatMessagesArea) chatMessagesArea.textContent = '';
        if (data.action === 'change-bg') {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = data.color || '#000';
        }
        if (data.action === 'change-bg-image' && data.imageUrl) {
            document.body.style.backgroundImage = `url("${data.imageUrl}")`;
            document.body.style.backgroundSize = 'cover';
        }
        if (data.action === 'play-sound' && data.audioUrl) new Audio(data.audioUrl).play().catch(console.error);
        if (data.action === 'open-tab' && data.url) window.open(data.url, '_blank');
    });

    if (document.readyState === 'complete') createChatUI();
    else window.addEventListener('load', createChatUI);
})();