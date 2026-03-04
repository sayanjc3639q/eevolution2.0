// App state
let currentData = null;
let loggedInUser = null;
let selectedSubject = null;
let selectedChapter = null;
let activeSubTabs = {
    study: 'modules',
    updates: 'notices',
    points: 'mar',
    community: 'batchFeed',
    support: 'donate'
};

// PERSISTENCE: Track scroll positions for nested navigation
let studyScrollPositions = {
    subjects: 0,
    chapters: 0
};

/* ================= GLOBAL SEARCH ENGINE ================= */

const SEARCHABLE_FEATURES = [
    { title: 'Modules', target: 'study', sub: 'modules', icon: 'ph-book-open', desc: 'Theory & Syllabus' },
    { title: 'Evo Digest', target: 'study', sub: 'digest', icon: 'ph-article', desc: 'Shortened notes & guides' },
    { title: 'Lab Notes', target: 'study', sub: 'labs', icon: 'ph-test-tube', desc: 'Practical & Lab manuals' },
    { title: 'Resources', target: 'study', sub: 'resources', icon: 'ph-folders', desc: 'Question papers & books' },
    { title: 'Notices', target: 'updates', sub: 'notices', icon: 'ph-bell', desc: 'Latest announcements' },
    { title: 'Events', target: 'updates', sub: 'events', icon: 'ph-calendar-star', desc: 'Upcoming college events' },
    { title: 'Class Routine', target: 'updates', sub: 'routine', icon: 'ph-clock', desc: 'Daily lecture schedule' },
    { title: 'Exams', target: 'updates', sub: 'exams', icon: 'ph-file-text', desc: 'Exam dates & seating' },
    { title: 'MAR Points', target: 'points', sub: 'mar', icon: 'ph-star', desc: 'Track your MAR activities' },
    { title: 'MOOCs', target: 'points', sub: 'moocs', icon: 'ph-graduation-cap', desc: 'Online certification courses' },
    { title: 'Batch Feed', target: 'community', sub: 'batchFeed', icon: 'ph-chat-circle-dots', desc: 'Social community updates' },
    { title: 'Memories', target: 'community', sub: 'memories', icon: 'ph-images', desc: 'Photos & gallery' },
    { title: 'Upload Documents', target: 'community', sub: 'upload', icon: 'ph-upload-simple', desc: 'Contribute notes to the community' },
    { title: 'Contributors', target: 'community', sub: 'contributors', icon: 'ph-users-three', desc: 'Our document uploaders' },
    { title: 'Donations', target: 'support', sub: 'donate', icon: 'ph-heart', desc: 'Contribute to the project' },
    { title: 'Profile Settings', target: 'profile', sub: null, icon: 'ph-user-gear', desc: 'Account & appearance' }
];

function setupSearch() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('search-results-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        const featureResults = SEARCHABLE_FEATURES.filter(f =>
            f.title.toLowerCase().includes(query) || f.desc.toLowerCase().includes(query)
        );

        let docResults = [];
        if (currentData && currentData.studyMaterials) {
            docResults = currentData.studyMaterials.filter(m =>
                m.name.toLowerCase().includes(query) || (m.chapter && m.chapter.toLowerCase().includes(query))
            ).slice(0, 10);
        }

        renderSearchResults(featureResults, docResults);
    });

    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2) dropdown.classList.add('active');
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function renderSearchResults(features, docs) {
    const dropdown = document.getElementById('search-results-dropdown');
    if (features.length === 0 && docs.length === 0) {
        dropdown.innerHTML = `
            <div class="search-empty-state">
                <i class="ph ph-bird"></i>
                <span>No Results Found</span>
                <p>We couldn't find anything matching your search. Try a different keyword!</p>
            </div>
        `;
    } else {
        let html = '';

        if (features.length > 0) {
            html += '<div class="search-section-label">Features & Sections</div>';
            features.forEach((f, idx) => {
                const fIndex = SEARCHABLE_FEATURES.indexOf(f);
                html += `
                    <div class="search-result-item" onclick="handleSearchAction('feature', ${fIndex})">
                        <div class="search-result-icon"><i class="ph ${f.icon}"></i></div>
                        <div class="search-result-info">
                            <span class="search-result-title">${f.title}</span>
                            <span class="search-result-subtitle">${f.desc}</span>
                        </div>
                    </div>
                `;
            });
        }

        if (docs.length > 0) {
            html += '<div class="search-section-label">Study Documents</div>';
            docs.forEach(d => {
                const nameEsc = d.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const docLink = d.link.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                html += `
                    <div class="search-result-item" onclick="handleSearchAction('doc', '${nameEsc}', '${docLink}')">
                        <div class="search-result-icon"><i class="ph ph-file-pdf"></i></div>
                        <div class="search-result-info">
                            <span class="search-result-title">${escapeHTML(d.name)}</span>
                            <span class="search-result-subtitle">${d.chapter || 'Material'} • ${d.category}</span>
                        </div>
                    </div>
                `;
            });
        }

        dropdown.innerHTML = html;
    }
    dropdown.classList.add('active');
}

window.toggleMobileSearch = function (show) {
    const searchCenter = document.querySelector('.header-center');
    const input = document.getElementById('global-search-input');
    if (!searchCenter || !input) return;

    if (show) {
        searchCenter.classList.add('active');
        setTimeout(() => input.focus(), 100);
    } else {
        searchCenter.classList.remove('active');
        input.value = '';
        const dropdown = document.getElementById('search-results-dropdown');
        if (dropdown) dropdown.classList.remove('active');
    }
};

window.handleSearchAction = function (type, p1, p2) {
    const dropdown = document.getElementById('search-results-dropdown');
    const input = document.getElementById('global-search-input');
    if (dropdown) dropdown.classList.remove('active');
    if (input) input.value = '';

    // Close mobile search if active
    if (window.innerWidth <= 600) {
        window.toggleMobileSearch(false);
    }

    if (type === 'feature') {
        const feature = SEARCHABLE_FEATURES[p1];
        if (feature) {
            if (feature.sub) activeSubTabs[feature.target] = feature.sub;
            navigateTo(feature.target);
        }
    } else if (type === 'doc') {
        if (typeof openPdfModal === 'function') openPdfModal(p1, p2);
    }
}

/**
 * HELPER: Automatic Retry for Database Operations
 * Attempts to run an async function up to 'maxAttempts' times with a delay.
 */
