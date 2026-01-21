// Global Variables
let currentUser = null;
let currentChatId = null;
let chatHistory = {};
let messageCount = 0;

// Initialize
window.onload = function() {
    loadUser();
    updateUI();
    loadChatHistory();
};

// User Authentication
function loadUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function saveUser() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

function showSignupModal() {
    closeLoginModal();
    document.getElementById('signupModal').classList.add('active');
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('active');
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    const userKey = 'user_' + email;
    const userData = localStorage.getItem(userKey);

    if (!userData) {
        alert('Account not found. Please sign up first.');
        return;
    }

    const user = JSON.parse(userData);
    
    if (user.password !== password) {
        alert('Incorrect password');
        return;
    }

    currentUser = user;
    saveUser();
    closeLoginModal();
    updateUI();
    alert('Welcome back, ' + email + '!');
}

function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (!email || !email.includes('@')) {
        alert('Please enter a valid email');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    const userKey = 'user_' + email;
    
    if (localStorage.getItem(userKey)) {
        alert('Account already exists. Please login.');
        return;
    }

    const newUser = {
        email: email,
        password: password,
        coins: 500, // Starting coins
        isPro: false,
        proExpiry: null,
        createdAt: Date.now()
    };

    localStorage.setItem(userKey, JSON.stringify(newUser));
    currentUser = newUser;
    saveUser();
    closeSignupModal();
    updateUI();
    alert('Account created! You received 500 free coins 🎉');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUI();
        clearChat();
    }
}

function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('username');
    const coinAmount = document.getElementById('coinAmount');

    if (currentUser) {
        loginBtn.style.display = 'none';
        username.textContent = currentUser.email;
        coinAmount.textContent = currentUser.coins;
        
        // Check if Pro expired
        if (currentUser.isPro && currentUser.proExpiry) {
            if (Date.now() > currentUser.proExpiry) {
                currentUser.isPro = false;
                currentUser.proExpiry = null;
                saveUser();
                alert('Your Pro subscription has expired');
            }
        }
    } else {
        loginBtn.style.display = 'block';
        username.textContent = 'Guest';
        coinAmount.textContent = '0';
    }
}

// Chat Functions
function newChat() {
    currentChatId = 'chat_' + Date.now();
    chatHistory[currentChatId] = {
        title: 'New Chat',
        messages: [],
        createdAt: Date.now()
    };
    saveChatHistory();
    clearChat();
    updateChatHistoryUI();
}

function clearChat() {
    const messages = document.getElementById('messages');
    messages.innerHTML = `
        <div class="welcome-message">
            <h1>AI Chat Pro</h1>
            <p>How can I help you today?</p>
        </div>
    `;
    document.getElementById('userInput').value = '';
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        chatHistory = JSON.parse(saved);
        updateChatHistoryUI();
    }
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function updateChatHistoryUI() {
    const historyDiv = document.getElementById('chatHistory');
    historyDiv.innerHTML = '';

    const chats = Object.entries(chatHistory).sort((a, b) => b[1].createdAt - a[1].createdAt);

    chats.forEach(([chatId, chat]) => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chatId === currentChatId) {
            chatItem.classList.add('active');
        }
        chatItem.innerHTML = `
            <span>${chat.title}</span>
            <button class="delete-chat" onclick="deleteChat('${chatId}', event)">🗑️</button>
        `;
        chatItem.onclick = (e) => {
            if (!e.target.classList.contains('delete-chat')) {
                loadChat(chatId);
            }
        };
        historyDiv.appendChild(chatItem);
    });
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chatHistory[chatId];
    
    const messages = document.getElementById('messages');
    messages.innerHTML = '';

    chat.messages.forEach(msg => {
        addMessageToUI(msg.role, msg.content, msg.isImage);
    });

    updateChatHistoryUI();
}

function deleteChat(chatId, event) {
    event.stopPropagation();
    if (confirm('Delete this chat?')) {
        delete chatHistory[chatId];
        if (currentChatId === chatId) {
            currentChatId = null;
            clearChat();
        }
        saveChatHistory();
        updateChatHistoryUI();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    if (!currentUser) {
        alert('Please login to send messages');
        showLoginModal();
        return;
    }

    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message) return;

    // Check if user has coins
    if (currentUser.coins < 1 && !currentUser.isPro) {
        alert('You need coins to send messages. Please buy coins or upgrade to Pro.');
        showUpgradeModal();
        return;
    }

    // Create new chat if none exists
    if (!currentChatId) {
        newChat();
        chatHistory[currentChatId].title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    // Deduct coins if not Pro
    if (!currentUser.isPro) {
        currentUser.coins -= 1;
        saveUser();
        updateUI();
    }

    // Add user message
    addMessageToUI('user', message);
    chatHistory[currentChatId].messages.push({ role: 'user', content: message });
    saveChatHistory();
    updateChatHistoryUI();

    input.value = '';

    // Add AI response
    const aiResponse = await getAIResponse(message);
    addMessageToUI('assistant', aiResponse);
    chatHistory[currentChatId].messages.push({ role: 'assistant', content: aiResponse });
    saveChatHistory();
}

async function getAIResponse(message) {
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        return "Sorry, I'm having trouble connecting. Please try again.";
    }
}

