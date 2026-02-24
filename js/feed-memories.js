// Centralized Feed & Memories UI logic interacting with Supabase

const MEMORIES = [
    { id: 'mem1', url: 'https://i.pinimg.com/736x/63/4a/20/634a20fb0a9f0a2a38ad37594bbc2794.jpg', caption: 'First day at Campus', postedBy: 'Sayan Maity', date: '2026-02-22T10:00:00Z' },
    { id: 'mem2', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop', caption: 'Electrical Lab Session', postedBy: 'Admin', date: '2026-02-23T14:30:00Z' }
];

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
    }
});

let globalProfileMap = {};
let feedChannelActive = false;

async function fetchFeed() {
    if (!window.supabaseClient) return;

    // Fetch posts
    const { data: posts, error: postError } = await supabaseClient
        .from('batch_feed')
        .select('*')
        .order('created_at', { ascending: false });

    const container = document.getElementById('feed-container');
    if (!container) return;

    if (postError) {
        console.error("Error fetching feed:", postError);
        container.innerHTML = `<p class="text-muted">Unable to load feed. Please check Supabase connection.</p>`;
        return;
    }

    // Fetch profiles to get names for the roll numbers
    const { data: profiles } = await supabaseClient.from('profiles').select('roll_number, name');
    if (profiles) {
        profiles.forEach(p => { globalProfileMap[p.roll_number] = p.name; });
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
        const { data: prof } = await supabaseClient.from('profiles').select('name').eq('roll_number', post.roll_number).single();
        if (prof && prof.name) {
            globalProfileMap[post.roll_number] = prof.name;
        }
    }

    // Local state for likes to prevent spam
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    const hasLiked = likedPosts.includes(post.id);
    const hasDisliked = dislikedPosts.includes(post.id);

    // Extracted name (only name, no roll number as requested)
    const displayName = globalProfileMap[post.roll_number] || post.roll_number;

    const timeString = formatRelativeTime(post.created_at);

    // Create an avatar initials string
    let initials = displayName.substring(0, 2).toUpperCase();
    if (displayName.includes(' ')) {
        const parts = displayName.split(' ');
        if (parts[0] && parts[1]) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        }
    } else if (initials.length === 0) {
        initials = "U";
    }

    const html = `
    <div id="post-${post.id}" class="feed-item card mb-4" style="border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-surface); box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding: 0; overflow: hidden; transition: transform 0.2s ease;">
        <div class="feed-header" style="display:flex; justify-content:space-between; align-items: center; padding: 1rem 1.25rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.9rem;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--electric-blue, #007bff), var(--accent-color, #6610f2)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.1rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    ${initials}
                </div>
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 1.05rem; color: var(--text-main); font-weight: 600;">${displayName}</strong>
                    <span class="feed-date text-muted" style="font-size:0.8rem; margin-top: 3px;">${timeString}</span>
                </div>
            </div>
        </div>
        <div style="padding: 1.25rem; background: var(--bg-surface);">
            <p style="word-break: break-word; font-size: 1.05rem; line-height: 1.6; color: var(--text-main); margin-bottom: 0; white-space: pre-wrap;">${post.content}</p>
        </div>
        <div class="feed-actions" style="display:flex; gap:0.75rem; padding: 0.8rem 1.25rem; border-top: 1px solid var(--border-color); background: var(--bg-surface);">
            <button class="btn-outline btn-small ${hasLiked ? 'active' : ''}" onclick="handleFeedAction('${post.id}', 'likes')" ${hasLiked || hasDisliked ? 'disabled' : ''} style="border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center; padding: 0.5rem;">
                <i class="${hasLiked ? 'ph-fill text-accent' : 'ph'} ph-thumbs-up" style="font-size: 1.15rem;"></i> 
                <span id="likes-count-${post.id}" style="font-weight: 600;">${post.likes || 0}</span>
            </button>
            <button class="btn-outline btn-small ${hasDisliked ? 'active' : ''}" onclick="handleFeedAction('${post.id}', 'dislikes')" ${hasLiked || hasDisliked ? 'disabled' : ''} style="border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center; padding: 0.5rem;">
                <i class="${hasDisliked ? 'ph-fill text-danger' : 'ph'} ph-thumbs-down" style="font-size: 1.15rem;"></i> 
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
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const dislikedPosts = JSON.parse(localStorage.getItem('dislikedPosts') || '[]');

    if (likedPosts.includes(postId) || dislikedPosts.includes(postId)) return;

    // Get current value
    const { data: fetchPost, error: errFetch } = await window.supabaseClient
        .from('batch_feed')
        .select(action)
        .eq('id', postId)
        .single();

    if (errFetch) {
        console.error("Fetch Post Error: ", errFetch);
        return;
    }

    const newVal = (fetchPost[action] || 0) + 1;

    const { error } = await supabaseClient
        .from('batch_feed')
        .update({ [action]: newVal })
        .eq('id', postId);

    if (!error) {
        if (action === 'likes') likedPosts.push(postId);
        else dislikedPosts.push(postId);

        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
        localStorage.setItem('dislikedPosts', JSON.stringify(dislikedPosts));

        // Optimistically update the UI instead of re-fetching the whole feed
        const countSpan = document.getElementById(`${action}-count-${postId}`);
        if (countSpan) countSpan.innerText = newVal;

        // Disable the buttons for this post explicitly
        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
            const buttons = postElement.querySelectorAll('.feed-actions button');
            buttons.forEach(b => {
                b.disabled = true;
                if (b.onclick.toString().includes(`'${action}'`)) {
                    b.classList.add('active');
                    const icon = b.querySelector('i');
                    if (icon) {
                        icon.classList.remove('ph');
                        icon.classList.add('ph-fill');
                    }
                }
            });
        }
    }
};

window.renderMemories = async function () {
    const container = document.getElementById('memories-content');
    if (!container) return;

    const likedMemories = JSON.parse(localStorage.getItem('likedMemories') || '[]');

    // Fetch memory likes from DB
    let likesMap = {};
    if (window.supabaseClient) {
        const { data: metaData, error } = await supabaseClient.from('memories_data').select('*');
        if (metaData && !error) {
            metaData.forEach(m => { likesMap[m.photo_id] = m.like_count || 0; });
        }
    }

    const postsHtml = MEMORIES.map(m => {
        const hasLiked = likedMemories.includes(m.id);
        const lCount = likesMap[m.id] || 0;
        let posterName = m.postedBy || 'Unknown User';
        let posterInitials = posterName.substring(0, 2).toUpperCase();
        if (posterName.includes(' ')) {
            const parts = posterName.split(' ');
            if (parts[0] && parts[1]) {
                posterInitials = (parts[0][0] + parts[1][0]).toUpperCase();
            }
        } else if (posterInitials.length === 0) {
            posterInitials = "U";
        }

        const timeString = m.date ? formatRelativeTime(m.date) : '';

        return `
        <div class="gallery-item card" style="padding: 0; overflow: hidden; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-surface);">
            <div class="memory-header" style="display:flex; justify-content:space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-color, #6610f2), var(--electric-blue, #007bff)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.95rem; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                        ${posterInitials}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 1rem; color: var(--text-main); font-weight: 600;">${posterName}</strong>
                        ${timeString ? `<span class="text-muted" style="font-size:0.75rem; margin-top: 2px;">${timeString}</span>` : ''}
                    </div>
                </div>
            </div>
            <img src="${m.url}" alt="${m.caption}" style="width: 100%; display: block; object-fit: cover;">
            <div class="gallery-item-content" style="padding: 1rem;">
                <p style="margin-bottom: 0.8rem; font-size: 1rem; color: var(--text-main);"><strong>${m.caption}</strong></p>
                <div class="gallery-actions" style="display:flex; gap:0.5rem; justify-content: space-between;">
                    <button class="btn-outline btn-small ${hasLiked ? 'active' : ''}" onclick="likeMemory('${m.id}')" ${hasLiked ? 'disabled' : ''} style="flex: 1; justify-content: center;">
                        <i class="${hasLiked ? 'ph-fill text-accent' : 'ph'} ph-heart"></i> ${lCount} Likes
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

    container.insertAdjacentHTML('beforeend', postsHtml);
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
                 <strong><i class="ph ph-user"></i> ${displayName}</strong><br>
                 <span style="color:var(--text-main); display:inline-block; margin-top:4px;">${c.comment_text}</span>
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
