// Centralized Feed & Memories UI logic interacting with Supabase

/* ================= ABUSIVE LANGUAGE FILTER ================= */
const BAD_WORDS_LIST = [
    // English & Chat Phonetics
    'fuck', 'shit', 'asshole', 'bastard', 'bitch', 'dick', 'pussy', 'slut', 'whore', 'cunt', 'faggot', 'nigger', 'dumbass', 'retard', 'fucker', 'fck', 'shit', 'sh*t', 'b*tch', 'stfu', 'f*ck', 'd*ck',
    // Hindi (Phonetic & Shortened)
    'chutiya', 'bhenchod', 'madarchod', 'gandu', 'harami', 'kamine', 'behenchod', 'saala', 'sala', 'randi', 'bhosadi', 'bhosadike', 'maderchod', 'terimaaki', 'lodu', 'gand', 'gaand', 'muth', 'muthiya', 'bakchod', 'chinaal', 'bc', 'mc', 'bsdk', 'ctya', 'mncd', 'bncd', 'gndu', 'bkchod', 'mcbc',
    // Bengali (Phonetic & Shortened)
    'khanki', 'magi', 'shala', 'sala', 'bal', 'lyadh', 'bokachoda', 'araal', 'khankimagi', 'nodi', 'jhant', 'baal', 'gadha', 'haraami', 'badmash', 'chuitya', 'pagol', 'khnk', 'mg', 'bkcd', 'jhnt'
];

function containsAbusiveLanguage(text) {
    if (!text) return false;
    const cleanText = text.toLowerCase().replace(/[^\w\s\u0980-\u09FF\u0900-\u097F]/g, ''); // Keep English, Bengali, Hindi chars
    const words = cleanText.split(/\s+/);
    return words.some(word => BAD_WORDS_LIST.includes(word));
}

document.addEventListener('DOMContentLoaded', () => {
    // Word counter for feed composer
    const feedText = document.getElementById('feed-text-input');
    const wordCount = document.getElementById('feed-word-count');
    if (feedText) {
        feedText.addEventListener('input', () => {
            const words = feedText.value.trim().split(/\s+/).filter(w => w.length > 0);
            if (words.length > 200) {
                const sliced = words.slice(0, 200).join(' ');
                feedText.value = sliced + " ";
            }
            const finalWords = feedText.value.trim().split(/\s+/).filter(w => w.length > 0);
            wordCount.innerText = `${finalWords.length} / 200 words`;
        });
    }

    if (window.supabaseClient) {
        fetchFeed();
        renderMemories();
        if (window.checkAdminForMemories) window.checkAdminForMemories();
    }
});

let globalProfileMap = {};
let feedChannelActive = false;

async function fetchFeed() {
    if (!window.supabaseClient) return;

    // Run auto-cleanup for admins to maintain storage efficiency
    if (window.isLoggedIn && window.currentProfile && window.currentProfile.is_admin) {
        autoCleanupBatchFeed();
    }

    const container = document.getElementById('feed-container');
    if (!container) return;

    // LOGIN CHECK: Restrict visibility to logged-in users only
    if (!window.isLoggedIn) {
        container.innerHTML = `
            <div class="card text-center" style="border: 1px dashed var(--border-color); background: rgba(var(--theme-color-rgb), 0.05); border-radius: 16px; margin: 2rem auto; padding: 4rem 2rem; max-width: 500px; width: 100%;">
                <div style="width: 64px; height: 64px; background: rgba(var(--theme-color-rgb), 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <i class="ph ph-lock-key" style="font-size: 2.5rem; color: var(--theme-color);"></i>
                </div>
                <h3 style="margin-bottom: 0.75rem; font-size: 1.5rem;">Batch Feed is Private</h3>
                <p class="text-muted" style="margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5;">You must be logged in to view posts and interact with the Batch 2 community.</p>
                <a href="auth.html" class="btn-primary" style="display: inline-flex; justify-content: center; min-width: 200px; padding: 0.8rem 1.5rem;">Login to View Feed <i class="ph ph-sign-in" style="margin-left: 0.5rem;"></i></a>
            </div>
        `;
        return;
    }

    // Fetch posts
    const { data: posts, error: postError } = await supabaseClient
        .from('batch_feed')
        .select('*')
        .order('created_at', { ascending: false });

    if (postError) {
        console.error("Error fetching feed:", postError);
        container.innerHTML = `<p class="text-muted">Unable to load feed. Please check Supabase connection.</p>`;
        return;
    }

    // Fetch profiles to get names and avatars for the roll numbers
    const { data: profiles } = await supabaseClient.from('profiles').select('roll_number, name, avatar_url');
    if (profiles) {
        profiles.forEach(p => {
            globalProfileMap[p.roll_number] = { name: p.name, avatar: p.avatar_url };
        });
    }

    if (!posts || posts.length === 0) {
        container.innerHTML = `<p id="no-posts-msg" class="text-muted">No posts yet. Be the first to share an update!</p>`;
    } else {
        container.innerHTML = '';
        for (const post of posts) {
            await renderSinglePost(post, false);
        }
    }

    setupRealtimeFeed();
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);

    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const n = Math.floor((nowStart - dateStart) / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24 && n === 0) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (n === 0) return 'Today';
    if (n === 1) return 'yesterday';
    if (n <= 99) return `${n} days ago`;

    const m = Math.floor(n / 30);
    if (m <= 99) return `${m} months ago`;

    const y = Math.floor(m / 12);
    return `${y} years ago`;
}

