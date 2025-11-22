
// --- MOCK DATABASE ---
const mockUsers: { [key: string]: { userId: string, churchId: string, name: string } } = {
    '9800000001': { userId: 'user1', churchId: 'grace-church', name: 'Admin User' },
    '9800000002': { userId: 'user5', churchId: 'hope-fellowship', name: 'Pastor David' },
    '1234': { userId: 'user1', churchId: 'grace-church', name: 'Admin User (Test)' }
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

// --- STATE ---
let currentChurchId: string | null = null;
let churchData: any = null;
let currentUser: { id: string | null, name: string | null, isAdmin?: boolean, avatarColor?: string } = { id: null, name: null };
let notifications: { message: string, type: string, timestamp: Date }[] = [];
let unreadNotifications = 0;
let currentChat: any = null;

const titles: { [key: string]: string } = { welcome: 'स्वागतम', live: 'आरधना', prayer: 'प्रार्थना', bible: 'बाइबल', news: 'सुचना', chat: 'संगति' };

// --- DOMContentLoaded Wrapper ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    initializeApp();
});

// --- INITIALIZATION ---
function initializeApp() {
    // Bind Events
    setupEventListeners();

    const savedSessionJSON = localStorage.getItem('churchAppSession');
    if (savedSessionJSON) {
        try {
            const session = JSON.parse(savedSessionJSON);
            if (session && session.phone) {
                loginSuccess(session.phone, true);
            } else {
                showLogin();
            }
        } catch (e) {
            localStorage.removeItem('churchAppSession');
            showLogin();
        }
    } else {
        showLogin();
    }
}

function setupEventListeners() {
    // Login Buttons
    const sendCodeBtn = document.getElementById('send-code-btn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', handleLoginClick);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLoginClick(e);
        });
    }

    const testNumbersContainer = document.querySelector('.test-numbers');
    if (testNumbersContainer) {
        testNumbersContainer.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement).closest('.test-number-chip') as HTMLElement;
            if (target && target.dataset.phone) {
                const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
                if(phoneInput) phoneInput.value = target.dataset.phone;
                loginSuccess(target.dataset.phone);
            }
        });
    }

    // Nav Items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId) showContent(targetId);
        });
    });

    // Core UI
    const notificationBtn = document.getElementById('notification-btn');
    if(notificationBtn) notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('notification-panel')?.classList.toggle('hidden');
        document.getElementById('more-menu-dropdown')?.classList.add('hidden');
        renderNotifications();
    });

    const moreMenuBtn = document.getElementById('more-menu-btn');
    if(moreMenuBtn) moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('more-menu-dropdown')?.classList.toggle('hidden');
        document.getElementById('notification-panel')?.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        const target = e.target as Node;
        const notifPanel = document.getElementById('notification-panel');
        const notifBtn = document.getElementById('notification-btn');
        const moreMenu = document.getElementById('more-menu-dropdown');
        const moreBtn = document.getElementById('more-menu-btn');

        if (notifPanel && !notifPanel.contains(target) && notifBtn && !notifBtn.contains(target)) {
            notifPanel.classList.add('hidden');
        }
        if (moreMenu && !moreMenu.contains(target) && moreBtn && !moreBtn.contains(target)) {
            moreMenu.classList.add('hidden');
        }
    });

    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
    if(dropdownLogoutBtn) dropdownLogoutBtn.addEventListener('click', logout);

    // Admin
    const dropdownAdminBtn = document.getElementById('dropdown-admin-btn');
    if(dropdownAdminBtn) dropdownAdminBtn.addEventListener('click', () => {
        document.getElementById('more-menu-dropdown')?.classList.add('hidden');
        if (currentUser && currentUser.isAdmin) {
            setupAdminPanel();
            document.getElementById('admin-panel-overlay')?.classList.remove('hidden');
        } else {
            alert('You do not have admin permissions.');
        }
    });

    const exitAdminModeBtn = document.getElementById('exit-admin-mode-btn');
    if(exitAdminModeBtn) exitAdminModeBtn.addEventListener('click', () => document.getElementById('admin-panel-overlay')?.classList.add('hidden'));

    // Chat
    const chatBackButton = document.getElementById('chat-back-btn');
    if(chatBackButton) chatBackButton.addEventListener('click', showChatList);
    
    const chatSendButton = document.getElementById('chat-send-btn');
    if(chatSendButton) chatSendButton.addEventListener('click', handleSendMessage);
    
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    if(chatInput) chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }});
}

