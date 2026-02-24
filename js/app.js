// App state
let currentData = null;
let loggedInUser = null;
let selectedSubject = null;
let activeSubTabs = {
    study: 'modules',
    updates: 'notices',
    points: 'mar',
    community: 'batchFeed',
    support: 'donate'
};

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
}

/* ================= NAVIGATION ================= */

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
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
    'notices': 'Notices', 'events': 'Events',
    'mar': 'MAR Points', 'moocs': 'MOOCs Points',
    'batchFeed': 'Batch Feed', 'memories': 'Memories', 'upload': 'Upload Docs', 'contributors': 'Contributors',
    'donate': 'Donations', 'donators': 'Donators List'
};

function navigateTo(sectionId) {
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
        subTitleElement.innerText = '';
    } else if (sectionId === 'profile') {
        subTitleElement.innerText = 'User Portal';
    } else if (sub) {
        subTitleElement.innerText = subTitleMap[sub] || '';
    } else {
        subTitleElement.innerText = '';
    }

    // If navigating back to a section, ensure its active subpane is shown
    if (sub) {
        if (sectionId === 'study') renderStudySection();
        else if (sectionId === 'updates') renderUpdates(sub);
        else renderGenericTabPanes(sectionId, sub);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    }
}

/* ================= STUDY SECTION ================= */

function renderStudySection() {
    const subCategory = activeSubTabs.study;
    const backBtn = document.getElementById('study-back-btn');

    if (selectedSubject) {
        backBtn.classList.remove('hidden');
        renderMaterialCards(subCategory, selectedSubject);
    } else {
        backBtn.classList.add('hidden');
        renderSubjectCards(subCategory);
    }
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
      <i class="ph ${s.icon}"></i>
      <h3>${s.name}</h3>
      <p class="text-muted">Click to view documents</p>
    </div>
  `).join('');
}

function selectSubject(id) {
    selectedSubject = id;
    renderStudySection();
}

function backToSubjects() {
    selectedSubject = null;
    renderStudySection();
}

function renderMaterialCards(category, subjectId) {
    const container = document.getElementById('study-content');
    const items = currentData.studyMaterials.filter(m => m.category === category && m.subjectId === subjectId);

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">No materials found for this subject yet.</div>';
        return;
    }

    container.innerHTML = items.map(item => `
    <div class="file-card">
      <h4>${item.name}</h4>
      <p>${item.desc}</p>
      <div class="file-meta">
         <span>By: ${item.uploadedBy}</span>
         <span>${item.date} ${item.faculty ? `| ${item.faculty}` : ''}</span>
      </div>
      <div class="file-actions">
         <a href="${item.link}" class="btn-outline">${category === 'digest' ? 'View Notes' : 'Download'} <i class="ph ph-arrow-down"></i></a>
      </div>
    </div>
  `).join('');
}

/* ================= OTHER DATA ================= */

async function renderHomeData() {
    if (!currentData) return;

    // Fetch top contributors from Supabase
    if (window.supabaseClient) {
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('name, roll_number, upload_count')
            .order('upload_count', { ascending: false })
            .limit(3);

        if (profiles) {
            document.getElementById('top-contributors').innerHTML = profiles.map((s, i) => `
                <li><div><span class="primary-text">#${i + 1} ${s.name || 'Anonymous'}</span><span class="secondary-text">${s.roll_number}</span></div><div style="text-align:right"><span class="text-blue"><i class="ph ph-upload"></i> ${s.upload_count || 0}</span></div></li>
            `).join('');
        }
    }

    const donators = [...currentData.donators].slice(0, 3);
    document.getElementById('top-donators').innerHTML = donators.map((d, i) => `
    <li><div><span class="primary-text">#${i + 1} ${d.name}</span><span class="secondary-text">${d.date}</span></div><div><span class="text-accent">${d.amount}</span></div></li>
  `).join('');

    // Render Reviews
    if (currentData.reviews) {
        document.getElementById('reviews-container').innerHTML = currentData.reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <div class="stars">
            ${'<i class="ph-fill ph-star"></i>'.repeat(r.rating)}${'<i class="ph ph-star"></i>'.repeat(5 - r.rating)}
          </div>
        </div>
        <p class="review-text">"${r.review}"</p>
        <div class="review-author">
          <strong>${r.name}</strong>
          <div>${r.roll}</div>
        </div>
      </div>
    `).join('');
    }
}