window.callWithRetry = async function (operation, maxAttempts = 3, delay = 2000) {
    let lastError;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`, err);
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};

function formatFullDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentData = await fetchJSONData();
        initializeApp();
    } catch (error) {
        console.error('Failed to load data', error);
    }
});

async function initializeApp() {
    setupNavigation();
    setupInteractions();

    await renderHomeData();
    renderStudySection();
    renderUpdates(activeSubTabs.updates);
    renderDonationProgress();

    // Initial state setup for history API with Deep Linking support
    const hash = window.location.hash.substring(1);
    const parts = hash.split('/');

    if (parts[0] === 'study' && parts.length >= 4) {
        const category = parts[1];
        const subjectId = parts[2];
        const chapterName = decodeURIComponent(parts[3]);
        const docName = parts[4] ? decodeURIComponent(parts[4]) : null;

        activeSubTabs.study = category;
        selectedSubject = subjectId;
        selectedChapter = chapterName;

        navigateTo('study', true);

        // Wait for data to be ready before searching
        if (docName) {
            const checkData = setInterval(() => {
                if (currentData && currentData.studyMaterials) {
                    clearInterval(checkData);
                    const item = currentData.studyMaterials.find(m =>
                        m.category === category &&
                        m.subjectId === subjectId &&
                        (m.chapter || 'Uncategorized') === chapterName &&
                        m.name === docName
                    );
                    if (item) setTimeout(() => openPdfModal(item.name, item.link), 500);
                }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkData), 5000);
        }
    } else if (history.state && history.state.section) {
        const section = history.state.section;
        if (history.state.sub) {
            activeSubTabs[section] = history.state.sub;
        }
        navigateTo(section, true);
    } else if (hash) {
        const section = parts[0];
        const sub = parts[1] || null;
        if (sub) activeSubTabs[section] = sub;
        navigateTo(section, true);
    } else {
        navigateTo('home', true);
    }

    // Refresh schedule timer and greeting every 60 seconds (local update, NO Supabase hits)
    setInterval(() => {
        const homeSection = document.getElementById('section-home');
        if (homeSection && !homeSection.classList.contains('hidden')) {
            if (typeof renderLiveSchedule === 'function') renderLiveSchedule();

            // Periodically refresh greeting (it only updates UI if the "greeting day" changes)
            if (window.displayUserGreeting && window.currentProfile) {
                window.displayUserGreeting(window.currentProfile);
            }
        }
    }, 60000);

    // Clear safety timeout as init success
    if (window.preloaderTimeout) clearTimeout(window.preloaderTimeout);

    // Fade out preloader after init
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => preloader.remove(), 600);
    }
}


// Popstate listener to handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
        if (event.state.sub) {
            activeSubTabs[event.state.section] = event.state.sub;
        }

        // Restore study hierarchy from history state
        if (event.state.section === 'study') {
            selectedSubject = event.state.subject || null;
            selectedChapter = event.state.chapter || null;
        } else {
            selectedSubject = null;
            selectedChapter = null;
        }

        navigateTo(event.state.section, true);

        // Ensure UI navigation reflects the back navigation
        const navTarget = document.querySelector(`.nav-links a[data-target="${event.state.section}"]`);
        if (navTarget) {
            updateActiveNav(navTarget);

            // Re-open dropdown if it was a sub-item
            if (event.state.sub) {
                const dropdown = navTarget.closest('.dropdown');
                if (dropdown) dropdown.classList.add('expanded');
            }
        }
    } else {
        selectedSubject = null;
        selectedChapter = null;
        navigateTo('home', true);
    }
});

/* ================= NAVIGATION ================= */

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links > li > a');
    const subLinks = document.querySelectorAll('.submenu > li > a');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Main category dropdown behavior
            if (link.parentElement.classList.contains('dropdown')) {
                e.preventDefault();
                const isExpanded = link.parentElement.classList.contains('expanded');
                document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('expanded'));
                if (!isExpanded) link.parentElement.classList.add('expanded');
                return;
            }

            e.preventDefault();
            const target = link.getAttribute('data-target');
            activeSubTabs[target] = null; // Clear sub-tab if navigating to main target directly
            navigateTo(target);
            updateActiveNav(link);
            document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('expanded'));
            if (window.innerWidth <= 900) toggleSidebar();
        });
    });

    subLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            const sub = link.getAttribute('data-sub');

            // Update sub-tab state
            activeSubTabs[target] = sub;

            navigateTo(target);
            updateActiveNav(link.closest('.dropdown').querySelector('a'));

            // Trigger specific re-renders
            if (target === 'study') {
                selectedSubject = null;
                renderStudySection();
            } else if (target === 'updates') {
                renderUpdates(sub);
            } else {
                renderGenericTabPanes(target, sub);
            }

            if (window.innerWidth <= 900) toggleSidebar();
        });
    });
}

function updateActiveNav(activeElement) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    activeElement.classList.add('active');
}

const subTitleMap = {
    'modules': 'Modules', 'digest': 'Evo Digest', 'labs': 'Lab Notes', 'resources': 'Resources',
    'notices': 'Notices', 'events': 'Events', 'routine': 'Class Routine', 'holidays': 'Holidays', 'exams': 'Exam Schedule',
    'mar': 'MAR Points', 'moocs': 'MOOCs Points',
    'batchFeed': 'Batch Feed', 'memories': 'Memories', 'upload': 'Upload Docs', 'contributors': 'Contributors',
    'donate': 'Donations', 'donators': 'Donators List'
};

// Sub-header Taglines
const subTaglineMap = {
    'modules': 'Theory syllabuses and module guides',
    'digest': 'Exam-ready summaries and short notes',
    'labs': 'Lab manuals and experiment records',
    'resources': 'Handwritten notes and digital books',
    'notices': 'Latest department and college announcements',
    'events': 'Workshops, seminars and batch gatherings',
    'routine': 'Daily class schedules and lecture times',
    'holidays': 'Upcoming college and unofficial breaks',
    'exams': 'Internal and end-semester examination dates',
    'mar': 'Track and manage your activity points',
    'moocs': 'Online courses for academic credits',
    'batchFeed': 'Real-time updates from your batch mates',
    'memories': 'Relive the best moments of our college life',
    'upload': 'Contribute study materials to the hub',
    'contributors': 'Our dedicated community document uploaders',
    'donate': 'Support the development and hosting of EEvolution',
    'donators': 'Honoring the students who support us financially'
};

function navigateTo(sectionId, isPopState = false) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    const targetSec = document.getElementById(`section-${sectionId}`);
    if (targetSec) targetSec.classList.add('active');

    const titleMap = {
        'home': 'Home', 'study': 'Study Materials', 'updates': 'Live Updates',
        'points': 'Points & Credits', 'community': 'Community',
        'support': 'Support Us', 'about': 'About Us', 'profile': 'Profile Settings'
    };
    document.getElementById('page-title').innerText = titleMap[sectionId] || 'EEvolution 2.0';

    // Update Sub-title
    const sub = activeSubTabs[sectionId];
    const subTitleElement = document.getElementById('sub-page-title');
    if (sectionId === 'home') {
        subTitleElement.innerHTML = '';
    } else if (sectionId === 'profile') {
        subTitleElement.innerHTML = `
            <div class="breadcrumb-root">
                <span class="root-name">User Profile</span>
                <span class="root-tagline">Account settings and preferences</span>
            </div>
        `;
    } else if (sectionId === 'study') {
        updateStudyBreadcrumbs();
    } else if (sub) {
        const subTitle = subTitleMap[sub] || '';
        const tagline = subTaglineMap[sub] || '';
        if (tagline) {
            subTitleElement.innerHTML = `
                <div class="breadcrumb-root">
                    <span class="root-name">${subTitle}</span>
                    <span class="root-tagline">${tagline}</span>
                </div>
            `;
        } else {
            subTitleElement.innerText = subTitle;
        }
    } else {
        subTitleElement.innerText = titleMap[sectionId] || '';
    }

    // If navigating back to a section, ensure its active subpane is shown
    if (sub) {
        if (sectionId === 'study') renderStudySection();
        else if (sectionId === 'updates') renderUpdates(sub);
        else renderGenericTabPanes(sectionId, sub);
    }

    if (!isPopState) {
        let hash = `#${sectionId}`;
        if (sectionId === 'study') {
            const subPart = activeSubTabs.study || 'modules';
            if (selectedSubject && selectedChapter) {
                hash = `#study/${subPart}/${selectedSubject}/${encodeURIComponent(selectedChapter)}`;
            } else if (selectedSubject) {
                hash = `#study/${subPart}/${selectedSubject}`;
            } else {
                hash = `#study/${subPart}`;
            }
        } else if (sub) {
            hash = `#${sectionId}/${sub}`;
        }
        history.pushState({
            section: sectionId,
            sub: sub,
            subject: selectedSubject,
            chapter: selectedChapter
        }, "", hash);
    }

    // Smooth scroll to top for main section changes, except when internal state handles it
    if (sectionId !== 'study' || (!selectedSubject && !selectedChapter)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* ================= CONTENT MGR ================= */

function renderGenericTabPanes(sectionId, subId) {
    const contentContainer = document.getElementById(`${sectionId}-content`);
    if (!contentContainer) return;
    const panes = contentContainer.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
        pane.style.display = pane.id === `${subId}-content` ? 'block' : 'none';
    });

    if (sectionId === 'community') {
        if (subId === 'batchFeed' && window.fetchFeed) {
            window.fetchFeed();
        } else if (subId === 'memories' && window.renderMemories) {
            window.renderMemories();
        } else if (subId === 'contributors') {
            renderContributors();
        }
    } else if (sectionId === 'support') {
        if (subId === 'donators') {
            renderDonators();
        }
    } else if (sectionId === 'points') {
        if (subId === 'moocs') {
            loadMoocsTable();
        }
    }
}