function addMessageToUI(role, content, isImage = false) {
    const messages = document.getElementById('messages');
    
    // Remove welcome message if exists
    const welcome = messages.querySelector('.welcome-message');
    if (welcome) {
        welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + role;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (isImage) {
        const img = document.createElement('img');
        img.src = content;
        img.className = 'generated-image';
        contentDiv.appendChild(img);
    } else {
        contentDiv.textContent = content;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// Image Generation
function toggleImageMenu() {
    const menu = document.getElementById('imageMenu');
    menu.classList.toggle('active');
}

async function generateImage(type) {
    if (!currentUser) {
        alert('Please login to generate images');
        showLoginModal();
        return;
    }

    const imageCost = 10; // 10 coins per image

    if (currentUser.coins < imageCost && !currentUser.isPro) {
        alert('You need ' + imageCost + ' coins to generate an image. Please buy coins or upgrade to Pro.');
        showUpgradeModal();
        return;
    }

    let prompt = '';

    if (type === 'custom') {
        prompt = document.getElementById('userInput').value.trim();
        if (!prompt) {
            prompt = window.prompt('Enter image description:');
        }
    } else {
        const prompts = {
            landscape: 'A beautiful landscape with mountains and sunset',
            portrait: 'A professional portrait photo',
            abstract: 'An abstract colorful art piece'
        };
        prompt = prompts[type];
    }

    if (!prompt) return;

    // Create new chat if none exists
    if (!currentChatId) {
        newChat();
        chatHistory[currentChatId].title = 'Image: ' + prompt.substring(0, 20) + '...';
    }

    // Deduct coins if not Pro
    if (!currentUser.isPro) {
        currentUser.coins -= imageCost;
        saveUser();
        updateUI();
    }

    toggleImageMenu();

    // Show loading
    const messages = document.getElementById('messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="image-loading">🎨 Generating image...</div>
        </div>
    `;
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    // Simulate image generation (replace with real API call)
    setTimeout(() => {
        loadingDiv.remove();
        const imageUrl = 'https://picsum.photos/500/500?random=' + Date.now();
        addMessageToUI('assistant', imageUrl, true);
        chatHistory[currentChatId].messages.push({ 
            role: 'assistant', 
            content: imageUrl, 
            isImage: true 
        });
        saveChatHistory();
    }, 2000);
}

// Upgrade Functions
function showUpgradeModal() {
    if (!currentUser) {
        alert('Please login first');
        showLoginModal();
        return;
    }
    document.getElementById('upgradeModal').classList.add('active');
}

function closeUpgradeModal() {
    document.getElementById('upgradeModal').classList.remove('active');
}

function purchasePlan(plan) {
    if (!currentUser) {
        alert('Please login first');
        showLoginModal();
        return;
    }

    const plans = {
        monthly: { cost: 1000, days: 30, name: 'Monthly Pro' },
        yearly: { cost: 10000, days: 365, name: 'Yearly Pro' }
    };

    const selectedPlan = plans[plan];

    if (currentUser.coins < selectedPlan.cost) {
        alert('Not enough coins! You need ' + selectedPlan.cost + ' coins.');
        showBuyCoins();
        return;
    }

    if (confirm('Purchase ' + selectedPlan.name + ' for ' + selectedPlan.cost + ' coins?')) {
        currentUser.coins -= selectedPlan.cost;
        currentUser.isPro = true;
        currentUser.proExpiry = Date.now() + (selectedPlan.days * 24 * 60 * 60 * 1000);
        saveUser();
        updateUI();
        closeUpgradeModal();
        alert('🎉 Welcome to Pro! Your subscription is active for ' + selectedPlan.days + ' days.');
    }
}

function showBuyCoins() {
    closeUpgradeModal();
    document.getElementById('buyCoinsModal').classList.add('active');
}

function closeBuyCoinsModal() {
    document.getElementById('buyCoinsModal').classList.remove('active');
}

function buyCoins(amount, price) {
    if (!currentUser) {
        alert('Please login first');
        showLoginModal();
        return;
    }

    if (confirm('Buy ' + amount + ' coins for $' + price + ' USD?')) {
        // In real app, integrate payment processor here
        alert('Payment feature coming soon! For demo: coins added.');
        currentUser.coins += amount;
        saveUser();
        updateUI();
        closeBuyCoinsModal();
    }
}