function handleLoginClick(e: Event) {
    e.preventDefault();
    const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
    const loginError = document.getElementById('login-error');
    
    if (!phoneInput) return;
    
    const phone = phoneInput.value.replace(/\D/g, '');
    console.log("Attempting login with:", phone);

    if (!phone) {
        if(loginError) loginError.textContent = 'Please enter a number';
        triggerErrorShake();
        return;
    }

    // Direct login for known numbers or 1234
    if (mockUsers[phone]) {
        loginSuccess(phone);
    } else {
        if(loginError) loginError.textContent = 'Number not found. Try 1234.';
        triggerErrorShake();
    }
}

function loginSuccess(phone: string, silent = false) {
    const userAuthData = mockUsers[phone];
    if (!userAuthData) return; // Should catch earlier, but safe guard

    currentChurchId = userAuthData.churchId;
    churchData = mockDatabase[currentChurchId];
    if (!churchData) return;

    const loggedInUser = churchData.members.find((m: any) => m.id === userAuthData.userId);
    currentUser = loggedInUser || { id: userAuthData.userId, name: userAuthData.name };

    // Save Session
    localStorage.setItem('churchAppSession', JSON.stringify({ phone, userId: currentUser.id, churchId: currentChurchId }));

    // Update Admin Button
    const dropdownAdminBtn = document.getElementById('dropdown-admin-btn');
    if(dropdownAdminBtn) dropdownAdminBtn.style.display = currentUser.isAdmin ? 'block' : 'none';

    // HIDE OVERLAY STRICTLY
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
        loginOverlay.classList.remove('active');
        loginOverlay.classList.add('hidden'); // CSS class with !important
        loginOverlay.style.display = 'none'; // Inline style backup
    }

    if (!silent) {
        // Optional welcome feedback
        console.log("Login successful for", currentUser.name);
    }

    initializeForChurch();
}

function showLogin(message?: string) {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
        loginOverlay.classList.remove('hidden');
        loginOverlay.classList.add('active');
        loginOverlay.style.display = 'flex'; // Restore flex
    }
    const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
    if(phoneInput) phoneInput.value = '';
    const loginError = document.getElementById('login-error');
    if(loginError) loginError.textContent = message || '';
}

function logout() {
    localStorage.removeItem('churchAppSession');
    currentChurchId = null;
    churchData = null;
    currentUser = { id: null, name: null };
    document.getElementById('more-menu-dropdown')?.classList.add('hidden');
    showLogin();
}

function triggerErrorShake() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.remove('shake'); // reset
        void loginModal.offsetWidth; // trigger reflow
        loginModal.classList.add('shake');
    }
}

function showContent(targetId: string) {
    if (!currentChurchId) return;

    const headerTitle = document.getElementById('header-title');
    if(headerTitle) {
        headerTitle.textContent = (targetId === 'welcome' ? churchData.name : titles[targetId]) || 'Welcome';
        headerTitle.classList.remove('is-group');
    }

    document.querySelectorAll('.content-section').forEach(section => section.classList.toggle('active', section.id === targetId));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('data-target') === targetId));

    if (targetId === 'chat') showChatList();
    if (targetId === 'live') setupLiveService();
    else {
        const iframe = document.getElementById('video-player') as HTMLIFrameElement;
        if(iframe) iframe.src = '';
    }
    if (targetId === 'bible') setupBiblePage();
}