/* ================= STUDY SECTION ================= */

function renderStudySection() {
    const subCategory = activeSubTabs.study;
    const backBtn = document.getElementById('study-back-btn');

    // Update path breadcrumbs whenever study section renders
    updateStudyBreadcrumbs();

    if (selectedChapter) {
        backBtn.classList.remove('hidden');
        backBtn.querySelector('button').innerHTML = `<i class="ph ph-arrow-left"></i> Back to Chapters`;
        backBtn.querySelector('button').setAttribute('onclick', 'studyGoBack()');
        renderMaterialCards(subCategory, selectedSubject, selectedChapter);
    } else if (selectedSubject) {
        backBtn.classList.remove('hidden');
        backBtn.querySelector('button').innerHTML = `<i class="ph ph-arrow-left"></i> Back to Subjects`;
        backBtn.querySelector('button').setAttribute('onclick', 'studyGoBack()');
        renderChapterCards(subCategory, selectedSubject);
    } else {
        backBtn.classList.add('hidden');
        renderSubjectCards(subCategory);
    }
}

function updateStudyBreadcrumbs() {
    const subId = activeSubTabs.study;
    const subTitle = subTitleMap[subId] || 'Modules';
    const subTitleElement = document.getElementById('sub-page-title');
    if (!subTitleElement) return;

    if (!selectedSubject) {
        // Flat view: Show name and a single line tagline
        const tagline = subTaglineMap[subId] || 'Access study materials';
        subTitleElement.innerHTML = `
            <div class="breadcrumb-root">
                <span class="root-name">${subTitle}</span>
                <span class="root-tagline">${tagline}</span>
            </div>
        `;
        return;
    }

    let breadcrumbHTML = `<span title="${subTitle}">${subTitle}</span>`;

    if (selectedSubject) {
        let subjectName = selectedSubject;
        if (currentData) {
            const allSubs = [
                ...(currentData.subjects.theory || []),
                ...(currentData.subjects.lab || [])
            ];
            const found = allSubs.find(s => s.id === selectedSubject);
            if (found) subjectName = found.name;
        }
        breadcrumbHTML += ` <i class="ph ph-caret-right"></i> <span title="${subjectName}">${subjectName}</span>`;
    }

    if (selectedChapter) {
        breadcrumbHTML += ` <i class="ph ph-caret-right"></i> <span title="${selectedChapter}">${selectedChapter}</span>`;
    }

    subTitleElement.innerHTML = `<div class="breadcrumbs">${breadcrumbHTML}</div>`;
}

function renderSubjectCards(category) {
    const container = document.getElementById('study-content');
    if (!currentData) return;

    let subList = [];
    if (category === 'labs') {
        subList = currentData.subjects.lab;
    } else if (category === 'digest') {
        subList = [...currentData.subjects.theory, ...currentData.subjects.lab];
    } else {
        subList = currentData.subjects.theory;
    }

    container.innerHTML = subList.map(s => `
    <div class="subject-card" onclick="selectSubject('${s.id}')">
      <div class="card-icon-box">
        <i class="ph ${s.icon}"></i>
      </div>
      <div class="card-info">
        <h3>${s.name}</h3>
        <p class="text-muted">Click to view documents</p>
      </div>
    </div>
  `).join('');
}

function selectSubject(id) {
    // Save scroll position of the subject list
    studyScrollPositions.subjects = window.scrollY;
    selectedSubject = id;
    selectedChapter = null;
    navigateTo('study'); // Use navigateTo to push state
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function selectChapter(chapterName) {
    // Save scroll position of the chapter list
    studyScrollPositions.chapters = window.scrollY;
    selectedChapter = chapterName;
    navigateTo('study'); // Use navigateTo to push state
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function studyGoBack() {
    let targetScroll = 0;
    if (selectedChapter) {
        selectedChapter = null;
        targetScroll = studyScrollPositions.chapters;
    } else {
        selectedSubject = null;
        targetScroll = studyScrollPositions.subjects;
    }

    renderStudySection();

    // Restore scroll position after rendering
    setTimeout(() => {
        window.scrollTo({
            top: targetScroll,
            behavior: 'instant'
        });
    }, 10);
}

function backToSubjects() { studyGoBack(); }

function renderChapterCards(category, subjectId) {
    const container = document.getElementById('study-content');
    if (!currentData || !currentData.studyMaterials) return;

    // Filter items for this subject/category and extract unique chapters
    const items = currentData.studyMaterials.filter(m => m.category === category && m.subjectId === subjectId);

    // Get unique chapters, filter out undefined/empty
    const chapters = [...new Set(items.map(m => m.chapter || 'Uncategorized'))];

    if (chapters.length === 0) {
        container.innerHTML = '<div class="empty-state">No chapters found for this subject.</div>';
        return;
    }

    container.innerHTML = chapters.map(ch => `
    <div class="subject-card chapter-card" onclick="selectChapter('${ch.replace(/'/g, "\\'")}')">
      <div class="card-icon-box">
        <i class="ph ph-folder-open"></i>
      </div>
      <div class="card-info">
        <h3>${ch}</h3>
        <p class="text-muted">${items.filter(m => (m.chapter || 'Uncategorized') === ch).length} Documents</p>
      </div>
    </div>
  `).join('');
}

function renderMaterialCards(category, subjectId, chapterName) {
    const container = document.getElementById('study-content');
    if (!currentData || !currentData.studyMaterials) return;

    // Ensure inputs are strings
    const safeChapter = chapterName || 'Uncategorized';

    const items = currentData.studyMaterials.filter(m =>
        m.category === category &&
        m.subjectId === subjectId &&
        (m.chapter || 'Uncategorized') === safeChapter
    );

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">No materials found in this chapter.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        // Safe strings for onclick attributes (manual escaping for simplicity)
        const safeName = item.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeChapterEsc = safeChapter.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        return `
        <div class="file-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <h4 style="margin: 0; line-height: 1.4;">${escapeHTML(item.name)}</h4>
              <button onclick="event.stopPropagation(); shareDocument(this, '${safeName}', '${category}', '${subjectId}', '${safeChapterEsc}')" 
                      style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 10px; display: flex; margin: -10px;" title="Share Link">
                  <i class="ph ph-share-network" style="font-size: 1.25rem;"></i>
              </button>
          </div>
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(item.desc || 'No description available')}</p>
          <div class="file-actions" style="margin-top: 1.5rem;">
             <button onclick="openPdfModal('${safeName}', '${item.link}')" class="btn-outline file-view-btn">View Document <i class="ph ph-eye"></i></button>
          </div>
        </div>
      `;
    }).join('');
}

