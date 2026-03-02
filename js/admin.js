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
}

// Tab Switching
window.showAdminTab = function (tabName) {
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`admin-pane-${tabName}`).classList.remove('hidden');
    if (tabName === 'materials') loadAdminMaterials();
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