function initializeForChurch() {
    if (!currentChurchId || !churchData) return;
    
    const welcomeChurchName = document.getElementById('welcome-church-name');
    const welcomeMessage = document.getElementById('welcome-message');
    if(welcomeChurchName) welcomeChurchName.textContent = `Welcome to ${churchData.name}!`;
    if(welcomeMessage) welcomeMessage.textContent = churchData.welcomeMessage;

    setupPrayerWall(); 
    setupNews(); 
    setupChatList();
    showContent('welcome');
    
    if(unreadNotifications === 0) {
        notifications = []; // Clear old mock notifications on re-login
        addNotification(`Welcome to ${churchData.name}!`, 'system');
    }
}

// --- NOTIFICATIONS ---
function addNotification(message: string, type: string) {
    notifications.unshift({ message, type, timestamp: new Date() });
    unreadNotifications++;
    const badge = document.getElementById('notification-badge');
    if(badge) badge.classList.toggle('hidden', unreadNotifications <= 0);
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    if (!list) return;
    list.innerHTML = notifications.length === 0 
        ? `<li class="notification-item">No new notifications.</li>`
        : notifications.map(notif => `
            <li class="notification-item"><p>${notif.message}</p><small>${notif.timestamp.toLocaleString()}</small></li>
        `).join('');
    unreadNotifications = 0;
    const badge = document.getElementById('notification-badge');
    if(badge) badge.classList.add('hidden');
}

// --- LIVE SERVICE ---
function setupLiveService() {
    const list = document.getElementById('sermon-list');
    if(!list || !churchData) return;
    list.innerHTML = '';
    churchData.sermons.forEach((sermon: any) => {
        const li = document.createElement('li');
        li.className = 'sermon-list-item';
        li.dataset.videoId = sermon.videoId;
        li.innerHTML = `<div class="sermon-title">${sermon.title}</div><div class="sermon-meta">${sermon.speaker} - ${sermon.date}</div>`;
        li.onclick = () => loadVideo(sermon.videoId);
        list.appendChild(li);
    });
    // Load active
    const iframe = document.getElementById('video-player') as HTMLIFrameElement;
    if(iframe && !iframe.src.includes('youtube')) loadVideo(churchData.liveServiceVideoId);
}

function loadVideo(videoId: string) {
    const iframe = document.getElementById('video-player') as HTMLIFrameElement;
    if(iframe) iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    document.querySelectorAll('.sermon-list-item').forEach(el => {
        (el as HTMLElement).classList.toggle('active', (el as HTMLElement).dataset.videoId === videoId);
    });
}

// --- PRAYER ---
function setupPrayerWall() {
    const list = document.getElementById('prayer-list');
    if(!list || !churchData) return;
    list.innerHTML = '';
    churchData.prayers.forEach((prayer: any) => addPrayerToDOM(prayer));
    
    // Re-attach form listener inside setup to avoid duplicates if called multiple times? 
    // Better to rely on setupEventListeners once. Form is static.
}

function addPrayerToDOM(prayer: any) {
    const list = document.getElementById('prayer-list');
    if (!list) return;
    const card = document.createElement('div');
    card.className = 'prayer-card';
    const user = churchData.members.find((m:any) => m.id === prayer.postedBy) || { name: 'Unknown', avatarColor: '#ccc' };
    
    card.innerHTML = `
        <div class="prayer-card-header">
            <div class="prayer-card-avatar" style="background-color: ${user.avatarColor};">${user.name.charAt(0).toUpperCase()}</div>
            <div class="prayer-card-userinfo"><span class="prayer-card-username">${user.name}</span><span class="prayer-card-time">${new Date(prayer.timestamp).toLocaleDateString()}</span></div>
        </div>
        <div class="prayer-card-content">
            <h3>${prayer.title}</h3>
            <p>${prayer.text}</p>
        </div>
        <div class="prayer-card-actions">
            <button class="action-btn prayed-btn">🙏 <span class="prayed-count">${prayer.prayedCount}</span></button>
        </div>
    `;
    
    card.querySelector('.prayed-btn')?.addEventListener('click', function(this: HTMLButtonElement) {
        const count = this.querySelector('.prayed-count') as HTMLElement;
        if(!this.classList.contains('prayed')) {
            count.textContent = (parseInt(count.textContent||'0') + 1).toString();
            this.classList.add('prayed');
        }
    });
    list.appendChild(card);
}