window.shareDocument = async function (btn, name, category, subjectId, chapterName) {
    try {
        const encodedChapter = encodeURIComponent(chapterName);
        const encodedName = encodeURIComponent(name);

        // Use a more robust URL construction
        const baseUrl = window.location.href.split('#')[0];
        const shareUrl = `${baseUrl}#study/${category}/${subjectId}/${encodedChapter}/${encodedName}`;

        const shareData = {
            title: name,
            text: `View "${name}" on EEvolution 2.0`,
            url: shareUrl
        };

        // Visual feedback on button
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

        // 1. Try Native Web Share (Mobile)
        if (navigator.share && /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)) {
            try {
                await navigator.share(shareData);
                btn.innerHTML = originalIcon;
                return;
            } catch (err) {
                if (err.name === 'AbortError') { btn.innerHTML = originalIcon; return; }
                console.warn('Native share failed, falling back to clipboard', err);
            }
        }

        // 2. Try Clipboard API (Modern Browser)
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                if (showToast) showToast("Link copied to clipboard!", "success");
                else alert("Link copied to clipboard!");
                btn.innerHTML = '<i class="ph ph-check" style="color: #22c55e;"></i>';
                setTimeout(() => btn.innerHTML = originalIcon, 2000);
                return;
            } catch (err) {
                console.warn('Clipboard API failed', err);
            }
        }

        // 3. Last Resort Fallback (Old browsers or insecure context)
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.value = shareUrl;
        dummy.select();
        const success = document.execCommand("copy");
        document.body.removeChild(dummy);

        if (success) {
            if (showToast) showToast("Link copied!", "success");
            btn.innerHTML = '<i class="ph ph-check" style="color: #22c55e;"></i>';
        } else {
            // If even execCommand fails, show the URL in a prompt
            prompt("Copy this link to share:", shareUrl);
            btn.innerHTML = originalIcon;
        }
        setTimeout(() => btn.innerHTML = originalIcon, 2000);

    } catch (err) {
        console.error('Sharing totally failed', err);
        btn.innerHTML = '<i class="ph ph-warning" style="color: #ef4444;"></i>';
        setTimeout(() => btn.innerHTML = originalIcon, 2000);
    }
};

/* ================= OTHER DATA ================= */

