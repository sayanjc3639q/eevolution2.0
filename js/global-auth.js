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