async function renderSinglePost(post, prepend = false) {
    const container = document.getElementById('feed-container');
    if (!container) return;

    const noPostsMsg = document.getElementById('no-posts-msg');
    if (noPostsMsg) noPostsMsg.remove();

    // Dynamically fetch missing profile info
    if (!globalProfileMap[post.roll_number] && window.supabaseClient) {
        const { data: prof } = await supabaseClient.from('profiles').select('name, avatar_url').eq('roll_number', post.roll_number).single();
        if (prof) {
            globalProfileMap[post.roll_number] = { name: prof.name || post.roll_number, avatar: prof.avatar_url };
        }
    }

    // Local state for likes to prevent spam
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    const hasLiked = likedPosts.includes(post.id);
    const hasDisliked = dislikedPosts.includes(post.id);

    // Extracted profile info
    const profileInfo = globalProfileMap[post.roll_number] || { name: post.roll_number, avatar: null };
    const displayName = profileInfo.name;
    const avatarUrl = profileInfo.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.roll_number}`;

    const timeString = formatRelativeTime(post.created_at);

    const html = `
    <div id="post-${post.id}" class="feed-item card" style="border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-surface); box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding: 0; overflow: hidden; transition: transform 0.2s ease;">
        <div class="feed-header" style="display:flex; flex-direction: row !important; justify-content:space-between; align-items: center; padding: 1rem 1.25rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.9rem;">
                <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: #334155; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    <img src="${avatarUrl}" class="avatar-img" style="width: 100%; height: 100%;" alt="Avatar">
                </div>
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 1.05rem; color: var(--text-main); font-weight: 600;">${escapeHTML(displayName)}</strong>
                    <span class="feed-date text-muted" style="font-size:0.8rem; margin-top: 3px;">${timeString}</span>
                </div>

            </div>
            ${window.currentProfile && window.currentProfile.is_admin ? `
                <button class="btn-outline btn-small text-danger" title="Delete Post" onclick="deleteFeedPost('${post.id}')" style="padding: 0.4rem; min-width: 32px; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05);">
                    <i class="ph ph-trash" style="font-size: 1.1rem; color: #ef4444;"></i>
                </button>
            ` : ''}
        </div>
        <div style="padding: 1.25rem; background: var(--bg-surface);">
            <p style="word-break: break-word; font-size: 1.05rem; line-height: 1.6; color: var(--text-main); margin-bottom: 0; white-space: pre-wrap;">${escapeHTML(post.content)}</p>
        </div>

        <div class="feed-actions" style="display:flex; gap:0.75rem; padding: 0.8rem 1.25rem; border-top: 1px solid var(--border-color); background: var(--bg-surface);">
            <button class="btn-outline btn-small ${hasLiked ? 'liked' : ''}" onclick="handleFeedAction('${post.id}', 'likes')" style="border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center; padding: 0.5rem;">
                <i class="${hasLiked ? 'ph-fill' : 'ph'} ph-thumbs-up" style="font-size: 1.15rem;"></i> 
                <span id="likes-count-${post.id}" style="font-weight: 600;">${post.likes || 0}</span>
            </button>
            <button class="btn-outline btn-small ${hasDisliked ? 'disliked' : ''}" onclick="handleFeedAction('${post.id}', 'dislikes')" style="border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center; padding: 0.5rem;">
                <i class="${hasDisliked ? 'ph-fill' : 'ph'} ph-thumbs-down" style="font-size: 1.15rem;"></i> 
                <span id="dislikes-count-${post.id}" style="font-weight: 600;">${post.dislikes || 0}</span>
            </button>
        </div>
    </div>
    `;

    if (prepend) {
        container.insertAdjacentHTML('afterbegin', html);
    } else {
        container.insertAdjacentHTML('beforeend', html);
    }
}

function setupRealtimeFeed() {
    if (feedChannelActive || !window.supabaseClient) return;
    feedChannelActive = true;

    window.supabaseClient
        .channel('custom-feed-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'batch_feed' },
            (payload) => {
                console.log('Realtime Triggered! New post arrived:', payload.new);

                // Prevent duplicate rendering if the current user is the one who just posted it
                const existingPost = document.getElementById(`post-${payload.new.id}`);
                if (!existingPost) {
                    renderSinglePost(payload.new, true);
                }
            }
        )
        .subscribe();
}

window.submitFeedPost = async function () {
    if (!window.isLoggedIn || !window.currentProfile) {
        showToast("Please log in to share an update.", "error");
        return;
    }

    const roll = window.currentProfile.roll_number;
    const text = document.getElementById('feed-text-input').value.trim();

    if (!roll) {
        showToast("User roll number missing. Please contact admin.", "error");
        return;
    }
    if (!text) {
        showToast("Please write something to post.", "error");
        return;
    }

    // Abusive Language Filter
    if (containsAbusiveLanguage(text)) {
        showToast("Post contains restricted language. Please keep it respectful.", "error");
        return;
    }

    const btn = document.getElementById('feed-post-btn');
    btn.disabled = true;
    btn.innerHTML = `Posting... <i class="ph ph-spinner ph-spin"></i>`;

    const { data, error } = await supabaseClient
        .from('batch_feed')
        .insert([{
            roll_number: roll,
            content: text,
            likes: 0,
            dislikes: 0
        }]).select();

    if (error) {
        console.error("Error posting to batch_feed:", error);
        showToast("Failed to post. " + error.message, "error");
    } else {
        document.getElementById('feed-text-input').value = "";
        document.getElementById('feed-word-count').innerText = "0 / 200 words";

        if (data && data.length > 0) {
            renderSinglePost(data[0], true);
        }
    }
    btn.disabled = false;
    btn.innerHTML = `Post <i class="ph ph-paper-plane-right"></i>`;
};

window.handleFeedAction = async function (postId, action) {
    if (!window.isLoggedIn) {
        if (typeof showToast === 'function') showToast("Please log in to vote", "error");
        else alert("Please log in to vote");
        return;
    }

    const likeBtn = document.querySelector(`#post-${postId} button[onclick*="'likes'"]`);
    const dislikeBtn = document.querySelector(`#post-${postId} button[onclick*="'dislikes'"]`);
    if (!likeBtn || !dislikeBtn) return;

    const likeCountSpan = document.getElementById(`likes-count-${postId}`);
    const dislikeCountSpan = document.getElementById(`dislikes-count-${postId}`);

    let likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    let dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    const hasLiked = likedPosts.includes(postId);
    const hasDisliked = dislikedPosts.includes(postId);

    let newLikeChange = 0;
    let newDislikeChange = 0;

    let willLike = hasLiked;
    let willDislike = hasDisliked;

    if (action === 'likes') {
        if (hasLiked) {
            willLike = false;
            newLikeChange = -1;
            likedPosts = likedPosts.filter(id => id !== postId);
        } else {
            willLike = true;
            newLikeChange = 1;
            likedPosts.push(postId);
            if (hasDisliked) {
                willDislike = false;
                newDislikeChange = -1;
                dislikedPosts = dislikedPosts.filter(id => id !== postId);
            }
        }
    } else if (action === 'dislikes') {
        if (hasDisliked) {
            willDislike = false;
            newDislikeChange = -1;
            dislikedPosts = dislikedPosts.filter(id => id !== postId);
        } else {
            willDislike = true;
            newDislikeChange = 1;
            dislikedPosts.push(postId);
            if (hasLiked) {
                willLike = false;
                newLikeChange = -1;
                likedPosts = likedPosts.filter(id => id !== postId);
            }
        }
    }

    // 2. Optimistic UI Updates
    const currentLikes = parseInt(likeCountSpan.innerText) || 0;
    const currentDislikes = parseInt(dislikeCountSpan.innerText) || 0;

    likeCountSpan.innerText = Math.max(0, currentLikes + newLikeChange);
    dislikeCountSpan.innerText = Math.max(0, currentDislikes + newDislikeChange);

    // Update visuals instantly
    if (willLike) {
        likeBtn.classList.add('liked');
        likeBtn.querySelector('i').className = 'ph-fill ph-thumbs-up';
    } else {
        likeBtn.classList.remove('liked');
        likeBtn.querySelector('i').className = 'ph ph-thumbs-up';
    }

    if (willDislike) {
        dislikeBtn.classList.add('disliked');
        dislikeBtn.querySelector('i').className = 'ph-fill ph-thumbs-down';
    } else {
        dislikeBtn.classList.remove('disliked');
        dislikeBtn.querySelector('i').className = 'ph ph-thumbs-down';
    }

    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    localStorage.setItem('dislikedPosts', JSON.stringify(dislikedPosts));

    // Disable clicks safely while syncing logic
    likeBtn.disabled = true;
    dislikeBtn.disabled = true;

    try {
        // 3. Database Syncing (Increment/Decrementing integer counts accurately)
        const { data: fetchPost, error: errFetch } = await window.supabaseClient
            .from('batch_feed')
            .select('likes, dislikes')
            .eq('id', postId)
            .single();

        if (errFetch) throw errFetch;

        const updatedLikes = Math.max(0, (fetchPost.likes || 0) + newLikeChange);
        const updatedDislikes = Math.max(0, (fetchPost.dislikes || 0) + newDislikeChange);

        const { error: errUpdate } = await window.supabaseClient
            .from('batch_feed')
            .update({ likes: updatedLikes, dislikes: updatedDislikes })
            .eq('id', postId);

        if (errUpdate) throw errUpdate;

    } catch (error) {
        console.error("Action Failed:", error);

        // REVERT OPTIMISTIC UI CAUSE DB FAILED
        likeCountSpan.innerText = currentLikes;
        dislikeCountSpan.innerText = currentDislikes;

        if (hasLiked) {
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'ph-fill ph-thumbs-up';
            if (action === 'likes' || (action === 'dislikes' && !hasDisliked)) likedPosts.push(postId);
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'ph ph-thumbs-up';
            likedPosts = likedPosts.filter(id => id !== postId);
        }

        if (hasDisliked) {
            dislikeBtn.classList.add('disliked');
            dislikeBtn.querySelector('i').className = 'ph-fill ph-thumbs-down';
            if (action === 'dislikes' || (action === 'likes' && !hasLiked)) dislikedPosts.push(postId);
        } else {
            dislikeBtn.classList.remove('disliked');
            dislikeBtn.querySelector('i').className = 'ph ph-thumbs-down';
            dislikedPosts = dislikedPosts.filter(id => id !== postId);
        }

        // Save original states back
        localStorage.setItem('likedPosts', JSON.stringify([...new Set(likedPosts)]));
        localStorage.setItem('dislikedPosts', JSON.stringify([...new Set(dislikedPosts)]));

        if (window.showToast) window.showToast("Action failed. Reverted.", "error");
    } finally {
        // Safe to click again
        likeBtn.disabled = false;
        dislikeBtn.disabled = false;
    }
};