async function renderHomeData() {
    if (!currentData) return;

    if (typeof renderLiveSchedule === 'function') renderLiveSchedule();

    // Fetch Top 3 contributors and avatars for donators from Supabase
    let profileMap = {};
    if (window.supabaseClient) {
        // Fetch only Top 3 for home display
        const { data: topContributors } = await supabaseClient
            .from('profiles')
            .select('name, roll_number, upload_count, avatar_url')
            .order('upload_count', { ascending: false })
            .limit(3);

        if (topContributors) {
            document.getElementById('top-contributors').innerHTML = topContributors.map((s, i) => `
                <li><div><span class="primary-text">#${i + 1} ${s.name || 'Anonymous'}</span><span class="secondary-text">${s.roll_number}</span></div><div style="text-align:right"><span class="text-blue"><i class="ph ph-upload"></i> ${s.upload_count || 0}</span></div></li>
            `).join('');

            // See more contributors link
            document.getElementById('top-contributors-footer').innerHTML = `
                <button class="btn-outline btn-small w-100" onclick="activeSubTabs['community'] = 'contributors'; navigateTo('community');">
                    See More Contributors <i class="ph ph-arrow-right"></i>
                </button>
            `;
        }

        // Fetch Top 4 Donators for display
        const donators = [...currentData.donators]
            .filter(d => (parseFloat(d.amount.replace('₹', '')) || 0) > 0)
            .sort((a, b) => {
                const amtA = parseFloat(a.amount.replace('₹', '')) || 0;
                const amtB = parseFloat(b.amount.replace('₹', '')) || 0;
                if (amtB !== amtA) return amtB - amtA;
                return new Date(b.lastDate || b.date) - new Date(a.lastDate || a.date);
            })
            .slice(0, 4);

        // Fetch avatars for these specific donators
        const donatorNames = donators.map(d => d.name);
        const { data: donatorProfiles } = await supabaseClient
            .from('profiles')
            .select('name, avatar_url')
            .in('name', donatorNames);

        if (donatorProfiles) {
            donatorProfiles.forEach(p => {
                if (p.name) profileMap[p.name.toUpperCase()] = p.avatar_url;
            });
        }

        document.getElementById('top-donators').innerHTML = donators.map((d) => {
            const avatarUrl = profileMap[d.name.toUpperCase()];
            const iconHtml = avatarUrl
                ? `<img src="${avatarUrl}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">`
                : `<i class="ph ph-heart text-accent"></i>`;

            return `
                <li>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${iconHtml}
                        <span class="primary-text">${d.name}</span>
                    </div>
                    <div><span class="text-accent">${d.amount}</span></div>
                </li>
            `;
        }).join('');
    }

    // See more donators link
    document.getElementById('top-donators-footer').innerHTML = `
        <button class="btn-outline btn-small w-100" onclick="activeSubTabs['support'] = 'donators'; navigateTo('support');">
            See More Donators <i class="ph ph-hand-heart"></i>
        </button>
    `;

    // Render Reviews
    if (currentData.reviews) {
        document.getElementById('reviews-container').innerHTML = currentData.reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div class="stars">
            ${'<i class="ph-fill ph-star"></i>'.repeat(r.rating)}${'<i class="ph ph-star"></i>'.repeat(5 - r.rating)}
          </div>
        </div>
        <p class="review-text">"${escapeHTML(r.review)}"</p>
        <div class="review-author">
          <strong>${escapeHTML(r.name)}</strong>
          <div>${escapeHTML(r.roll)}</div>
        </div>
      </div>

    `).join('');
    }
}

function renderUpdates(tab) {
    const container = document.getElementById('updates-content');
    if (!currentData || !container) return;
    if (tab === 'notices') {
        const visibleNotices = currentData.notices.filter(n => n.title !== '[SYSTEM_CONFIG_TEST_MODE]');
        container.innerHTML = visibleNotices.map(n => `

      <div class="feed-item notice-item">
        <div class="feed-header">
            <h3>${escapeHTML(n.title)}</h3>
            <span class="date-badge"><i class="ph ph-calendar-blank"></i> ${formatFullDate(n.date)}</span>
        </div>
        <div class="feed-hashtags">${n.hashtags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>

        <p>${escapeHTML(n.content)}</p>
        ${n.img ? `<img src="${n.img}" class="feed-img">` : ''}
        ${n.pdf !== '#' ? `
          <div style="text-align: left; margin-top: 1rem;">
            <button onclick="openPdfModal('${n.title.replace(/'/g, "\\'")}', '${n.pdf}')" class="btn-outline btn-small">
              Read Full PDF <i class="ph ph-file-pdf"></i>
            </button>
          </div>` : ''}
      </div>
    `).join('');
    } else if (tab === 'events') {
        let html = `
        <div class="card event-submission-banner mb-4" style="border: 1px dashed var(--border-color); background: var(--bg-surface); display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 1.5rem;">
            <div style="flex: 1; min-width: 200px;">
                <h4 style="color: var(--electric-blue); font-size: 1.1rem; margin-bottom: 0.25rem;"><i class="ph ph-megaphone"></i> Host an Event?</h4>
                <p class="text-muted" style="font-size: 0.85rem; line-height: 1.4;">Technical workshop or batch gathering? Submit it for review!</p>
            </div>
            <button onclick="openPreFilledForm('event')" class="btn-primary" style="white-space: nowrap; text-align: center; border: none; font-family: inherit; font-size: inherit; cursor: pointer;">Submit Event <i class="ph ph-arrow-square-out"></i></button>
        </div>
        `;

        html += currentData.events.map(e => `
      <div class="feed-item notice-item" style="border-left: 4px solid var(--electric-blue)">
        <div class="feed-header">
            <h3>${e.title}</h3>
            <span class="date-badge"><i class="ph ph-calendar-blank"></i> ${formatFullDate(e.date)}</span>
        </div>
        <p>${e.desc}</p>
        ${e.link ? `<a href="${e.link}" target="_blank" class="btn-primary mt-3">Join / Register Here <i class="ph ph-arrow-square-out"></i></a>` : ''}
      </div>
    `).join('');

        container.innerHTML = html;
    } else if (tab === 'routine') {
        if (typeof renderFullRoutine === 'function') renderFullRoutine();
    } else if (tab === 'holidays') {
        if (typeof renderHolidayList === 'function') renderHolidayList();
    } else if (tab === 'exams') {
        if (typeof renderExamSchedule === 'function') renderExamSchedule();
    }
}

/* ================= SCHEDULE WIDGET LOGIC ================= */
function renderLiveSchedule() {
    const container = document.getElementById('daily-schedule-widget');
    if (!container || !currentData.schedule) return;

    const data = currentData.schedule;
    const now = new Date();

    const timeToMins = (tStr) => {
        if (!tStr) return 0;
        const [h, m] = tStr.split(':').map(Number);
        return h * 60 + m;
    };

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomYyyy = tomorrow.getFullYear();
    const tomMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomDd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tomYyyy}-${tomMm}-${tomDd}`;

    const currentTimeMins = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });

    let html = `
        <div class="schedule-header">
            <h3 style="margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;"><i class="ph ph-calendar-check text-accent"></i> Today's Schedule</h3>
            <span class="date-badge"><i class="ph ph-calendar-blank"></i> ${todayStr}</span>
        </div>
        <div class="schedule-body">
    `;

    // 1. Check for TODAY'S EXAMS first (Highest Priority)
    const todayExams = data.exams ? data.exams.filter(e => e.date === todayStr && e.display !== false).sort((a, b) => timeToMins(a.start) - timeToMins(b.start)) : [];

    // 2. Check for TOMORROW'S EXAMS (Upcoming Alert)
    const tomorrowExams = data.exams ? data.exams.filter(e => e.date === tomorrowStr && e.display !== false) : [];

    if (todayExams.length > 0) {
        let currentExam = todayExams.find(e => currentTimeMins >= timeToMins(e.start) && currentTimeMins <= timeToMins(e.end));
        let nextExam = todayExams.find(e => timeToMins(e.start) > currentTimeMins);
        let allExamsFinished = todayExams.every(e => currentTimeMins > timeToMins(e.end));

        if (currentExam) {
            html += `
            <div class="status-card live-card" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
                <div class="live-badge" style="display: inline-flex; margin-bottom: 10px;">🔴 LIVE EXAM</div>
                <h4 style="color: var(--text-main); font-size: 1.25rem; margin-bottom: 8px;">${currentExam.title}</h4>
                <div style="color: var(--text-muted); font-size: 0.9rem;">
                    <i class="ph ph-clock"></i> ${currentExam.start} - ${currentExam.end} | <i class="ph ph-map-pin"></i> ${currentExam.room}
                </div>
            </div>`;
        } else if (nextExam) {
            html += `
            <div class="status-card exam" style="border-color: #8b5cf6;">
                <div style="color: #8b5cf6; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px;">Next Upcoming Exam</div>
                <h4 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 8px;">${nextExam.title}</h4>
                <div style="color: var(--text-muted); font-size: 0.9rem;">
                    <i class="ph ph-clock"></i> Starts at ${nextExam.start} | <i class="ph ph-map-pin"></i> ${nextExam.room}
                </div>
            </div>`;
        } else if (allExamsFinished) {
            html += `<div class="status-card" style="border-color: var(--theme-color); color: var(--theme-color);">✅ Today's exam completed.</div>`;
        } else {
            // Case where it's early morning before the first exam
            const firstExam = todayExams[0];
            html += `
             <div class="status-card exam" style="border-color: #8b5cf6;">
                 <div style="color: #8b5cf6; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px;">Upcoming Exam Today</div>
                 <h4 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 8px;">${firstExam.title}</h4>
                 <div style="color: var(--text-muted); font-size: 0.9rem;">
                     <i class="ph ph-clock"></i> ${firstExam.start} - ${firstExam.end} | <i class="ph ph-map-pin"></i> ${firstExam.room}
                 </div>
             </div>`;
        }
    } else if (tomorrowExams.length > 0) {
        // Upcoming Exam Tomorrow Alert (Temporary Tab Logic)
        const ex = tomorrowExams[0];
        html += `
        <div class="status-card" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); margin-bottom: 1.5rem;">
            <div style="color: #f59e0b; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px;">⚠️ Upcoming Exam Tomorrow</div>
            <h4 style="color: var(--text-main); font-size: 1.1rem; margin-bottom: 5px;">${ex.title}</h4>
            <div style="color: var(--text-muted); font-size: 0.85rem;">Starts at ${ex.start} | Room: ${ex.room}</div>
        </div>
        `;

        // Show routine as well if today is a weekday
        renderStandardRoutine();
    } else {
        renderStandardRoutine();
    }

    function renderStandardRoutine() {
        if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
            html += `<div class="status-card">🏖️ Weekend - No Classes Today</div>`;
        } else if (data.unlistedHolidays && data.unlistedHolidays.includes(todayStr)) {
            html += `<div class="status-card">🏖️ No Classes Today</div>`;
        } else if (data.holidays && data.holidays.find(h => h.date === todayStr)) {
            const holiday = data.holidays.find(h => h.date === todayStr);
            html += `<div class="status-card holiday">🎉 Holiday Today: ${holiday.name}</div>`;
        } else {
            const todayRoutine = data.routine ? (data.routine[dayOfWeek] || []) : [];
            if (todayRoutine.length === 0) {
                html += `<div class="status-card">No classes scheduled for today.</div>`;
            } else {
                const firstClassStart = timeToMins(todayRoutine[0].start);
                const lastClassEnd = timeToMins(todayRoutine[todayRoutine.length - 1].end);

                // Check for early morning
                if (currentTimeMins < firstClassStart) {
                    const diff = firstClassStart - currentTimeMins;
                    html += `
                    <div class="status-card" style="border-color: var(--electric-blue); background: rgba(var(--theme-color-rgb), 0.05); margin-bottom: 1.5rem;">
                        <div style="color: var(--electric-blue); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px;">Coming Up</div>
                        <h4 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 8px;">Classes start at ${todayRoutine[0].start}</h4>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">Starting in ${Math.floor(diff / 60)}h ${diff % 60}m</div>
                    </div>`;
                }

                // Check for Breaks
                let activeBreak = null;
                for (let i = 0; i < todayRoutine.length - 1; i++) {
                    const endMins = timeToMins(todayRoutine[i].end);
                    const nextStartMins = timeToMins(todayRoutine[i + 1].start);
                    if (currentTimeMins >= endMins && currentTimeMins < nextStartMins) {
                        activeBreak = { start: todayRoutine[i].end, end: todayRoutine[i + 1].start, remMins: nextStartMins - currentTimeMins };
                        break;
                    }
                }

                if (activeBreak) {
                    html += `
                    <div class="status-card break-card" style="border-color: var(--gold-color); background: rgba(251, 191, 36, 0.05); margin-bottom: 1.5rem; text-align: center;">
                        <div style="color: var(--gold-color); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px;">☕ Taking a Break</div>
                        <h3 style="color: var(--text-main); font-size: 1.5rem; margin-bottom: 8px;">Intermission</h3>
                        <div class="break-timer" style="font-size: 2rem; font-weight: 800; color: var(--gold-color); font-family: 'Courier New', monospace;">
                            ${activeBreak.remMins} <span style="font-size: 1rem; opacity: 0.7;">MINS LEFT</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">Next Class: ${activeBreak.end}</div>
                    </div>`;
                }

                html += `<div class="routine-list">`;
                let classesOver = true;

                todayRoutine.forEach(cls => {
                    const startMins = timeToMins(cls.start);
                    const endMins = timeToMins(cls.end);
                    const isLive = currentTimeMins >= startMins && currentTimeMins <= endMins;
                    const isCompleted = currentTimeMins > endMins;
                    if (currentTimeMins <= endMins) classesOver = false;

                    html += `
                    <div class="class-card ${isLive ? 'live-card' : ''} ${isCompleted ? 'completed-card' : ''}">
                        <div class="class-time">${cls.start} - ${cls.end}</div>
                        <div class="class-details">
                            <div class="class-subject">
                                ${cls.subject} 
                                ${isLive ? '<span class="live-badge">🔴 LIVE NOW</span>' : ''}
                                ${isCompleted ? '<span class="done-badge"><i class="ph ph-check-circle"></i> Done</span>' : ''}
                            </div>
                            <div class="class-meta">
                                <span><i class="ph ph-user"></i> ${cls.prof}</span>
                                <span style="margin-left:auto"><i class="ph ph-map-pin"></i> ${cls.room}</span>
                            </div>
                        </div>
                    </div>`;
                });
                html += `</div>`;

                if (classesOver && todayRoutine.length > 0 && currentTimeMins > lastClassEnd) {
                    html += `<div class="classes-over-msg text-muted mt-3 text-center" style="font-size: 0.9rem;">Classes are over for today.</div>`;
                }
            }
        }
    }

    html += `</div>`;
    container.innerHTML = html;

    // Auto-scroll to LIVE or first UPCOMING class on mobile
    if (window.innerWidth <= 600) {
        setTimeout(() => {
            const list = container.querySelector('.routine-list');
            const targetCard = container.querySelector('.live-card') || container.querySelector('.class-card:not(.completed-card)');
            if (list && targetCard) {
                // Center the target card
                const scrollPos = targetCard.offsetLeft - (list.offsetWidth / 2) + (targetCard.offsetWidth / 2);
                list.scrollTo({ left: scrollPos, behavior: 'smooth' });
            }
        }, 300); // Small delay to ensure rendering is complete
    }
}

