
// --- MOCK DATABASE (Authentication & Multi-tenant) ---
const mockUsers: { [key: string]: { userId: string, churchId: string, name: string } } = {
    '9800000001': { userId: 'user1', churchId: 'grace-church', name: 'Admin User' },
    '9800000002': { userId: 'user5', churchId: 'hope-fellowship', name: 'Pastor David' },
};

const mockDatabase: { [key: string]: any } = {
    'grace-church': {
        name: 'Grace Community Church',
        welcomeMessage: 'We are so glad you\'re here. Our community is a place where you can find love, hope, and a family in Christ.',
        liveServiceVideoId: '5qap5aO4i9A',
        members: [
            { id: 'user1', name: 'Admin User', isAdmin: true, avatarColor: '#3f51b5' },
            { id: 'user2', name: 'Pastor John', isAdmin: false, avatarColor: '#e91e63' },
            { id: 'user3', name: 'Jane Doe', isAdmin: false, avatarColor: '#009688' },
            { id: 'user4', name: 'Mike Smith', isAdmin: false, avatarColor: '#ff9800' },
        ],
        sermons: [{ videoId: 'Y-i4p4O7a_0', title: 'The Courage to Hope', speaker: 'Pastor John', date: '2024-05-19' }, { videoId: 'jNQXAC9IVRw', title: 'Love That Transforms', speaker: 'Pastor Jane', date: '2024-05-12' }],
        prayers: [{ id: 'p1', postedBy: 'user3', timestamp: '2024-05-20T10:00:00Z', title: 'Family Health', text: 'Please pray for my family\'s health and protection.', prayedCount: 12, comments: [], image: null }],
        news: [{ title: 'Summer Retreat Registration Open', text: 'Registration for the annual summer retreat is now open! Sign up by June 15th.', date: 'May 15, 2024' }],
        chats: [
            { id: 'chat1', name: 'Youth Group', type: 'group', members: ['user1', 'user3', 'user4'], preview: 'Sounds good, see you there!', time: '3:45 PM', avatarColor: '#e91e63' },
            { id: 'chat2', name: 'Pastor John', type: 'direct', members: ['user1', 'user2'], preview: 'Can we meet tomorrow?', time: '1:12 PM', avatarColor: '#3f51b5' },
        ]
    },
    'hope-fellowship': {
        name: 'Hope Fellowship Nepal',
        welcomeMessage: 'Welcome to Hope Fellowship! A place to grow together in faith and love. We are delighted to have you with us.',
        liveServiceVideoId: 'tSBFz_MDnLs',
        members: [
            { id: 'user5', name: 'Pastor David', isAdmin: true, avatarColor: '#009688' },
            { id: 'user6', name: 'Sarah Lee', isAdmin: false, avatarColor: '#e91e63' },
        ],
        sermons: [{ videoId: 'tSBFz_MDnLs', title: 'Walking in the Light', speaker: 'Pastor David', date: '2024-05-05' }, { videoId: 'w5kM5w_2q2c', title: 'The Heart of a Servant', speaker: 'Pastor David', date: '2024-04-28' }],
        prayers: [{ id: 'p2', postedBy: 'user6', timestamp: '2024-05-21T14:30:00Z', title: 'New Job Guidance', text: 'Praying for wisdom and guidance in my new job.', prayedCount: 8, comments: [], image: null }],
        news: [{ title: 'VBS Volunteers Needed', text: 'We are looking for volunteers for this year\'s Vacation Bible School. Please see Sarah for more info.', date: 'May 12, 2024' }],
        chats: [{ id: 'chat3', name: 'Sunday School Teachers', type: 'group', members: ['user5', 'user6'], preview: 'Who is bringing the snacks?', time: 'Yesterday', avatarColor: '#009688' }]
    }
};

// --- STATE MANAGEMENT ---
let currentChurchId: string | null = null;
let churchData: any = null;
let currentUser: { id: string | null, name: string | null, isAdmin?: boolean, avatarColor?: string } = { id: null, name: null };
let notifications: { message: string, type: string, timestamp: Date }[] = [];
let unreadNotifications = 0;
let currentChat: any = null;

// --- ELEMENT SELECTORS ---
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const headerTitle = document.getElementById('header-title') as HTMLElement;