// --- NEWS ---
function setupNews() {
    const list = document.getElementById('news-list');
    if(!list || !churchData) return;
    list.innerHTML = '';
    churchData.news.forEach((item: any) => {
        const d = document.createElement('div');
        d.className = 'news-card';
        d.innerHTML = `<h3>${item.title}</h3><p>${item.text}</p><span class="news-date">${item.date}</span>`;
        list.appendChild(d);
    });
}

// --- BIBLE ---
function setupBiblePage() {
    const container = document.getElementById('bible-reading-plan');
    if(!container || container.children.length > 0) return;
    
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86400000);

    for(let i=1; i<=365; i++) {
        const div = document.createElement('div');
        div.className = 'reading-plan-item' + (i === dayOfYear ? ' today' : '');
        div.textContent = `Day ${i}`;
        div.onclick = () => alert(`Day ${i} Reading content would appear here.`);
        container.appendChild(div);
        if(i===dayOfYear) setTimeout(()=>div.scrollIntoView({block:'center'}), 100);
    }
    const dateEl = document.getElementById('daily-life-date');
    if(dateEl) dateEl.textContent = today.toLocaleDateString();
}

// --- CHAT ---
function setupChatList() {
    const container = document.getElementById('chat-list-container');
    if(!container || !churchData) return;
    container.innerHTML = '';
    churchData.chats.forEach((chat: any) => {
        const el = document.createElement('div');
        el.className = 'chat-list-item';
        const name = chat.type === 'direct' 
            ? (churchData.members.find((m:any) => m.id === chat.members.find((mid:string) => mid !== currentUser.id))?.name || 'User') 
            : chat.name;
        el.innerHTML = `<div class="chat-avatar" style="background-color: ${chat.avatarColor};">${name.charAt(0)}</div>
                        <div class="chat-list-details"><div class="chat-list-title">${name}</div><div class="chat-list-preview">${chat.preview}</div></div>`;
        el.onclick = () => showChatDetail(chat, name);
        container.appendChild(el);
    });
}

function showChatDetail(chat: any, name: string) {
    currentChat = chat;
    document.querySelectorAll('.active').forEach(e => e.classList.remove('active'));
    document.getElementById('chat-detail-view')?.classList.add('active');
    
    const title = document.getElementById('chat-detail-title');
    if(title) title.textContent = name;
    
    const msgs = document.querySelector('.chat-messages') as HTMLElement;
    if(msgs) {
        msgs.innerHTML = '';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble other';
        bubble.textContent = `Welcome to ${name} chat!`;
        msgs.appendChild(bubble);
    }
}

function showChatList() {
    document.querySelectorAll('.active').forEach(e => e.classList.remove('active'));
    document.getElementById('chat')?.classList.add('active'); // Chat Section
    document.getElementById('chat-list-view')?.classList.add('active'); // List view
    const header = document.getElementById('header-title');
    if(header) header.textContent = titles['chat'];
}

function handleSendMessage() {
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    const text = input?.value.trim();
    if(!text) return;
    
    const msgs = document.querySelector('.chat-messages');
    if(msgs) {
        const b = document.createElement('div');
        b.className = 'message-bubble me';
        b.textContent = text;
        msgs.appendChild(b);
        msgs.scrollTop = msgs.scrollHeight;
    }
    input.value = '';
}

function setupAdminPanel() {
    const list = document.getElementById('admin-members-list');
    if(list && churchData) {
        list.innerHTML = '';
        churchData.members.forEach((m:any) => {
            const li = document.createElement('li');
            li.className = 'admin-list-item';
            li.innerHTML = `<p>${m.name}</p><button class="admin-delete-btn">Remove</button>`;
            list.appendChild(li);
        });
    }
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed: ', err));
    });
}