function renderUpdates(tab) {
    const container = document.getElementById('updates-content');
    if (!currentData || !container) return;
    if (tab === 'notices') {
        container.innerHTML = currentData.notices.map(n => `
      <div class="feed-item">
        <div class="feed-header"><h3>${n.title}</h3><span class="feed-date">${n.date}</span></div>
        <div class="feed-hashtags">${n.hashtags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <p>${n.content}</p>
        ${n.img ? `<img src="${n.img}" class="feed-img">` : ''}
        ${n.pdf !== '#' ? `<a href="${n.pdf}" class="btn-outline mt-3">Read Full PDF <i class="ph ph-file-pdf"></i></a>` : ''}
      </div>
    `).join('');
    } else {
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
      <div class="feed-item" style="border-left: 4px solid var(--electric-blue)">
        <h3>${e.title}</h3>
        <p class="text-accent mb-2"><i class="ph ph-calendar-blank"></i> ${e.date}</p>
        <p>${e.desc}</p>
        ${e.link ? `<a href="${e.link}" target="_blank" class="btn-primary mt-3">Join / Register Here <i class="ph ph-arrow-square-out"></i></a>` : ''}
      </div>
    `).join('');

        container.innerHTML = html;
    }
}

async function renderContributors() {
    const tableBody = document.getElementById('all-contributors-table');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted"><i class="ph ph-spinner ph-spin"></i> Fetching contributors...</td></tr>`;

    if (window.supabaseClient) {
        const { data: profiles, error } = await supabaseClient
            .from('profiles')
            .select('name, roll_number, upload_count, evo_coins')
            .order('upload_count', { ascending: false });

        if (error) {
            console.error("Error fetching contributors:", error);
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Failed to load contributors.</td></tr>`;
            return;
        }

        if (profiles) {
            tableBody.innerHTML = profiles.map((s, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${s.name || 'Anonymous'}</strong><br><small class="text-muted">${s.roll_number}</small></td>
                    <td>${s.upload_count || 0}</td>
                    <td class="text-gold">${s.evo_coins || 0} <i class="ph-fill ph-coins"></i></td>
                </tr>
            `).join('');
        }
    }
}

function renderDonators() {
    if (!currentData) return;
    const container = document.getElementById('full-donators-list');
    if (!container) return;

    // Aggregate donations by name
    const totals = currentData.donators.reduce((acc, d) => {
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
    const sortedDonators = Object.values(totals).sort((a, b) => b.amount - a.amount);

    let html = `
    <div class="leaderboard-header">
        <h4><i class="ph ph-hands-clapping"></i> Hall of Heroes</h4>
        <p>A huge thank you to everyone listed below. Your contributions directly fuel the server and hosting costs of EEvolution 2.0. We couldn't do this without you!</p>
    </div>
    <div class="leaderboard-list">
    `;

    html += sortedDonators.map((d, i) => `
    <div class="leaderboard-item">
        <div class="rank-slot">${i + 1}</div>
        <div class="donator-info">
            <span class="donator-name">${d.name}</span>
            <span class="donator-meta">Last contribution on ${d.lastDate}</span>
        </div>
        <div class="donation-badge">₹${d.amount}</div>
    </div>
    `).join('');

    html += `</div>`;
    container.innerHTML = html;
}

/* ================= INTERACTIONS / AUTH ================= */

function setupInteractions() {
    // Semester Switch
    const semSelect = document.getElementById('semester-select');
    if (semSelect) {
        semSelect.addEventListener('change', (e) => {
            document.getElementById('legacy-overlay').classList.toggle('hidden', e.target.value !== '1');
            document.getElementById('sem-text').innerText = `SEM ${e.target.value}`;
        });
    }

    // Theme Switch
    const colorOptions = document.querySelectorAll('.color-option');
    const savedColor = localStorage.getItem('theme-color');
    const savedRGB = localStorage.getItem('theme-color-rgb');

    if (savedColor) {
        document.documentElement.style.setProperty('--theme-color', savedColor);
        document.documentElement.style.setProperty('--theme-color-rgb', savedRGB);
        colorOptions.forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-color') === savedColor);
        });
    }

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
}

function copyUPI() {
    const upiId = document.getElementById('upi-id').innerText;
    navigator.clipboard.writeText(upiId).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-check"></i> Copied!';
        btn.classList.add('text-accent');
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('text-accent');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