window.renderMemories = async function () {
    const container = document.getElementById('memories-content');
    if (!container) return;

    if (!window.supabaseClient) return;

    // Fetch memories from DB
    const { data: memoriesArray, error: fetchErr } = await supabaseClient
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

    if (fetchErr) {
        console.error("Error fetching memories:", fetchErr);
        const loadingText = container.querySelector('p.text-muted');
        if (loadingText) loadingText.innerHTML = "Error loading memories.";
        return;
    }

    const likedMemories = JSON.parse(localStorage.getItem('likedMemories') || '[]');

    // Fetch memory likes from DB
    let likesMap = {};
    const { data: metaData, error } = await supabaseClient.from('memories_data').select('*');
    if (metaData && !error) {
        metaData.forEach(m => { likesMap[m.photo_id] = m.like_count || 0; });
    }

    // Fetch avatars mapping
    const { data: allProfiles } = await supabaseClient.from('profiles').select('roll_number, avatar_url');
    const avatarMap = {};
    if (allProfiles) {
        allProfiles.forEach(p => avatarMap[p.roll_number] = p.avatar_url);
    }

    const postsHtml = (memoriesArray || []).map(m => {
        const hasLiked = likedMemories.includes(m.id);
        const lCount = likesMap[m.id] || 0;
        let posterName = m.student_name || 'Unknown User';
        const userAvatar = avatarMap[m.roll_number] || `https://api.dicebear.com/9.x/avataaars/svg?seed=${m.roll_number || 'default'}`;

        const timeString = m.created_at ? formatRelativeTime(m.created_at) : '';

        return `
        <div class="gallery-item card" style="padding: 0; overflow: hidden; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-surface);">
            <div class="memory-header" style="display:flex; justify-content:space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: #334155; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                        <img src="${userAvatar}" class="avatar-img" style="width: 100%; height: 100%;" alt="Avatar">
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 0.9rem; color: var(--text-main); font-weight: 600;">${escapeHTML(posterName)} (${escapeHTML(m.roll_number || 'N/A')})</strong>
                        ${timeString ? `<span class="text-muted" style="font-size:0.75rem; margin-top: 2px;">${timeString}</span>` : ''}
                    </div>

                </div>
            </div>
            <img src="${escapeHTML(m.image_url)}" alt="${escapeHTML(m.caption)}" style="width: 100%; display: block; object-fit: cover; max-height: 400px;">
            <div class="gallery-item-content" style="padding: 1rem;">
                <p style="margin-bottom: 0.8rem; font-size: 1rem; color: var(--text-main);"><strong>${escapeHTML(m.caption)}</strong></p>

                <div class="gallery-actions" style="display:flex; gap:0.5rem; justify-content: space-between;">
                    <button class="btn-outline btn-small ${hasLiked ? 'liked' : ''}" onclick="likeMemory('${m.id}')" ${hasLiked ? 'disabled' : ''} style="flex: 1; justify-content: center;">
                        <i class="${hasLiked ? 'ph-fill' : 'ph'} ph-heart"></i> ${lCount} Likes
                    </button>
                    <button class="btn-outline btn-small" onclick="toggleComments('${m.id}')" style="flex: 1; justify-content: center;">Comments <i class="ph ph-chat-centered-text"></i></button>
                </div>
                <div id="comments-section-${m.id}" class="comments-section hidden mt-3">
                     <button class="btn-outline btn-small w-100" onclick="fetchComments('${m.id}')">Load Comments <i class="ph ph-arrows-clockwise"></i></button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Remove loading text but keep banner
    const loadingText = container.querySelector('p.text-muted');
    if (loadingText) loadingText.remove();

    // Remove existing memory cards to prevent duplicates when rendering multiple times
    const existingCards = container.querySelectorAll('.gallery-item');
    existingCards.forEach(card => card.remove());

    container.insertAdjacentHTML('beforeend', postsHtml || '<p class="text-muted" style="grid-column: 1 / -1;">No memories found.</p>');
};

// Admin Check to toggle Admin panel
window.checkAdminForMemories = async function () {
    if (!window.isLoggedIn || !window.supabaseClient) return;

    // Use window.currentProfile if available to avoid redundant fetch
    let profile = window.currentProfile;
    if (!profile) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        const { data: fetchedProfile } = await supabaseClient.from('profiles').select('is_admin').eq('id', user.id).single();
        profile = fetchedProfile;
    }

    if (profile && profile.is_admin) {
        const panel = document.getElementById('admin-memory-panel');
        if (panel) panel.style.display = 'block';
    }
}

// Global submit handler for the Memory Form
window.submitAdminMemory = async function (e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('admin-memory-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = "Uploading..."; }

    const student_name = document.getElementById('mem-student-name').value.trim();
    const roll_number = document.getElementById('mem-roll-number').value.trim();
    const image_url = document.getElementById('mem-image-url').value.trim();
    const caption = document.getElementById('mem-caption').value.trim();

    if (!student_name || !roll_number || !image_url || !caption) {
        if (window.showToast) window.showToast("Please fill all fields.", "error");
        if (btn) { btn.disabled = false; btn.innerHTML = "Upload Memory"; }
        return;
    }

    const { error } = await supabaseClient.from('memories').insert([{
        student_name,
        roll_number,
        image_url,
        caption
    }]);

    if (error) {
        console.error("Upload Error:", error);
        if (window.showToast) window.showToast("Upload failed: " + error.message, "error");
    } else {
        if (window.showToast) window.showToast("Memory published!", "success");
        // Clear form
        document.getElementById('admin-memory-form').reset();
        // Refresh memories
        if (window.renderMemories) window.renderMemories();
    }
    if (btn) { btn.disabled = false; btn.innerHTML = "Upload Memory"; }
};

window.likeMemory = async function (photoId) {
    if (!window.supabaseClient) return;
    const likedMemories = JSON.parse(localStorage.getItem('likedMemories') || '[]');
    if (likedMemories.includes(photoId)) return;

    // fetch current like
    let { data: currData, error: errFetch } = await supabaseClient
        .from('memories_data')
        .select('*')
        .eq('photo_id', photoId)
        .single();

    // PGRST116 means zero rows found
    if (errFetch && errFetch.code === 'PGRST116') {
        const { error: errInsert } = await supabaseClient.from('memories_data').insert([{ photo_id: photoId, like_count: 1 }]);
        if (!errInsert) pushLocalLike(photoId);
    } else if (currData) {
        const { error: errUpdate } = await supabaseClient.from('memories_data').update({ like_count: (currData.like_count || 0) + 1 }).eq('photo_id', photoId);
        if (!errUpdate) pushLocalLike(photoId);
    }
};

function pushLocalLike(photoId) {
    const likedMemories = JSON.parse(localStorage.getItem('likedMemories') || '[]');
    likedMemories.push(photoId);
    localStorage.setItem('likedMemories', JSON.stringify(likedMemories));
    renderMemories();
}

window.toggleComments = function (photoId) {
    const sec = document.getElementById(`comments-section-${photoId}`);
    if (sec.classList.contains('hidden')) {
        sec.classList.remove('hidden');
        fetchComments(photoId);
    } else {
        sec.classList.add('hidden');
    }
};

window.fetchComments = async function (photoId) {
    if (!window.supabaseClient) return;
    const sec = document.getElementById(`comments-section-${photoId}`);
    sec.innerHTML = '<p class="text-muted" style="text-align:center;"><i class="ph ph-spinner ph-spin"></i> Loading comments...</p>';

    // Fetch comments and profile names for display
    const { data: comments, error } = await supabaseClient
        .from('memories_comments')
        .select('*')
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true });

    const { data: profiles } = await supabaseClient.from('profiles').select('roll_number, name');
    const profileMap = {};
    if (profiles) {
        profiles.forEach(p => { profileMap[p.roll_number] = p.name; });
    }


    let html = '';
    if (window.isLoggedIn && window.currentProfile) {
        html += `
        <div class="add-comment" style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
            <input type="hidden" id="comment-roll-${photoId}" value="${window.currentProfile.roll_number}">
            <input type="text" id="comment-text-${photoId}" placeholder="Write a comment..." style="flex:1; padding:0.4rem; font-size:0.85rem;" autocomplete="off">
            <button class="btn-primary" style="padding:0.4rem 0.8rem;" onclick="addComment('${photoId}')"><i class="ph ph-paper-plane-right"></i></button>
        </div>
        `;
    } else {
        html += `
        <div class="mb-3 p-2" style="background: var(--bg-surface); text-align: center; border-radius: 4px; border: 1px dashed var(--border-color);">
            <p class="text-muted" style="font-size:0.85rem;"><a href="auth.html" style="color:var(--electric-blue)">Sign in</a> to join the conversation.</p>
        </div>
        `;
    }


    if (!error && comments) {
        html += `<div class="comment-list" style="display:flex; flex-direction:column; gap:0.75rem; max-height:200px; overflow-y:auto; padding-right:5px;">`;
        if (comments.length === 0) {
            html += `<p class="text-muted" style="font-size:0.85rem; text-align:center;">No comments yet. Be the first!</p>`;
        }
        comments.forEach(c => {
            const displayName = profileMap[c.roll_number] ? `${profileMap[c.roll_number]} (${c.roll_number})` : c.roll_number;
            html += `
              <div style="background:var(--bg-surface); padding: 0.75rem; border-radius:4px; font-size:0.85rem; border:1px solid var(--border-color);">
                 <strong><i class="ph ph-user"></i> ${escapeHTML(displayName)}</strong><br>
                 <span style="color:var(--text-main); display:inline-block; margin-top:4px;">${escapeHTML(c.comment_text)}</span>
                 <div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; text-align:right;">${new Date(c.created_at).toLocaleString()}</div>
              </div>

            `;
        });
        html += `</div>`;
    }

    sec.innerHTML = html;
};

window.addComment = async function (photoId) {
    if (!window.isLoggedIn || !window.currentProfile) return;

    const roll = window.currentProfile.roll_number;
    const text = document.getElementById(`comment-text-${photoId}`).value.trim();

    if (!text) {
        showToast("Enter comment text.", "error"); return;
    }

    // Abusive Language Filter
    if (containsAbusiveLanguage(text)) {
        showToast("Comment contains restricted language.", "error");
        return;
    }

    const { error } = await supabaseClient
        .from('memories_comments')
        .insert([{ photo_id: photoId, roll_number: roll, comment_text: text }]);

    if (!error) {
        fetchComments(photoId);
    } else {
        console.error("Error adding comment", error);
        showToast("Failed to submit comment. Ensure database is configured properly.", "error");
    }
};

window.deleteFeedPost = async function (postId) {
    if (!window.isLoggedIn || !window.currentProfile || !window.currentProfile.is_admin) {
        showToast("Admin privileges required.", "error");
        return;
    }

    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;

    if (!window.supabaseClient) {
        showToast("Supabase is not connected.", "error");
        return;
    }

    const { data: deletedRows, error } = await window.supabaseClient
        .from('batch_feed')
        .delete()
        .eq('id', postId)
        .select();

    if (error) {
        console.error("Delete Error:", error);
        showToast("Failed to delete post: " + error.message, "error");
    } else if (!deletedRows || deletedRows.length === 0) {
        console.warn("No rows deleted. Potentially an ID mismatch or RLS policy block.");
        showToast("Failed to delete: Post not found or unauthorized.", "error");
    } else {
        showToast("Post deleted successfully.", "success");
        // Remove from UI immediately with animation
        const card = document.getElementById(`post-${postId}`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            card.style.transition = 'all 0.3s ease';
            setTimeout(() => card.remove(), 300);
        }
    }
};

/**
 * AUTO CLEANUP: Deletes batch feed posts older than 30 days
 * This helps keep the Supabase storage usage low and the feed relevant.
 */
async function autoCleanupBatchFeed() {
    if (!window.isLoggedIn || !window.currentProfile || !window.currentProfile.is_admin) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Perform delete on old records
    const { error } = await supabaseClient
        .from('batch_feed')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) {
        console.error("Auto-Cleanup Error:", error);
    } else {
        console.log("Auto-Cleanup: Checked for posts older than 30 days.");
    }
}
