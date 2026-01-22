// Global Variables
let currentUser = null;
let currentChatId = null;
let chatHistory = {};

// Admin Account
const ADMIN_EMAIL = 'nood2proinbloxfruit@gmail.com';

// Pricing (1000 coins = $1 USD)
const MONTHLY_PRO_COST = 10000; // $10 USD
const YEARLY_PRO_COST = 100000; // $100 USD
const IMAGE_COST = 200; // 200 coins per image ($0.20)

// Free User Limits
const FREE_MESSAGE_LIMIT = 50;
const FREE_COOLDOWN_HOURS = 5; // 5 hours cooldown after hitting limit

// Initialize
window.onload = function() {
    initializeAdminAccount();
    loadUser();
    updateUI();
    loadChatHistory();
    checkMessageLimit();
};

// Initialize Admin Account with Infinite Pro
function initializeAdminAccount() {
    const adminKey = 'user_' + ADMIN_EMAIL;
    let adminData = localStorage.getItem(adminKey);
    
    if (!adminData) {
        const admin = {
            email: ADMIN_EMAIL,
            password: 'NoodPro2025!',
            coins: 0,
            isPro: true,
            proExpiry: 'infinity',
            createdAt: Date.now(),
            isAdmin: true,
            totalEarnings: 0,
            messagesUsed: 0,
            lastResetTime: Date.now()
        };
        localStorage.setItem(adminKey, JSON.stringify(admin));
    } else {
        // Ensure admin always has infinite pro
        let admin = JSON.parse(adminData);
        admin.isPro = true;
        admin.proExpiry = 'infinity';
        admin.isAdmin = true;
        localStorage.setItem(adminKey, JSON.stringify(admin));
    }
}

// Transfer coins to admin account
function transferToAdmin(amount, reason) {
    const adminKey = 'user_' + ADMIN_EMAIL;
    let adminData = localStorage.getItem(adminKey);
    
    if (adminData) {
        let admin = JSON.parse(adminData);
        admin.coins = (admin.coins || 0) + amount;
        admin.totalEarnings = (admin.totalEarnings || 0) + amount;
        localStorage.setItem(adminKey, JSON.stringify(admin));
        
        // Log transaction
        logTransaction(currentUser.email, ADMIN_EMAIL, amount, reason);
    }
}