// Login
const loginOverlay = document.getElementById('login-overlay') as HTMLDivElement;
const loginModal = document.getElementById('login-modal') as HTMLDivElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
const loginError = document.getElementById('login-error') as HTMLParagraphElement;
const sendCodeBtn = document.getElementById('send-code-btn') as HTMLButtonElement;
const testNumbersContainer = document.querySelector('.test-numbers') as HTMLDivElement;

// Welcome
const welcomeChurchName = document.getElementById('welcome-church-name') as HTMLElement;
const welcomeMessage = document.getElementById('welcome-message') as HTMLElement;

// Core UI
const notificationBtn = document.getElementById('notification-btn') as HTMLButtonElement;
const notificationBadge = document.getElementById('notification-badge') as HTMLSpanElement;
const notificationPanel = document.getElementById('notification-panel') as HTMLDivElement;
const notificationList = document.getElementById('notification-list') as HTMLUListElement;
const moreMenuBtn = document.getElementById('more-menu-btn') as HTMLButtonElement;
const moreMenuDropdown = document.getElementById('more-menu-dropdown') as HTMLDivElement;
const dropdownAdminBtn = document.getElementById('dropdown-admin-btn') as HTMLButtonElement;
const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn') as HTMLButtonElement;
const adminPanelOverlay = document.getElementById('admin-panel-overlay') as HTMLDivElement;
const exitAdminModeBtn = document.getElementById('exit-admin-mode-btn') as HTMLButtonElement;
const adminMembersList = document.getElementById('admin-members-list') as HTMLUListElement;
const adminPrayersList = document.getElementById('admin-prayers-list') as HTMLUListElement;

const titles: { [key: string]: string } = { welcome: 'स्वागतम', live: 'आरधना', prayer: 'प्रार्थना', bible: 'बाइबल', news: 'सुचना', chat: 'संगति' };

// --- CORE APP LOGIC ---
function showContent(targetId: string) {
    if (!currentChurchId) {
        showLogin("Your session has expired. Please log in again.");
        return;
    }

    headerTitle.textContent = (targetId === 'welcome' ? churchData.name : titles[targetId]) || 'Welcome';
    headerTitle.classList.remove('is-group');

    contentSections.forEach(section => section.classList.toggle('active', section.id === targetId));
    navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-target') === targetId));

    if (targetId === 'chat') showChatList();
    if (targetId === 'live' && churchData.sermons.length > 0) setupLiveService();
    else if (targetId !== 'live' && document.getElementById('video-player')) (document.getElementById('video-player') as HTMLIFrameElement).src = '';
    if (targetId === 'bible') setupBiblePage();
}

function initializeForChurch() {
    if (!currentChurchId || !churchData) return;
    
    // Reset UI components
    (document.getElementById('prayer-list') as HTMLElement).innerHTML = ''; 
    (document.getElementById('sermon-list') as HTMLElement).innerHTML = ''; 
    (document.getElementById('news-list') as HTMLElement).innerHTML = ''; 
    (document.getElementById('chat-list-container') as HTMLElement).innerHTML = '';
    
    setupWelcome(); setupPrayerWall(); setupNews(); setupChatList();
    showContent('welcome');
    addNotification(`Welcome to ${churchData.name}!`, 'system');
}

function setupWelcome() {
    welcomeChurchName.textContent = `Welcome to ${churchData.name}!`;
    welcomeMessage.textContent = churchData.welcomeMessage;
}

// --- NAVIGATION ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (targetId) showContent(targetId);
    });
});

// --- AUTHENTICATION LOGIC ---
function showLogin(message?: string) {
    loginOverlay.style.display = 'flex'; // Ensure it is displayed before adding active class
    // Force reflow to ensure transition happens if needed, though we mainly want it visible
    loginOverlay.offsetHeight;
    loginOverlay.classList.add('active');
    
    // Reset form
    phoneInput.value = '';
    loginError.textContent = message || '';
}

function loginSuccess(phone: string) {
    const userAuthData = mockUsers[phone];
    if (!userAuthData) return;
    
    currentChurchId = userAuthData.churchId;
    churchData = mockDatabase[currentChurchId];
    
    const loggedInUser = churchData.members.find((m: any) => m.id === userAuthData.userId);
    currentUser = loggedInUser || { id: userAuthData.userId, name: userAuthData.name };

    if (currentUser.isAdmin) {
        dropdownAdminBtn.style.display = 'block';
    } else {
        dropdownAdminBtn.style.display = 'none';
    }

    const session = { phone, userId: currentUser.id, churchId: currentChurchId };
    localStorage.setItem('churchAppSession', JSON.stringify(session));

    // CRITICAL: Completely hide overlay
    loginOverlay.classList.remove('active');
    loginOverlay.style.display = 'none'; // Force hide override
    
    // Dismiss keyboard on mobile
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    initializeForChurch();
}

