document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    const savedSem = localStorage.getItem('selectedSemester') || 'first-semister';
    window.currentSemester = savedSem;

    // Update UI for saved semester
    updateSemesterUI(savedSem);

    // Load Data
    loadHomeData();
    loadResources(savedSem);
    loadTrendingResources(savedSem);
    loadNotices(savedSem);
    loadBlogs(savedSem);
    loadMoments();
    loadHallOfFame();
    loadVoices();
    loadFAQ();
});

// ... (navigation)

// Data Fetching: Voices
async function loadVoices() {
    const container = document.querySelector('.voices-scroll');
    if (!container) return;

    try {
        const response = await fetch(`data/site-data/voices.json?t=${Date.now()}`);
        const voices = await response.json();

        container.innerHTML = voices.map(v => `
            <div class="voice-card-mobile">
                <p>"${v.quote.substring(0, 100)}..."</p>
                <div class="voice-user">
                    <img src="${v.avatar}" alt="${v.name}">
                    <span>${v.name}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Voices load failed", e);
    }
}

// Data Fetching: FAQ
async function loadFAQ() {
    const container = document.querySelector('.mobile-faq-container');
    if (!container) return;

    try {
        const response = await fetch(`data/site-data/faq.json?t=${Date.now()}`);
        const faqs = await response.json();

        container.innerHTML = faqs.map(q => `
            <div class="mobile-faq-item" onclick="toggleMobileFaq(this)">
                <div class="question">
                     <span>${q.question}</span>
                     <i class="fas fa-chevron-down"></i>
                </div>
                <div class="answer">
                     <p>${q.answer}</p>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("FAQ load failed", e);
    }
}

// ... (Existing navigation logic remains same)

// Data Fetching: Trending Resources
async function loadTrendingResources(sem) {
    const container = document.getElementById('trending-resources-list');
    if (!container) return;

    try {
        const response = await fetch(`data/${sem}/resources.json?t=${Date.now()}`);
        const data = await response.json();

        // Flatten files from all subjects to simulate "trending"
        let allFiles = [];
        data.forEach(sub => {
            if (sub.files) {
                sub.files.forEach(f => allFiles.push({ ...f, subject: sub.subject }));
            }
        });

        // Take top 3
        const trending = allFiles.slice(0, 3);

        container.innerHTML = trending.map(file => `
            <div class="resource-card-modern">
                <div class="res-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="res-info">
                    <h4>${file.title}</h4>
                    <p>${file.subject}</p>
                </div>
                <button class="btn-download"><i class="fas fa-download"></i></button>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p class="text-muted" style="font-size:0.8rem; text-align:center;">No trending resources.</p>';
    }
}

// Data Fetching: Moments
async function loadMoments() {
    const container = document.getElementById('mobile-moments-slider');
    if (!container) return;

    try {
        const response = await fetch(`data/site-data/moments.json?t=${Date.now()}`);
        const moments = await response.json();

        // Sort by date desc
        moments.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = moments.map(m => `
            <div class="moment-card-mini" style="background-image: url('${m.imageUrls ? m.imageUrls[0] : 'graphics/placeholder.jpg'}');">
                <div class="caption">${m.title}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Moments load failed", e);
        container.innerHTML = '';
    }
}

// Data Fetching: Hall of Fame
async function loadHallOfFame() {
    const contContainer = document.getElementById('mobile-contributors');
    const donContainer = document.getElementById('mobile-donators');
    if (!contContainer || !donContainer) return;

    try {
        const response = await fetch(`data/site-data/hall-of-fame.json?t=${Date.now()}`);
        const data = await response.json();

        // Contributors
        if (data.contributors) {
            contContainer.innerHTML = data.contributors.map(c => `
                <div class="avatar-item">
                    <img src="${c.image}" alt="${c.name}">
                    <span>${c.name}</span>
                </div>
            `).join('');
        }

        // Donators
        if (data.donators) {
            donContainer.innerHTML = data.donators.map(d => `
                <div class="avatar-item">
                    <img src="${d.image}" alt="${d.name}" class="donator-img">
                    <span>${d.name}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("HOF load failed", e);
    }
}

// FAQ Toggle
window.toggleMobileFaq = function (el) {
    el.classList.toggle('active');
};

function loadHomeData() {
    // Mock user stats
    document.querySelectorAll('.stat-val')[1].textContent = Math.floor(Math.random() * 100);
}

window.showUploadModal = function () {
    alert("Upload feature coming soon!");
}

// Navigation Logic
window.switchView = function (viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show target view
    document.getElementById(`view-${viewId}`).classList.add('active');

    // Update Bottom Nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.target === viewId) {
            nav.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo(0, 0);
};

// Semester Logic
window.setSemester = function (sem, element) {
    window.currentSemester = sem;
    localStorage.setItem('selectedSemester', sem);

    // Update UI
    document.querySelectorAll('.radio-option').forEach(opt => {
        opt.classList.remove('active');
        opt.querySelector('i').className = 'fas fa-circle';
    });
    element.classList.add('active');
    element.querySelector('i').className = 'fas fa-check-circle';

    updateSemesterUI(sem);

    // Reload Data
    loadResources(sem);
    loadNotices(sem);
    loadBlogs(sem);

    // Toast
    alert(`Switched to ${sem === 'first-semister' ? '1st' : '2nd'} Semester`);
};

function updateSemesterUI(sem) {
    const text = sem === 'first-semister' ? 'First Semester' : 'Second Semester';
    const pills = document.querySelectorAll('.semester-pill');
    if (pills) pills.forEach(p => p.textContent = text);
}

// Data Fetching: Notices
async function loadNotices(sem) {
    const container = document.getElementById('notices-list-full');
    const homeContainer = document.getElementById('home-notices-list');

    if (!container) return;

    try {
        const response = await fetch(`data/${sem}/notices.json?t=${Date.now()}`);
        const notices = await response.json();

        // Populate Full List
        container.innerHTML = notices.map(n => `
            <div class="notice-card-mini" style="width: 100%;">
                <span class="date"><i class="far fa-clock"></i> ${n.date}</span>
                <h4>${n.title}</h4>
                <p style="font-size: 0.85rem; color: #a0a0b0;">${n.content.substring(0, 80)}...</p>
            </div>
        `).join('');

        // Populate Home Preview (Top 5)
        if (homeContainer) {
            homeContainer.innerHTML = notices.slice(0, 5).map(n => `
                <div class="notice-card-mini">
                    <span class="date">${n.date}</span>
                    <h4>${n.title}</h4>
                </div>
            `).join('');
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-center">Failed to load notices.</p>';
    }
}

// Data Fetching: Resources
async function loadResources(sem) {
    const container = document.getElementById('resources-list');
    if (!container) return;

    try {
        const response = await fetch(`data/${sem}/resources.json?t=${Date.now()}`);
        const resources = await response.json();

        // Group by subject
        container.innerHTML = resources.map(subject => `
            <div class="resource-card-modern" onclick="alert('Opening ${subject.subject}...')">
                <div class="res-icon" style="background: rgba(0, 242, 255, 0.1); color: var(--primary);">
                    <i class="fas fa-book"></i>
                </div>
                <div class="res-info">
                    <h4>${subject.subject}</h4>
                    <p>${subject.code || 'Subject Code'}</p>
                </div>
                <button class="btn-download"><i class="fas fa-chevron-right"></i></button>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p class="text-center">Failed to load resources.</p>';
    }
}

// Data Fetching: Blogs
async function loadBlogs(sem) {
    const container = document.getElementById('blogs-list');
    if (!container) return;

    if (sem === 'first-semister') {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #a0a0b0;">
                <i class="fas fa-rocket" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Features coming in 2nd Semester</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`data/${sem}/blogs.json?t=${Date.now()}`);
        const blogs = await response.json();

        container.innerHTML = blogs.map(b => `
            <div class="resource-card-modern" style="align-items: flex-start;">
                <div class="res-icon" style="background: rgba(112, 0, 255, 0.1); color: var(--secondary);">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="res-info">
                    <h4>${b.topic}</h4>
                    <p style="font-size: 0.8rem; margin-bottom: 0.5rem;">${b.date} • ${b.className}</p>
                    <p style="font-size: 0.85rem; color: #ccc;">${b.content.replace(/<[^>]*>?/gm, '').substring(0, 60)}...</p>
                </div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p>No blogs found.</p>';
    }
}

function loadHomeData() {
    // Mock user stats
    document.querySelectorAll('.stat-val')[1].textContent = Math.floor(Math.random() * 100);
}

window.showUploadModal = function () {
    alert("Upload feature coming soon!");
}
