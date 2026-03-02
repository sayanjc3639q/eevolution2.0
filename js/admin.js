document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
    if (!window.supabaseClient) {
        showToast("Supabase not configured", "error");
        setTimeout(() => window.location.href = "index.html", 2000);
        return;
    }

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "index.html";
        return;
    }

    // fetch profile
    const { data: profile, error: err } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    // Check is_admin
    if (err || !profile || !profile.is_admin) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('admin-content').classList.remove('hidden');

    loadUsers();
    loadAdminSubjects();
    loadSystemSettings();
    loadStudentsForDonations();
}

let studentsDict = {};
async function loadStudentsForDonations() {
    try {
        const response = await fetch('data/students.json');
        studentsDict = await response.json();
    } catch (e) { console.error("Failed to load students for donations", e); }
}


// System Settings Logic (Utilizing 'notices' table to bypass RLS on 'profiles')
let testModeActive = false;
async function loadSystemSettings() {
    const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .eq('title', '[SYSTEM_CONFIG_TEST_MODE]')
        .maybeSingle();

    if (data) {
        testModeActive = true;
        updateTestUI(true, data.content || 'NOT_GENERATED');
    } else {
        testModeActive = false;
        updateTestUI(false, 'NOT_GENERATED');
    }
}

window.toggleTestMode = async function () {
    const newState = !testModeActive;
    let codeToSave = document.getElementById('current-test-code').innerText;

    if (newState) {
        if (codeToSave === 'NOT_GENERATED' || codeToSave === 'INIT') {
            codeToSave = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        // Optimistic UI
        updateTestUI(true, codeToSave);

        const { error } = await supabaseClient
            .from('notices')
            .insert([{
                title: '[SYSTEM_CONFIG_TEST_MODE]',
                content: codeToSave,
                date: new Date().toISOString().split('T')[0],
                hashtags: ['#system']
            }]);

        if (error) {
            showToast("Error enabling test mode: " + error.message, "error");
            loadSystemSettings();
        } else {
            testModeActive = true;
            showToast("Test Mode Enabled", "success");
        }
    } else {
        // Optimistic UI
        updateTestUI(false, 'NOT_GENERATED');

        const { error } = await supabaseClient
            .from('notices')
            .delete()
            .eq('title', '[SYSTEM_CONFIG_TEST_MODE]');

        if (error) {
            showToast("Error disabling test mode: " + error.message, "error");
            loadSystemSettings();
        } else {
            testModeActive = false;
            showToast("Test Mode Disabled", "success");
        }
    }
};

window.generateTestCode = async function () {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('current-test-code').innerText = newCode;

    const { error } = await supabaseClient
        .from('notices')
        .update({ content: newCode })
        .eq('title', '[SYSTEM_CONFIG_TEST_MODE]');

    if (error) showToast("Error saving code: " + error.message, "error");
    else showToast("New code generated!", "success");
};


function updateTestUI(active, code) {
    const btn = document.getElementById('test-mode-toggle');
    const status = document.getElementById('test-mode-status');
    const generator = document.getElementById('test-code-generator');
    const codeDisplay = document.getElementById('current-test-code');

    if (active) {
        btn.innerHTML = `<i class="ph ph-toggle-right text-success"></i> Test Mode: ON`;
        status.innerText = 'Status: ACTIVE';
        status.className = 'text-success';
        generator.classList.remove('hidden');
        if (code !== 'STAYS_SAME') codeDisplay.innerText = code;
    } else {
        btn.innerHTML = `<i class="ph ph-toggle-left"></i> Test Mode: OFF`;
        status.innerText = 'Status: INACTIVE';
        status.className = 'text-error';
        generator.classList.add('hidden');
        codeDisplay.innerText = 'NOT_GENERATED';
    }
}


// Tab Switching
window.showAdminTab = function (tabName) {
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`admin-pane-${tabName}`).classList.remove('hidden');
    if (tabName === 'materials') loadAdminMaterials();
    if (tabName === 'notices') loadAdminNotices();
    if (tabName === 'events') loadAdminEvents();
    if (tabName === 'donations') loadAdminDonations();
};