loginForm.addEventListener('submit', (e) => e.preventDefault());

function triggerErrorShake() {
    loginModal.classList.add('shake');
    loginModal.addEventListener('animationend', () => {
        loginModal.classList.remove('shake');
    }, { once: true });
}

sendCodeBtn.addEventListener('click', () => {
    loginError.textContent = '';
    // Sanitize input: remove all non-numeric characters
    const phone = phoneInput.value.replace(/\D/g, '');
    
    if (mockUsers[phone]) {
        loginSuccess(phone);
    } else {
        loginError.textContent = 'Phone number not found.';
        triggerErrorShake();
    }
});

testNumbersContainer.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.test-number-chip') as HTMLButtonElement;
    if (target && target.dataset.phone) {
        loginSuccess(target.dataset.phone);
    }
});

phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendCodeBtn.click();
    }
});

function logout() {
    localStorage.removeItem('churchAppSession');
    currentChurchId = null;
    churchData = null;
    currentUser = { id: null, name: null };
    moreMenuDropdown.classList.add('hidden');
    dropdownAdminBtn.style.display = 'none';
    showLogin();
}
dropdownLogoutBtn.addEventListener('click', logout);

// --- NOTIFICATION & MENU LOGIC ---
function addNotification(message: string, type: string) {
    notifications.unshift({ message, type, timestamp: new Date() });
    unreadNotifications++;
    updateNotificationUI();
}

function updateNotificationUI() {
    notificationBadge.classList.toggle('hidden', unreadNotifications <= 0);
}

function renderNotifications() {
    notificationList.innerHTML = notifications.length === 0 
        ? `<li class="notification-item">No new notifications.</li>`
        : notifications.map(notif => `
            <li class="notification-item"><p>${notif.message}</p><small>${notif.timestamp.toLocaleString()}</small></li>
        `).join('');
}

notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationPanel.classList.toggle('hidden');
    moreMenuDropdown.classList.add('hidden');
    if (!notificationPanel.classList.contains('hidden')) {
        renderNotifications(); unreadNotifications = 0; updateNotificationUI();
    }
});

moreMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenuDropdown.classList.toggle('hidden');
    notificationPanel.classList.add('hidden');
});

document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!notificationPanel.contains(target) && !notificationBtn.contains(target)) notificationPanel.classList.add('hidden');
    if (!moreMenuDropdown.contains(target) && !moreMenuBtn.contains(target)) moreMenuDropdown.classList.add('hidden');
});

// --- BIBLE LOGIC ---
function generateNepaliBiblePlan() {
    const samplePlan = [
        { day: 1, reading: 'उत्पत्ति १-२; मत्ती १' }, { day: 2, reading: 'उत्पत्ति ३-५; मत्ती २' },
        { day: 3, reading: 'उत्पत्ति ६-८; मत्ती ३' }, { day: 4, reading: 'उत्पत्ति ९-११; मत्ती ४' },
    ];
    return Array.from({ length: 365 }, (_, i) => {
        const planEntry = samplePlan[i % samplePlan.length];
        return { day: i + 1, text: `दिन ${i + 1}: ${planEntry.reading}` };
    });
}
const biblePlan = generateNepaliBiblePlan();
let currentDayOfYear = -1;
const bibleReadingPlanContainer = document.getElementById('bible-reading-plan') as HTMLDivElement;

function setupBiblePage() {
    const today = new Date();
    const dailyLifeDate = document.getElementById('daily-life-date') as HTMLSpanElement;
    dailyLifeDate.textContent = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (bibleReadingPlanContainer.children.length === 0) {
        biblePlan.forEach(item => {
            const div = document.createElement('div');
            div.className = 'reading-plan-item';
            div.textContent = item.text;
            div.dataset.day = item.day.toString();
            bibleReadingPlanContainer.appendChild(div);
        });
    }

    if (currentDayOfYear !== dayOfYear) {
        bibleReadingPlanContainer.querySelector('.today')?.classList.remove('today');
        const todayEl = bibleReadingPlanContainer.querySelector(`[data-day='${dayOfYear}']`) as HTMLElement;
        todayEl?.classList.add('today');
        currentDayOfYear = dayOfYear;
    }

    const todayEl = bibleReadingPlanContainer.querySelector('.today');
    if (todayEl) setTimeout(() => todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}
bibleReadingPlanContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('reading-plan-item')) {
        alert(`आजको पढाइ (Reading for the Day):\n${target.textContent}\n\n[नेपाली NNRV पाठ यहाँ देखिनेछ]`);
    }
});