function renderFullRoutine() {
    const container = document.getElementById('updates-content');
    if (!currentData || !currentData.schedule || !container) return;

    const routine = currentData.schedule.routine || {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const now = new Date();
    const currentDay = now.toLocaleString('en-US', { weekday: 'long' });

    let html = `<div class="card">
        <h3 style="margin-bottom: 1.5rem;"><i class="ph ph-calendar text-accent"></i> Weekly Class Routine</h3>
        <p class="text-muted mb-4" style="font-size: 0.9rem;">Click on a day to view its classes.</p>
        
        <div class="routine-accordion">`;

    days.forEach(day => {
        const isToday = day === currentDay;
        const classes = routine[day] || [];

        html += `
            <div class="accordion-item ${isToday ? 'active' : ''}" id="accordion-${day}">
                <div class="accordion-header" onclick="toggleRoutineAccordion('${day}')">
                    <div class="day-info">
                        <i class="ph ph-calendar-blank" style="color: ${isToday ? 'var(--theme-color)' : 'var(--text-muted)'}"></i>
                        <h4>${day} ${isToday ? '<span class="accent" style="font-size: 0.8rem; margin-left: 8px;">(Today)</span>' : ''}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${classes.length} Classes</span>
                        <i class="ph ph-caret-down chevron"></i>
                    </div>
                </div>
                <div class="accordion-content">
                    <div class="accordion-inner">
                        ${classes.length > 0 ? classes.map(c => `
                            <div class="compact-class-row">
                                <div class="row-time">${c.start} - ${c.end}</div>
                                <div class="row-details">
                                    <div class="row-subject">${c.subject}</div>
                                    <div class="row-meta">
                                        <span><i class="ph ph-user"></i> ${c.prof}</span>
                                        <span style="margin-left: 12px;"><i class="ph ph-map-pin"></i> ${c.room}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="text-muted p-3">No classes scheduled for this day.</div>'}
                    </div>
                </div>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

window.toggleRoutineAccordion = function (day) {
    const item = document.getElementById(`accordion-${day}`);
    const isActive = item.classList.contains('active');

    // Close all others (optional, but keeps it very compact)
    document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));

    // Toggle current
    if (!isActive) {
        item.classList.add('active');
    }
};

function renderHolidayList() {
    const container = document.getElementById('updates-content');
    if (!currentData || !currentData.schedule || !container) return;

    const holidays = currentData.schedule.holidays || [];
    const unlisted = currentData.schedule.unlistedHolidays || [];

    let html = `<div class="card"><h3 style="margin-bottom: 1rem;"><i class="ph ph-calendar-star text-gold"></i> Official Holidays</h3>
    <div style="overflow-x: auto;">
        <table class="holiday-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Occasion</th>
                </tr>
            </thead>
            <tbody>
                ${holidays.map(h => `<tr><td style="font-weight: 500;">${formatFullDate(h.date)}</td><td>${h.name}</td></tr>`).join('')}
            </tbody>
        </table>
    </div>`;

    html += `</div>`;
    container.innerHTML = html;
}

function renderExamSchedule() {
    const container = document.getElementById('updates-content');
    if (!currentData || !currentData.schedule || !container) return;

    const exams = (currentData.schedule.exams || []).filter(e => e.display !== false);

    let html = `<div class="card"><h3 style="margin-bottom: 1.5rem;"><i class="ph ph-notebook text-accent"></i> Exam Schedule</h3>`;

    if (exams.length === 0) {
        html += `<div class="empty-state" style="padding: 3rem; text-align: center; color: var(--text-muted);">
            <i class="ph ph-calendar-x" style="font-size: 3.5rem; margin-bottom: 1.25rem; display: block; opacity: 0.3;"></i>
            <p style="font-size: 1.1rem;">Currently no exams available.</p>
        </div>`;
    } else {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">`;
        exams.forEach(ex => {
            const examDate = new Date(ex.date);
            const dayName = examDate.toLocaleString('en-US', { weekday: 'long' });

            html += `
            <div class="exam-card-item" style="padding: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-left: 4px solid #8b5cf6; border-radius: 12px; transition: var(--transition); cursor: default;">
                <div style="font-size: 0.8rem; color: #8b5cf6; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">${dayName}, ${formatFullDate(ex.date)}</div>
                <h4 style="margin-bottom: 12px; font-size: 1.2rem; color: var(--text-main);">${ex.title}</h4>
                <div style="font-size: 0.9rem; color: var(--text-muted); display: flex; align-items: center; gap: 15px; border-top: 1px solid var(--border-color); padding-top: 12px;">
                    <span style="display: flex; align-items: center; gap: 6px;"><i class="ph ph-clock"></i> ${ex.start} - ${ex.end}</span>
                    <span style="display: flex; align-items: center; gap: 6px;"><i class="ph ph-map-pin"></i> ${ex.room}</span>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

async function renderContributors() {
    const tableBody = document.getElementById('all-contributors-table');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted"><i class="ph ph-spinner ph-spin"></i> Fetching contributors...</td></tr>`;

    try {
        if (!window.supabaseClient) throw new Error("Supabase client not initialized.");

        const contributors = await window.callWithRetry(async () => {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('name, roll_number, upload_count, avatar_url')
                .gt('upload_count', 0)
                .order('upload_count', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        });

        if (contributors) {
            tableBody.innerHTML = contributors.map((s, i) => {
                const avatarUrl = s.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${s.roll_number || 'default'}`;
                return `
                <tr>
                    <td>${i + 1}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-color); object-fit: cover;">
                            <div>
                                <strong style="display: block;">${s.name || 'Anonymous'}</strong>
                                <small class="text-muted">${s.roll_number}</small>
                            </div>
                        </div>
                    </td>
                    <td>${s.upload_count || 0}</td>
                </tr>
            `;
            }).join('');
        } else {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No contributors found.</td></tr>`;
        }
    } catch (error) {
        console.error("Error fetching contributors:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <p class="text-muted mb-2">Failed to load contributors after multiple attempts.</p>
                    <button class="btn-outline btn-small" onclick="renderContributors()">Try Again <i class="ph ph-arrows-clockwise"></i></button>
                </td>
            </tr>
        `;
    }
}

async function renderDonators() {
    if (!currentData) return;
    const container = document.getElementById('full-donators-list');
    if (!container) return;

    // Aggregate donations by name (filtering out zero amounts)
    const totals = currentData.donators
        .filter(d => (parseInt(d.amount.replace('₹', '').replace(',', '')) || 0) > 0)
        .reduce((acc, d) => {
            const amount = parseInt(d.amount.replace('₹', '').replace(',', '')) || 0;
            if (acc[d.name]) {
                acc[d.name].amount += amount;
                acc[d.name].lastDate = d.date;
            } else {
                acc[d.name] = { name: d.name, amount: amount, lastDate: d.date };
            }
            return acc;
        }, {});

    // Convert to array and sort
    const sortedDonators = Object.values(totals).sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return new Date(b.lastDate) - new Date(a.lastDate);
    });

    // Fetch matching profiles for specific donators only
    let profileMap = {};
    if (window.supabaseClient) {
        const donatorNames = sortedDonators.map(d => d.name);
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('name, avatar_url')
            .in('name', donatorNames);

        if (profiles) {
            profiles.forEach(p => {
                if (p.name) profileMap[p.name.toUpperCase()] = p.avatar_url;
            });
        }
    }

    let html = `
    <div class="leaderboard-header">
        <h4><i class="ph ph-hands-clapping"></i> Hall of Heroes</h4>
        <p>A huge thank you to everyone listed below. Your contributions directly fuel the server and hosting costs of EEvolution 2.0.</p>
    </div>
    <div class="leaderboard-list">
    `;

    html += sortedDonators.map((d) => {
        const avatarUrl = profileMap[d.name.toUpperCase()];
        const iconHtml = avatarUrl
            ? `<img src="${avatarUrl}" class="donator-avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
            : `<i class="ph ph-heart text-accent"></i>`;

        return `
            <div class="leaderboard-item simple-donator">
                <div class="donator-icon">
                    ${iconHtml}
                </div>
                <div class="donator-info">
                    <span class="donator-name">${d.name}</span>
                </div>
                <div class="donation-badge">₹${d.amount}</div>
            </div>
        `;
    }).join('');

    html += `</div>`;
    container.innerHTML = html;
}

function renderDonationProgress() {
    if (!currentData || !currentData.donators) return;

    const totalCost = 2198;
    const collected = currentData.donators.reduce((sum, d) => {
        const amount = parseFloat(d.amount.replace('₹', '').replace(',', '')) || 0;
        return sum + amount;
    }, 0);

    const percentage = Math.min((collected / totalCost) * 100, 100);
    const roundedPercentage = percentage.toFixed(1);

    const collectedEl = document.getElementById('collected-amount');
    const fillEl = document.getElementById('funding-progress-fill');
    const captionEl = document.getElementById('progress-caption');

    if (collectedEl) collectedEl.innerText = `₹${collected.toLocaleString()}`;
    if (fillEl) fillEl.style.width = `${percentage}%`;
    if (captionEl) {
        if (percentage >= 100) {
            captionEl.innerHTML = `<span class="ph ph-check-circle"></span> Goal Reached! Costs are fully covered for this year.`;
            captionEl.style.color = "var(--theme-color)";
        } else {
            captionEl.innerText = `${roundedPercentage}% of annual costs covered. Help us reach our goal!`;
        }
    }
}

/* ================= INTERACTIONS / AUTH ================= */

function setupInteractions() {
    setupSearch();
    // Semester Switch
    const semSelect = document.getElementById('semester-select');
    if (semSelect) {
        semSelect.addEventListener('change', (e) => {
            // Check if showToast or alert exists
            const msg = "Semester switching is not available currently. Sem 1 data is archived.";
            if (window.showToast) {
                showToast(msg, "info");
            } else {
                alert(msg);
            }
            // Revert to Sem 2
            semSelect.value = "2";
            document.getElementById('sem-text').innerText = `SEM 2`;
        });
    }

    // Theme Color Switch
    const colorOptions = document.querySelectorAll('.color-option');
    const defaultColor = '#00e1ff';
    const defaultRGB = '0, 225, 255';

    const savedColor = localStorage.getItem('theme-color') || defaultColor;
    const savedRGB = localStorage.getItem('theme-color-rgb') || defaultRGB;

    // Apply color immediately
    document.documentElement.style.setProperty('--theme-color', savedColor);
    document.documentElement.style.setProperty('--theme-color-rgb', savedRGB);

    colorOptions.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-color') === savedColor);
    });

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.getAttribute('data-color');
            const rgb = option.getAttribute('data-rgb');

            document.documentElement.style.setProperty('--theme-color', color);
            document.documentElement.style.setProperty('--theme-color-rgb', rgb);

            localStorage.setItem('theme-color', color);
            localStorage.setItem('theme-color-rgb', rgb);

            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    // Theme Mode Switch (Light / Dark / Contrast)
    const modeButtons = document.querySelectorAll('.theme-mode-btn');
    const savedMode = localStorage.getItem('theme-mode') || 'dark';
    let currentBase = localStorage.getItem('theme-base') || 'dark';

    const applyThemeMode = (mode) => {
        let themeToApply = mode;

        if (mode === 'dark' || mode === 'light') {
            currentBase = mode;
            localStorage.setItem('theme-base', mode);
        } else if (mode === 'high-contrast') {
            // Shift to 100% based on active base
            themeToApply = currentBase === 'light' ? 'light-hc' : 'dark-hc';
        }

        document.documentElement.setAttribute('data-theme', themeToApply);

        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === mode);
        });
        localStorage.setItem('theme-mode', mode);
    };

    // Initial Apply
    applyThemeMode(savedMode);

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-theme');
            applyThemeMode(mode);
        });
    });
}



