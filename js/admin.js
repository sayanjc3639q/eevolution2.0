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
}

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
                <button class="btn-primary btn-small" onclick="saveUser('${u.id}')">Save Changes <i class="ph ph-floppy-disk"></i></button>
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