// --- LIVE SERVICE LOGIC ---
function loadVideo(videoId: string) {
    const videoPlayer = document.getElementById('video-player') as HTMLIFrameElement;
    if (!videoPlayer) return;
    videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    const sermonListEl = document.getElementById('sermon-list') as HTMLUListElement;
    sermonListEl.querySelectorAll('.sermon-list-item').forEach(item => {
        const el = item as HTMLElement;
        el.classList.toggle('active', el.dataset.videoId === videoId);
    });
}

function setupLiveService() {
    const sermonListEl = document.getElementById('sermon-list') as HTMLUListElement;
    const videoPlayer = document.getElementById('video-player') as HTMLIFrameElement;
    if (!sermonListEl || !churchData) return;
    
    sermonListEl.innerHTML = '';
    churchData.sermons.forEach((sermon: any) => {
        const li = document.createElement('li');
        li.className = 'sermon-list-item';
        li.dataset.videoId = sermon.videoId;
        li.innerHTML = `<div class="sermon-title">${sermon.title}</div><div class="sermon-meta">${sermon.speaker} - ${sermon.date}</div>`;
        sermonListEl.appendChild(li);
    });
    
    sermonListEl.onclick = (e) => {
        const listItem = (e.target as HTMLElement).closest('.sermon-list-item') as HTMLLIElement;
        if (listItem?.dataset.videoId) loadVideo(listItem.dataset.videoId);
    };
    
    if (!videoPlayer.src.includes('youtube.com')) loadVideo(churchData.liveServiceVideoId);
}

// --- NEWS LOGIC ---
function setupNews() {
    const newsList = document.getElementById('news-list') as HTMLDivElement;
    if (!newsList || !churchData) return;
    newsList.innerHTML = '';
    churchData.news.forEach((item: any) => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        newsCard.innerHTML = `<h3>${item.title}</h3><p>${item.text}</p><span class="news-date">${item.date}</span>`;
        newsList.appendChild(newsCard);
    });
}

// --- PRAYER WALL LOGIC ---
const prayerForm = document.getElementById('prayer-form') as HTMLFormElement;
const prayerTitleInput = document.getElementById('prayer-title-input') as HTMLInputElement;
const prayerInput = document.getElementById('prayer-input') as HTMLTextAreaElement;
const prayerImageInput = document.getElementById('prayer-image-input') as HTMLInputElement;
const prayerImageFilename = document.getElementById('prayer-image-filename') as HTMLSpanElement;
const prayerList = document.getElementById('prayer-list') as HTMLDivElement;

function setupPrayerWall() {
    prayerList.innerHTML = '';
    churchData.prayers.forEach((prayer: any) => addPrayerToDOM(prayer, true, false));
}
prayerImageInput.addEventListener('change', () => { prayerImageFilename.textContent = prayerImageInput.files?.[0]?.name || ''; });
prayerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const prayerTitle = prayerTitleInput.value.trim();
    const prayerText = prayerInput.value.trim();
    if (prayerTitle && prayerText) {
        const newPrayer = { 
            id: `p${Date.now()}`,
            postedBy: currentUser.id,
            timestamp: new Date().toISOString(),
            title: prayerTitle,
            text: prayerText,
            prayedCount: 0,
            comments: [],
            image: prayerImageInput.files?.[0] || null
        };
        churchData.prayers.unshift(newPrayer);
        addPrayerToDOM(newPrayer, false, true);
        addNotification(`New prayer posted: "${prayerTitle}"`, 'prayer');
        prayerForm.reset(); prayerImageFilename.textContent = '';
    }
});