/* ================= MOOCS LOAD ENGINE ================= */

async function loadMoocsTable() {
    const container = document.getElementById('moocs-table-container');
    if (!container) return;

    // Show loading state
    const titleBox = container.querySelector('.section-title-box');
    titleBox.querySelector('p').innerHTML = `<i class="ph ph-spinner ph-spin"></i> Loading approved courses...`;

    try {
        const response = await fetch('data/moocs.json');
        if (!response.ok) throw new Error('Failed to fetch MOOCs data');
        const data = await response.json();

        let tableHtml = `
            <div class="table-container mar-table-wrapper">
                <table class="mar-points-table">
                    <thead>
                        <tr>
                            <th>Module / Course Name</th>
                            <th>Provider</th>
                            <th>Duration</th>
                            <th class="text-center">Credits</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const category in data) {
            // Category Header Row
            tableHtml += `
                <tr style="background: rgba(var(--theme-color-rgb), 0.05);">
                    <td colspan="4" style="color: var(--electric-blue); font-weight: 700; border-left: 4px solid var(--electric-blue); letter-spacing: 1px; text-transform: uppercase; font-size: 0.85rem;">
                        ${category}
                    </td>
                </tr>
            `;

            data[category].forEach(item => {
                tableHtml += `
                    <tr>
                        <td style="padding-left: 1.5rem;">${item.course}</td>
                        <td><span class="badge" style="background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--border-color);">${item.provider}</span></td>
                        <td>${item.duration}</td>
                        <td class="text-center" style="font-weight: 700; color: var(--gold-color);">${item.credits}</td>
                    </tr>
                `;
            });
        }

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;

        // Update the container
        titleBox.querySelector('p').innerText = "List of approved courses for Honours requirements.";

        // Remove existing table if any and append new one
        const existingTable = container.querySelector('.mar-table-wrapper');
        if (existingTable) existingTable.remove();
        container.insertAdjacentHTML('beforeend', tableHtml);

    } catch (error) {
        console.error("MOOCs engine error:", error);
        titleBox.querySelector('p').innerHTML = `<span class="text-danger">Failed to load course list. Please refresh the page.</span>`;
    }
}


/* ================= SECURE PAYMENT ENGINE ================= */

window.revealUPIDetails = function () {
    const details = document.getElementById('upi-details-revealed');
    const btn = document.getElementById('reveal-upi-btn');
    if (details && btn) {
        details.classList.remove('hidden');
        btn.classList.add('hidden');
    }
};

window.copyUPI = function () {
    const upiText = document.getElementById('upi-id-text').innerText;
    const btn = document.querySelector('.copy-btn');
    const icon = btn.querySelector('i');

    function updateUI() {
        if (window.showToast) window.showToast("UPI ID copied to clipboard!", "success");
        icon.classList.replace('ph-copy', 'ph-check-circle');
        icon.style.color = '#22c55e';
        setTimeout(() => {
            icon.classList.replace('ph-check-circle', 'ph-copy');
            icon.style.color = '';
        }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiText).then(updateUI).catch(() => fallbackCopy(upiText, updateUI));
    } else {
        fallbackCopy(upiText, updateUI);
    }
};

function fallbackCopy(text, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        callback();
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
}

/* ================= PDF VIEWER MODAL LOGIC ================= */

window.openPdfModal = function (title, previewLink) {
    const modal = document.getElementById('pdf-modal');
    const modalTitle = document.getElementById('pdf-modal-title');
    const iframe = document.getElementById('pdf-iframe');

    if (!modal || !iframe) return;

    // Handle Google Drive links to ensure they open in "preview" mode if it's a view link
    let refinedLink = previewLink;
    if (previewLink && previewLink.includes('drive.google.com') && previewLink.includes('/view')) {
        // Ensuring it uses the /preview endpoint for cleaner embedding
        refinedLink = previewLink.replace('/view', '/preview');
    }

    if (modalTitle) modalTitle.innerText = title;
    iframe.src = refinedLink;
    modal.classList.remove('hidden');

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
};

window.closePdfModal = function () {
    const modal = document.getElementById('pdf-modal');
    const iframe = document.getElementById('pdf-iframe');

    if (!modal || !iframe) return;

    modal.classList.add('hidden');
    iframe.src = ''; // Stop loading content

    // Re-enable scrolling
    document.body.style.overflow = 'auto';
};

// Initialize Modal Close Events
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('pdf-close-btn');
    const overlay = document.getElementById('pdf-modal-overlay');

    if (closeBtn) closeBtn.addEventListener('click', () => window.closePdfModal());
    if (overlay) overlay.addEventListener('click', () => window.closePdfModal());
});