// Log transactions
function logTransaction(from, to, amount, reason) {
    let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions.push({
        from: from,
        to: to,
        amount: amount,
        reason: reason,
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    });
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Check if user can send messages
function canSendMessage() {
    if (!currentUser) return false;
    
    // Admin and Pro users have unlimited messages
    if (currentUser.isAdmin || currentUser.isPro) return true;
    
    // Check if cooldown period has passed
    const now = Date.now();
    const timeSinceReset = now - (currentUser.lastResetTime || 0);
    const cooldownMs = FREE_COOLDOWN_HOURS * 60 * 60 * 1000;
    
    // Reset message count if cooldown has passed
    if (timeSinceReset >= cooldownMs) {
        currentUser.messagesUsed = 0;
        currentUser.lastResetTime = now;
        saveUser();
        return true;
    }
    
    // Check if user has messages left
    return currentUser.messagesUsed < FREE_MESSAGE_LIMIT;
}

function getRemainingMessages() {
    if (!currentUser) return 0;
    if (currentUser.isAdmin || currentUser.isPro) return 'Unlimited';
    
    const now = Date.now();
    const timeSinceReset = now - (currentUser.lastResetTime || 0);
    const cooldownMs = FREE_COOLDOWN_HOURS * 60 * 60 * 1000;
    
    if (timeSinceReset >= cooldownMs) {
        return FREE_MESSAGE_LIMIT;
    }
    
    return Math.max(0, FREE_MESSAGE_LIMIT - (currentUser.messagesUsed || 0));
}

function getTimeUntilReset() {
    if (!currentUser || currentUser.isPro || currentUser.isAdmin) return null;
    
    const now = Date.now();
    const timeSinceReset = now - (currentUser.lastResetTime || 0);
    const cooldownMs = FREE_COOLDOWN_HOURS * 60 * 60 * 1000;
    
    if (timeSinceReset >= cooldownMs) return null;
    
    const timeLeft = cooldownMs - timeSinceReset;
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${hours}h ${minutes}m`;
}

function checkMessageLimit() {
    if (!currentUser) return;
    
    const remaining = getRemainingMessages();
    const timeLeft = getTimeUntilReset();
    
    if (remaining === 0 && timeLeft) {
        showLimitWarning(timeLeft);
    }
}

function showLimitWarning(timeLeft) {
    const messages = document.getElementById('messages');
    const warning = document.createElement('div');
    warning.className = 'limit-warning';
    warning.innerHTML = `
        <div class="warning-content">
            <h3>⏰ Message Limit Reached</h3>
            <p>You've used all 50 free messages today.</p>
            <p>Time until reset: <strong>${timeLeft}</strong></p>
            <button onclick="showUpgradeModal()" class="upgrade-now-btn">⭐ Upgrade to Pro for Unlimited Messages</button>
        </div>
    `;
    messages.appendChild(warning);
}

// User Authentication
function loadUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Check if Pro expired (except admin)
        if (currentUser.email !== ADMIN_EMAIL && currentUser.isPro && currentUser.proExpiry !== 'infinity') {
            if (Date.now() > currentUser.proExpiry) {
                currentUser.isPro = false;
                currentUser.proExpiry = null;
                saveUser();
                alert('⚠️ Your Pro subscription has expired. Upgrade again to continue unlimited access!');
            }
        }
    }
}

function saveUser() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        const userKey = 'user_' + currentUser.email;
        localStorage.setItem(userKey, JSON.stringify(currentUser));
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
        alert('❌ Please fill in all fields');
        return;
    }

    const userKey = 'user_' + email;
    const userData = localStorage.getItem(userKey);

    if (!userData) {
        alert('❌ Account not found. Please sign up first.');
        return;
    }

    const user = JSON.parse(userData);
    
    if (user.password !== password) {
        alert('❌ Incorrect password');
        return;
    }

    currentUser = user;
    saveUser();
    closeLoginModal();
    updateUI();
    checkMessageLimit();
    alert('✅ Welcome back, ' + email + '!');
}

function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (!email || !email.includes('@')) {
        alert('❌ Please enter a valid email');
        return;
    }

    if (password.length < 6) {
        alert('❌ Password must be at least 6 characters');
        return;
    }

    const userKey = 'user_' + email;
    
    if (localStorage.getItem(userKey)) {
        alert('❌ Account already exists. Please login.');
        return;
    }

    const newUser = {
        email: email,
        password: password,
        coins: 1000, // Starting coins (equivalent to $1)
        isPro: false,
        proExpiry: null,
        createdAt: Date.now(),
        isAdmin: false,
        messagesUsed: 0,
        lastResetTime: Date.now(),
        imagesGenerated: 0
    };

    localStorage.setItem(userKey, JSON.stringify(newUser));
    currentUser = newUser;
    saveUser();
    closeSignupModal();
    updateUI();
    alert('🎉 Account created! You received 1000 welcome coins ($1 value)!');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUI();
        clearChat();
        location.reload();
    }
}

function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('username');
    const coinAmount = document.getElementById('coinAmount');

    if (currentUser) {
        loginBtn.style.display = 'none';
        username.textContent = currentUser.email;
        coinAmount.textContent = currentUser.coins.toLocaleString();
        
        // Show message limit for free users
        updateMessageCounter();
    } else {
        loginBtn.style.display = 'block';
        username.textContent = 'Guest';
        coinAmount.textContent = '0';
    }
}

function updateMessageCounter() {
    let counter = document.getElementById('messageCounter');
    
    if (!counter) {
        counter = document.createElement('div');
        counter.id = 'messageCounter';
        counter.className = 'message-counter';
        document.querySelector('.sidebar-footer').prepend(counter);
    }
    
    const remaining = getRemainingMessages();
    const timeLeft = getTimeUntilReset();
    
    if (currentUser && (currentUser.isPro || currentUser.isAdmin)) {
        counter.innerHTML = '<div class="pro-badge">⭐ Pro - Unlimited Messages</div>';
    } else if (remaining === 'Unlimited') {
        counter.innerHTML = '<div class="free-badge">💬 50 Free Messages</div>';
    } else if (timeLeft) {
        counter.innerHTML = `
            <div class="limit-badge">
                ⏰ Limit Reached<br>
                <small>Reset in: ${timeLeft}</small>
            </div>
        `;
    } else {
        counter.innerHTML = `<div class="free-badge">💬 ${remaining}/50 Messages Left</div>`;
    }
}

// Chat Functions
function newChat() {
    if (!currentUser) {
        alert('❌ Please login to start chatting');
        showLoginModal();
        return;
    }
    
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
        alert('❌ Please login to send messages');
        showLoginModal();
        return;
    }

    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message) return;

    // Check message limit
    if (!canSendMessage()) {
        const timeLeft = getTimeUntilReset();
        alert(`⏰ You've reached your daily limit of ${FREE_MESSAGE_LIMIT} messages.\n\nReset in: ${timeLeft}\n\n⭐ Upgrade to Pro for unlimited messages!`);
        showUpgradeModal();
        return;
    }

    // Create new chat if none exists
    if (!currentChatId) {
        newChat();
        chatHistory[currentChatId].title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    // Increment message count for free users
    if (!currentUser.isPro && !currentUser.isAdmin) {
        currentUser.messagesUsed = (currentUser.messagesUsed || 0) + 1;
        saveUser();
        updateUI();
        updateMessageCounter();
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
        alert('❌ Please login to generate images');
        showLoginModal();
        return;
    }

    if (currentUser.coins < IMAGE_COST && !currentUser.isPro && !currentUser.isAdmin) {
        alert(`❌ You need ${IMAGE_COST} coins to generate an image.\n\nYou have: ${currentUser.coins} coins\n\n💰 Buy more coins or upgrade to Pro!`);
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

    // Deduct coins if not Pro/Admin
    if (!currentUser.isPro && !currentUser.isAdmin) {
        currentUser.coins -= IMAGE_COST;
        transferToAdmin(IMAGE_COST, 'Image Generation Fee');
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

    // Simulate image generation
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
        alert('❌ Please login first');
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
        alert('❌ Please login first');
        showLoginModal();
        return;
    }

    const plans = {
        monthly: { cost: MONTHLY_PRO_COST, days: 30, name: 'Monthly Pro', usd: 10 },
        yearly: { cost: YEARLY_PRO_COST, days: 365, name: 'Yearly Pro', usd: 100 }
    };

    const selectedPlan = plans[plan];

    if (currentUser.coins < selectedPlan.cost) {
        const needed = selectedPlan.cost - currentUser.coins;
        alert(`❌ Not enough coins!\n\nYou need: ${selectedPlan.cost.toLocaleString()} coins ($${selectedPlan.usd})\nYou have: ${currentUser.coins.toLocaleString()} coins\nYou need: ${needed.toLocaleString()} more coins`);
        showBuyCoins();
        return;
    }

    if (confirm(`Purchase ${selectedPlan.name} for ${selectedPlan.cost.toLocaleString()} coins ($${selectedPlan.usd} USD)?\n\n✅ Unlimited messages\n✅ Free image generation\n✅ Priority support\n✅ ${selectedPlan.days} days access`)) {
        currentUser.coins -= selectedPlan.cost;
        currentUser.isPro = true;
        currentUser.proExpiry = Date.now() + (selectedPlan.days * 24 * 60 * 60 * 1000);
        
        // Reset message count when upgrading
        currentUser.messagesUsed = 0;
        currentUser.lastResetTime = Date.now();
        
        // Transfer coins to admin
        transferToAdmin(selectedPlan.cost, `${selectedPlan.name} Purchase`);
        
        saveUser();
        updateUI();
        updateMessageCounter();
        closeUpgradeModal();
        alert(`🎉 Welcome to Pro!\n\nYour subscription is active for ${selectedPlan.days} days.\n\n✨ Enjoy unlimited messages and free image generation!`);
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
        alert('❌ Please login first');
        showLoginModal();
        return;
    }

    if (confirm(`Purchase ${amount.toLocaleString()} coins for $${price} USD?\n\n💰 This will be added to your account immediately.`)) {
        // In real app, integrate payment processor here (Stripe, PayPal, etc.)
        alert(`💳 Payment Processing...\n\nIn a real app, you would be redirected to a payment gateway.\n\nFor demo purposes, coins have been added to your account!`);
        
        currentUser.coins += amount;
        saveUser();
        updateUI();
        closeBuyCoinsModal();
        
        alert(`✅ Success!\n\n${amount.toLocaleString()} coins have been added to your account!\n\nNew balance: ${currentUser.coins.toLocaleString()} coins`);
    }
}
