let currentSessionUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.supabaseClient) {
        await checkAuth();
    }
});

async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    // UI Elements targets
    const navUnauth = document.getElementById('unauth-navbar-area');
    const navAuth = document.getElementById('auth-navbar-area');
    const feedComposer = document.getElementById('feed-composer');
    const profileSectionAuth = document.getElementById('profile-details');
    const profileSectionUnauth = document.querySelector('.not-logged-in');

    if (error || !session) {
        // Public State Context
        if (navUnauth) navUnauth.classList.remove('hidden');
        if (navAuth) navAuth.classList.add('hidden');
        if (feedComposer) feedComposer.classList.add('hidden');

        if (profileSectionUnauth) profileSectionUnauth.classList.remove('hidden');
        if (profileSectionAuth) profileSectionAuth.classList.add('hidden');

        window.isLoggedIn = false;
        window.currentProfile = null;
    } else {
        // Private State Context
        currentSessionUser = session.user;
        window.isLoggedIn = true;

        if (navUnauth) navUnauth.classList.add('hidden');
        if (navAuth) navAuth.classList.remove('hidden');
        if (feedComposer) feedComposer.classList.remove('hidden');

        if (profileSectionUnauth) profileSectionUnauth.classList.add('hidden');
        if (profileSectionAuth) profileSectionAuth.classList.remove('hidden');

        // Fetch User Profile Mapping
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            window.currentProfile = profile;

            // Header display
            const headerName = document.getElementById('nav-user-first-name');
            const headerCoins = document.getElementById('nav-user-coins');
            if (headerName) {
                // Assuming profile.name might be "Full Name", extract first part
                const firstName = (profile.name || "Student").split(' ')[0];
                headerName.innerText = firstName;
            }
            if (headerCoins) headerCoins.innerHTML = `<i class="ph-fill ph-coins"></i> ${profile.evo_coins || 0}`;

            // Profile display
            const profRoll = document.getElementById('profile-roll');
            const profCoins = document.getElementById('profile-coins');
            const profUploads = document.getElementById('profile-uploads');
            const profName = document.getElementById('profile-name');
            const adminPanelBtn = document.getElementById('admin-panel-btn');

            if (profRoll) profRoll.innerText = profile.roll_number || 'N/A';
            if (profCoins) profCoins.innerHTML = `<i class="ph-fill ph-coins text-gold"></i> ${profile.evo_coins || 0}`;
            if (profUploads) profUploads.innerHTML = `<i class="ph ph-upload text-blue"></i> ${profile.upload_count || 0}`;
            if (profName) profName.innerText = profile.name || "Student Portal";

            // Update Avatars in UI
            const avatarUrl = profile.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.roll_number || 'default'}`;
            const headerAvatarContainer = document.getElementById('nav-user-avatar');
            if (headerAvatarContainer) {
                headerAvatarContainer.innerHTML = `<img src="${avatarUrl}" class="avatar-img" style="width:100%; height:100%;" alt="Avatar">`;
            }
            const profileAvatarContainer = document.getElementById('profile-avatar-container');
            if (profileAvatarContainer) {
                let img = profileAvatarContainer.querySelector('img');
                if (!img) {
                    img = document.createElement('img');
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    profileAvatarContainer.prepend(img);
                    const icon = profileAvatarContainer.querySelector('.ph-user');
                    if (icon) icon.remove();
                }
                img.src = avatarUrl;
            }

            // Init Avatar Grid
            initAvatarGrid(profile.avatar_url);

            // Unhide Admin Button if applicable
            if (profile.is_admin && adminPanelBtn) {
                adminPanelBtn.classList.remove('hidden');
            }
        }
    }

    const logoutBtn = document.getElementById('nav-logout-btn');
    const mainLogoutBtn = document.getElementById('logout-btn');

    const handleLogout = async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    };

    if (logoutBtn) logoutBtn.onclick = handleLogout;
    if (mainLogoutBtn) mainLogoutBtn.onclick = handleLogout;

    // Also re-render Memories thread input if it was active
    if (window.renderMemories && document.getElementById('memories-content')) {
        // Just retrigger but careful no infinite loops. 
        // It renders initially before auth is finished, so this effectively upgrades UI.
        window.renderMemories();
    }
}

const formLinks = {
    file: {
        baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeoojbxxltwn-A4aWsQB_z0HkRAnEjTkr_7V00YG3NUIJkg7Q/viewform",
        nameEntry: "entry.1171407804",
        rollEntry: "entry.1240276289"
    },
    memory: {
        baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfhIxPwiHYOR0YPXI06bUBZn02WQJ_ngHaZigqXpKMEyhkL5Q/viewform",
        nameEntry: "entry.1256960757",
        rollEntry: "entry.1104866823"
    },
    feedback: {
        baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeMIArjNWd97fP_eWlOuM1CJyepCUdNoZlp1i5uqCzTcVbYkw/viewform",
        nameEntry: "entry.1816392909",
        rollEntry: "entry.308794664"
    },
    event: {
        baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLSephcJ-rLanL1nHllZXIFho8D9ZAvUPHU-4RmjwDcsQXwFMWw/viewform",
        nameEntry: "entry.2140947050",
        rollEntry: "entry.142949056"
    }
};

async function openPreFilledForm(formType) {
    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();

        if (error || !user) {
            if (typeof showToast === 'function') {
                showToast("You must be logged in to access this form.", "error");
            } else {
                alert("You must be logged in to access this form.");
            }
            return;
        }

        const userName = user.user_metadata.name || "";
        const userRoll = user.user_metadata.roll_number || "";
        const config = formLinks[formType];

        if (!config) {
            console.error("Invalid form type requested.");
            return;
        }

        const dynamicURL = `${config.baseUrl}?usp=pp_url&${config.nameEntry}=${encodeURIComponent(userName)}&${config.rollEntry}=${encodeURIComponent(userRoll)}`;
        window.open(dynamicURL, '_blank');

    } catch (err) {
        console.error("Form routing error:", err);
    }
}

// Attach it to the window object so inline HTML onclick handlers can reach it
window.openPreFilledForm = openPreFilledForm;

/* ================= AVATAR SYSTEM ================= */

let selectedAvatarUrl = null;

function initAvatarGrid(currentUrl) {
    const grid = document.getElementById('avatar-selection-grid');
    if (!grid) return;

    const seeds = ["Felix", "Aneka", "Jack", "Luna", "Oliver", "Sophia", "Zoe", "Leo", "Milo", "Sasha", "Max", "Mia", "Toby", "Coco", "Ruby", "Nala", "Simba", "Bear", "Lucky", "Daisy"];

    grid.innerHTML = seeds.map(seed => {
        const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
        const isSelected = currentUrl === url;
        return `
            <div class="avatar-item ${isSelected ? 'selected' : ''}" onclick="selectAvatar(this, '${url}')">
                <img src="${url}" alt="${seed}">
            </div>
        `;
    }).join('');
}

window.toggleAvatarEditor = function () {
    const editor = document.getElementById('avatar-editor');
    if (!editor) return;

    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        editor.style.display = 'none';
    }
};

window.selectAvatar = function (el, url) {
    document.querySelectorAll('.avatar-item').forEach(item => item.classList.remove('selected'));
    el.classList.add('selected');
    selectedAvatarUrl = url;

    const btn = document.getElementById('save-avatar-btn');
    if (btn) {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
};

window.saveSelectedAvatar = async function () {
    if (!selectedAvatarUrl || !window.supabaseClient) return;

    const btn = document.getElementById('save-avatar-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Saving...`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: selectedAvatarUrl })
            .eq('id', user.id);

        if (error) throw error;

        if (window.showToast) window.showToast("Avatar updated successfully!", "success");

        // Hide editor
        const editor = document.getElementById('avatar-editor');
        if (editor) editor.style.display = 'none';

        // Update local UI
        const navAvatar = document.getElementById('nav-user-avatar');
        if (navAvatar) navAvatar.innerHTML = `<img src="${selectedAvatarUrl}" class="avatar-img" style="width:100%; height:100%;" alt="Avatar">`;

        const profAvatar = document.getElementById('profile-avatar-container');
        if (profAvatar) {
            let img = profAvatar.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                img.classList.add('avatar-img');
                img.style.width = '100%';
                img.style.height = '100%';
                profAvatar.prepend(img);
                const icon = profAvatar.querySelector('.ph-user');
                if (icon) icon.remove();
            }
            img.src = selectedAvatarUrl;
        }

    } catch (err) {
        console.error("Avatar save error:", err);
        if (window.showToast) window.showToast("Failed to save avatar.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
