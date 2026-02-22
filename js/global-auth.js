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
            if (headerCoins) headerCoins.innerHTML = `<i class="ph ph-coins"></i> ${profile.evo_coins || 0}`;

            // Profile display
            const profRoll = document.getElementById('profile-roll');
            const profCoins = document.getElementById('profile-coins');
            const profUploads = document.getElementById('profile-uploads');
            const profName = document.getElementById('profile-name');
            const adminPanelBtn = document.getElementById('admin-panel-btn');

            if (profRoll) profRoll.innerText = profile.roll_number || 'N/A';
            if (profCoins) profCoins.innerHTML = `<i class="ph ph-coins text-accent"></i> ${profile.evo_coins || 0}`;
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