function addPrayerToDOM(prayer: any, isExisting: boolean, prepend = false) {
    const prayerCard = document.createElement('div');
    prayerCard.className = 'prayer-card';

    const user = churchData.members.find((m:any) => m.id === prayer.postedBy);
    const userAvatar = user ? `<div class="prayer-card-avatar" style="background-color: ${user.avatarColor};">${user.name.charAt(0).toUpperCase()}</div>` : '';
    const userName = user ? `<span class="prayer-card-username">${user.name}</span>` : '';
    const timestamp = prayer.timestamp ? `<span class="prayer-card-time">${new Date(prayer.timestamp).toLocaleDateString()}</span>` : '';
    
    const cardHTML = `
        <div class="prayer-card-header">
            ${userAvatar}
            <div class="prayer-card-userinfo">
                ${userName}
                ${timestamp}
            </div>
        </div>
        <div class="prayer-card-content">
            <h3>${prayer.title}</h3>
            <p>${prayer.text}</p>
        </div>
        <div class="prayer-card-actions">
            <button class="action-btn prayed-btn">🙏 <span class="prayed-count">${prayer.prayedCount}</span></button>
            <button class="action-btn reply-btn">💬 Reply</button>
        </div>
        <div class="prayer-card-comments" style="display: none;"></div>
    `;
    prayerCard.innerHTML = cardHTML;

    const addCard = (card: HTMLElement) => prepend ? prayerList.prepend(card) : prayerList.appendChild(card);
    const imageFile = !isExisting ? prayer.image : null; 

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target?.result as string; 
            img.className = 'prayer-card-image';
            prayerCard.insertBefore(img, prayerCard.querySelector('.prayer-card-content'));
            addCard(prayerCard);
        };
        reader.readAsDataURL(imageFile);
    } else {
        addCard(prayerCard);
    }
}

prayerList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const prayedBtn = target.closest('.prayed-btn');
    const replyBtn = target.closest('.reply-btn');
    if (prayedBtn && !prayedBtn.classList.contains('prayed')) {
        const countSpan = prayedBtn.querySelector('.prayed-count') as HTMLSpanElement;
        countSpan.textContent = (parseInt(countSpan.textContent || '0', 10) + 1).toString();
        prayedBtn.classList.add('prayed');
    }
    if (replyBtn) {
        const card = replyBtn.closest('.prayer-card');
        const commentsContainer = card?.querySelector('.prayer-card-comments') as HTMLDivElement;
        if (commentsContainer) {
             commentsContainer.style.display = commentsContainer.style.display === 'none' ? 'block' : 'none';
             if (!commentsContainer.querySelector('.comment-form')) {
                 const commentForm = document.createElement('form');
                 commentForm.className = 'comment-form';
                 commentForm.innerHTML = `<input type="text" class="comment-input" placeholder="Write a comment..." required><button type="submit" class="comment-submit">Post</button>`;
                 commentForm.onsubmit = (ev) => {
                    ev.preventDefault();
                    const input = commentForm.querySelector('.comment-input') as HTMLInputElement;
                    if (input.value.trim()) {
                        const newComment = document.createElement('div');
                        newComment.className = 'comment'; newComment.textContent = input.value.trim();
                        commentsContainer.insertBefore(newComment, commentForm); input.value = '';
                    }
                 };
                 commentsContainer.appendChild(commentForm);
             }
        }
    }
});

// --- CHAT LOGIC ---
const chatSection = document.getElementById('chat') as HTMLElement;
const chatListView = document.getElementById('chat-list-view') as HTMLDivElement;
const chatListContainer = document.getElementById('chat-list-container') as HTMLDivElement;
const chatDetailView = document.getElementById('chat-detail-view') as HTMLDivElement;
const chatDetailTitle = document.getElementById('chat-detail-title') as HTMLElement;
const chatBackButton = document.getElementById('chat-back-btn') as HTMLButtonElement;
const chatMessages = document.querySelector('.chat-messages') as HTMLDivElement;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const chatSendButton = document.getElementById('chat-send-btn') as HTMLButtonElement;
const newChatFab = document.getElementById('new-chat-fab') as HTMLButtonElement;
const emojiButton = document.getElementById('emoji-btn') as HTMLButtonElement;
const emojiPicker = document.getElementById('emoji-picker') as HTMLDivElement;
const newChatView = document.getElementById('new-chat-view') as HTMLDivElement;
const newChatBackButton = document.getElementById('new-chat-back-btn') as HTMLButtonElement;
const userSearchInput = document.getElementById('user-search-input') as HTMLInputElement;
const userListContainer = document.getElementById('user-list-container') as HTMLUListElement;
const groupMembersOverlay = document.getElementById('group-members-overlay') as HTMLDivElement;
const groupMembersList = document.getElementById('group-members-list') as HTMLUListElement;
const closeGroupMembersModalBtn = document.getElementById('close-group-members-modal') as HTMLButtonElement;