async function loadAdminEvents() {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" class="text-center">Loading...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || !data.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No events scheduled.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(ev => `
        <tr>
            <td>${ev.title}</td>
            <td class="text-sm text-muted">${ev.date}</td>
            <td>
                <button class="btn-outline btn-small" style="color: #ef4444;" onclick="handleDeleteEvent(${ev.id})"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.handleAddEvent = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;

    const payload = {
        title: document.getElementById('ev-title').value,
        description: document.getElementById('ev-desc').value,
        date: document.getElementById('ev-date').value,
        link: document.getElementById('ev-link').value || '#'
    };

    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Adding...`;

    const { error } = await supabaseClient.from('events').insert([payload]);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Event added successfully!", "success");
        e.target.reset();
        loadAdminEvents();
    }
    btn.disabled = false;
    btn.innerHTML = originalText;
};

window.handleDeleteEvent = async function (id) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    const { error } = await supabaseClient.from('events').delete().eq('id', id);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Deleted!", "success");
        loadAdminEvents();
    }
};

async function loadAdminNotices() {
    const tbody = document.getElementById('notices-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" class="text-center">Loading...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">Error: ${error.message}</td></tr>`;
        return;
    }

    const visibleNotices = data.filter(n => n.title !== '[SYSTEM_CONFIG_TEST_MODE]');
    if (!visibleNotices.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No notices yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = visibleNotices.map(n => `

        <tr>
            <td>${n.title}</td>
            <td class="text-sm text-muted">${n.date}</td>
            <td>
                <button class="btn-outline btn-small" style="color: #ef4444;" onclick="handleDeleteNotice(${n.id})"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.handleAddNotice = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;

    const hList = document.getElementById('nt-hashtags').value
        .split(',')
        .map(h => h.trim())
        .filter(h => h !== '');

    const tags = hList.map(h => h.startsWith('#') ? h : `#${h}`);

    const payload = {
        title: document.getElementById('nt-title').value,
        content: document.getElementById('nt-content').value,
        hashtags: tags,
        date: document.getElementById('nt-date').value || new Date().toISOString().split('T')[0],
        pdf: document.getElementById('nt-pdf').value || '#',
        img: document.getElementById('nt-img').value || null
    };

    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Posting...`;

    const { error } = await supabaseClient.from('notices').insert([payload]);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Notice posted successfully!", "success");
        e.target.reset();
        loadAdminNotices();
    }
    btn.disabled = false;
    btn.innerHTML = originalText;
};

window.handleDeleteNotice = async function (id) {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    const { error } = await supabaseClient.from('notices').delete().eq('id', id);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Deleted!", "success");
        loadAdminNotices();
    }
};

async function loadAdminSubjects() {
    const select = document.getElementById('mat-subject');
    if (!select) return;

    try {
        const resp = await fetch('data/subjects.json');
        const data = await resp.json();
        const allSubs = [...data.theory, ...data.lab];

        select.innerHTML = '<option value="" disabled selected>Select Subject...</option>' +
            allSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) { console.error("Could not load subjects for admin selection", e); }
}

async function loadAdminMaterials() {
    const tbody = document.getElementById('materials-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" class="text-center">Loading...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No materials in database yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(m => `
        <tr>
            <td>${m.name}</td>
            <td class="text-sm text-muted">${m.subject_id}</td>
            <td>
                <button class="btn-outline btn-small" style="color: #ef4444;" onclick="handleDeleteMaterial(${m.id})"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.handleAddMaterial = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;

    const payload = {
        name: document.getElementById('mat-name').value,
        subject_id: document.getElementById('mat-subject').value,
        category: document.getElementById('mat-category').value,
        chapter: document.getElementById('mat-chapter').value,
        description: document.getElementById('mat-desc').value,
        link: document.getElementById('mat-link').value
    };

    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Adding...`;

    const { error } = await supabaseClient.from('study_materials').insert([payload]);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Material added successfully!", "success");
        e.target.reset();
        loadAdminMaterials();
    }
    btn.disabled = false;
    btn.innerHTML = originalText;
};

window.handleDeleteMaterial = async function (id) {
    if (!confirm("Are you sure you want to delete this material?")) return;

    const { error } = await supabaseClient.from('study_materials').delete().eq('id', id);

    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Deleted!", "success");
        loadAdminMaterials();
    }
};

async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    const { data: users, error } = await supabaseClient.from('profiles').select('*');

    if (error) {
        console.error("Error loading users", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Failed to load profiles.</td></tr>`;
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.roll_number || 'N/A'}</strong></td>
            <td><input type="number" id="coins-${u.id}" value="${u.evo_coins || 0}" min="0"></td>
            <td><input type="number" id="uploads-${u.id}" value="${u.upload_count || 0}" min="0"></td>
            <td>
                <button class="btn-primary btn-small" onclick="saveUser('${u.id}')">Save <i class="ph ph-floppy-disk"></i></button>
            </td>
        </tr>
    `).join('');
}

window.saveUser = async function (userId) {
    const coins = document.getElementById(`coins-${userId}`).value;
    const uploads = document.getElementById(`uploads-${userId}`).value;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ evo_coins: parseInt(coins), upload_count: parseInt(uploads) })
        .eq('id', userId);

    if (error) {
        showToast("Failed to update user: " + error.message, "error");
    } else {
        showToast("User updated successfully!", "success");
    }
};

/* ================= DONATION MANAGEMENT ================= */

window.filterDonationSearch = function () {
    const input = document.getElementById('don-student-search');
    const results = document.getElementById('don-search-results');
    if (!input || !results) return;
    const query = input.value ? input.value.toLowerCase().trim() : "";

    if (query.length < 2) {
        results.classList.add('hidden');
        return;
    }

    const matches = Object.entries(studentsDict || {})
        .filter(([roll, name]) => name.toLowerCase().includes(query) || roll.includes(query))
        .slice(0, 10);

    if (matches.length > 0) {
        results.innerHTML = matches.map(([roll, name]) => `
            <div class="search-item" onclick="selectDonationStudent('${name.replace(/'/g, "\\'")}', '${roll}')" style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.9rem;">
                <strong>${name}</strong> <span class="text-muted">(${roll})</span>
            </div>
        `).join('');
        results.classList.remove('hidden');
    } else {
        results.classList.add('hidden');
    }
};

window.selectDonationStudent = function (name, roll) {
    document.getElementById('don-student-search').value = `${name} (${roll})`;
    document.getElementById('don-student-name').value = name;
    document.getElementById('don-student-roll').value = roll;
    document.getElementById('don-search-results').classList.add('hidden');
};

async function loadAdminDonations() {
    const tbody = document.getElementById('donations-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Loading...</td></tr>`;

    const { data, error } = await supabaseClient
        .from('donations')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-error">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || !data.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No donations recorded in Supabase yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(d => `
        <tr>
            <td><strong>${d.name}</strong><br><small class="text-muted">${d.roll_number || 'No Roll'}</small></td>
            <td class="text-accent">₹${d.amount}</td>
            <td class="text-sm">${d.date}</td>
            <td>
                <button class="btn-outline btn-small" style="color: #ef4444;" onclick="handleDeleteDonation('${d.id}')">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.handleAddDonation = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btn-add-donation');
    const originalText = btn.innerHTML;

    const name = document.getElementById('don-student-name').value;
    const roll = document.getElementById('don-student-roll').value;
    const amountStr = document.getElementById('don-amount').value.replace('₹', '').trim();
    const date = document.getElementById('don-date').value;

    if (!name || !amountStr || !date) {
        showToast("Please select a student from results and fill all fields", "error");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `Adding... <i class="ph ph-spinner ph-spin"></i>`;

    const { error } = await supabaseClient
        .from('donations')
        .insert([{
            name: name,
            roll_number: roll,
            amount: parseFloat(amountStr),
            date: date
        }]);

    if (error) {
        showToast("Failed to add donation: " + error.message, "error");
    } else {
        showToast("Donation added successfully!", "success");
        e.target.reset();
        document.getElementById('don-student-search').value = "";
        loadAdminDonations();
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
};

window.handleDeleteDonation = async function (id) {
    if (!confirm("Are you sure you want to delete this donation record?")) return;

    const { error } = await supabaseClient
        .from('donations')
        .delete()
        .eq('id', id);

    if (error) {
        showToast("Failed to delete: " + error.message, "error");
    } else {
        showToast("Donation record deleted.", "success");
        loadAdminDonations();
    }
};

// Set default date for donation form
const donDateInput = document.getElementById('don-date');
if (donDateInput) donDateInput.value = new Date().toISOString().split('T')[0];