function setupChatList() {
    chatListContainer.innerHTML = '';
    churchData.chats.forEach((chat: any) => addNewChatItem(chat));
}
function showChatList() {
    chatSection.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    chatListView.classList.add('active');
    headerTitle.textContent = titles['chat'];
    headerTitle.classList.remove('is-group');
    emojiPicker.classList.remove('active');
}
function showChatDetail(chat: any) {
    currentChat = chat;
    chatSection.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    chatDetailView.classList.add('active');
    const chatName = getChatName(chat);
    chatDetailTitle.textContent = chatName;
    headerTitle.textContent = chatName;
    headerTitle.classList.toggle('is-group', chat.type === 'group');
    loadMockMessages(chatName);
}
function getChatName(chat: any) {
    if (chat.type === 'direct') {
        const otherMemberId = chat.members.find((id: string) => id !== currentUser.id);
        const otherMember = churchData.members.find((m: any) => m.id === otherMemberId);
        return otherMember ? otherMember.name : 'Unknown User';
    }
    return chat.name;
}
chatListContainer.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.chat-list-item');
    if (item) {
        const chatId = item.getAttribute('data-chat-id');
        const chat = churchData.chats.find((c: any) => c.id === chatId);
        if (chat) showChatDetail(chat);
    }
});
chatBackButton.addEventListener('click', showChatList);
function addMessage(text: string, sender: 'me' | 'other') {
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${sender}`; messageBubble.textContent = text;
    chatMessages.appendChild(messageBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function handleSendMessage() {
    const messageText = chatInput.value.trim();
    if (messageText) {
        addMessage(messageText, 'me'); chatInput.value = ''; chatInput.style.height = 'auto';
        setTimeout(() => addMessage("Thanks for your message!", 'other'), 1000);
    }
}
chatSendButton.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
chatInput.addEventListener('input', () => { chatInput.style.height = 'auto'; chatInput.style.height = `${chatInput.scrollHeight}px`; });
function loadMockMessages(chatName: string) {
    chatMessages.innerHTML = '';
    if (chatName === 'Youth Group') {
        addMessage('Hey everyone, are we still on for Friday?', 'other');
        addMessage('Yes! 7pm at the main hall.', 'other');
        addMessage('Sounds good, see you there!', 'me');
    } else if (chatName === 'Pastor John' || chatName === 'Pastor David') {
        addMessage('Can we meet tomorrow?', 'other');
    } else {
        addMessage(`Welcome to the ${chatName} chat!`, 'other');
    }
}
function addNewChatItem(chat: any, prepend = false) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-list-item';
    chatItem.setAttribute('data-chat-id', chat.id);
    const name = getChatName(chat);
    chatItem.innerHTML = `<div class="chat-avatar" style="background-color: ${chat.avatarColor};">${name.charAt(0).toUpperCase()}</div><div class="chat-list-details"><div class="chat-list-title">${name}</div><div class="chat-list-preview">${chat.preview}</div></div><div class="chat-list-meta">${chat.time}</div>`;
    if (prepend) chatListContainer.prepend(chatItem); else chatListContainer.appendChild(chatItem);
}
// New Chat Flow
newChatFab.addEventListener('click', () => {
    chatSection.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    newChatView.classList.add('active');
    populateUserList();
});
newChatBackButton.addEventListener('click', showChatList);
function populateUserList(filter = '') {
    userListContainer.innerHTML = '';
    const filteredMembers = churchData.members
        .filter((m: any) => m.id !== currentUser.id && m.name.toLowerCase().includes(filter.toLowerCase()));
    
    filteredMembers.forEach((member: any) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-list-item';
        userItem.dataset.userId = member.id;
        userItem.innerHTML = `<div class="chat-avatar" style="background-color: ${member.avatarColor};">${member.name.charAt(0).toUpperCase()}</div><p>${member.name}</p>`;
        userListContainer.appendChild(userItem);
    });
}
userSearchInput.addEventListener('input', () => populateUserList(userSearchInput.value));
userListContainer.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.user-list-item') as HTMLElement;
    if (!item) return;
    const userId = item.dataset.userId;
    let chat = churchData.chats.find((c: any) => c.type === 'direct' && c.members.includes(userId));
    if (!chat) {
        const otherUser = churchData.members.find((m: any) => m.id === userId);
        chat = {
            id: `chat${Date.now()}`, name: otherUser.name, type: 'direct', members: [currentUser.id, userId],
            preview: "No messages yet.", time: "Now", avatarColor: otherUser.avatarColor
        };
        churchData.chats.unshift(chat);
        addNewChatItem(chat, true);
    }
    showChatDetail(chat);
});

// Group Members Modal Logic
headerTitle.addEventListener('click', () => {
    if (currentChat && currentChat.type === 'group') {
        groupMembersList.innerHTML = '';
        currentChat.members.forEach((memberId: string) => {
            const member = churchData.members.find((m: any) => m.id === memberId);
            if (member) {
                const li = document.createElement('li');
                li.textContent = member.name;
                groupMembersList.appendChild(li);
            }
        });
        groupMembersOverlay.classList.remove('hidden');
    }
});
closeGroupMembersModalBtn.addEventListener('click', () => groupMembersOverlay.classList.add('hidden'));
groupMembersOverlay.addEventListener('click', (e) => { if (e.target === groupMembersOverlay) groupMembersOverlay.classList.add('hidden'); });

// Emoji Picker Logic
const emojis = ['😀', '😂', '😍', '🤔', '😢', '👍', '🙏', '❤️', '🎉', '🔥', '💯', '🚀'];
emojis.forEach(emoji => {
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji; emojiSpan.setAttribute('role', 'button');
    emojiSpan.addEventListener('click', () => { chatInput.value += emoji; chatInput.focus(); });
    emojiPicker.appendChild(emojiSpan);
});
emojiButton.addEventListener('click', (e) => { e.stopPropagation(); emojiPicker.classList.toggle('active'); });
document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!emojiPicker.contains(target) && e.target !== emojiButton) emojiPicker.classList.remove('active');
});

// --- ADMIN MODE ---
dropdownAdminBtn.addEventListener('click', () => {
    moreMenuDropdown.classList.add('hidden');
    if (currentUser && currentUser.isAdmin) {
        setupAdminPanel();
        adminPanelOverlay.classList.remove('hidden');
    } else {
        alert('You do not have admin permissions.');
    }
});
exitAdminModeBtn.addEventListener('click', () => adminPanelOverlay.classList.add('hidden'));
function setupAdminPanel() {
    // Members
    adminMembersList.innerHTML = '';
    churchData.members.forEach((member: any) => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `<p>${member.name}${member.isAdmin ? ' (Admin)' : ''}</p><button class="admin-delete-btn" data-id="${member.id}">Remove</button>`;
        adminMembersList.appendChild(li);
    });
    // Prayers
    adminPrayersList.innerHTML = '';
    churchData.prayers.forEach((prayer: any) => {
        const li = document.createElement('li');
        li.className = 'admin-list-item';
        li.innerHTML = `<p>"${prayer.title}"</p><button class="admin-delete-btn" data-id="${prayer.id}">Delete</button>`;
        adminPrayersList.appendChild(li);
    });
}
adminPanelOverlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('admin-delete-btn')) {
        const id = target.dataset.id;
        const item = target.closest('.admin-list-item');
        alert(`Simulating deletion of item ID: ${id}.`);
        item?.remove();
    }
});

// --- INITIALIZATION ---
function initializeApp() {
    dropdownAdminBtn.style.display = 'none';
    const savedSessionJSON = localStorage.getItem('churchAppSession');

    if (!savedSessionJSON) {
        showLogin();
        return;
    }

    try {
        const session = JSON.parse(savedSessionJSON);
        const userAuthData = mockUsers[session.phone];
        const churchDataForValidation = userAuthData ? mockDatabase[userAuthData.churchId] : null;
        const userForValidation = churchDataForValidation ? churchDataForValidation.members.find((m: any) => m.id === userAuthData.userId) : null;

        if (userAuthData && churchDataForValidation && userForValidation) {
            // Session is valid, proceed with login
            loginSuccess(session.phone);
        } else {
            // Session is invalid (e.g., stale data)
            throw new Error("Invalid session data.");
        }
    } catch (error) {
        console.error("Session validation failed:", error);
        localStorage.removeItem('churchAppSession');
        showLogin("Your session has expired. Please log in again.");
    }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

initializeApp();
