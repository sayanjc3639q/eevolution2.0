// Centralized Feed & Memories UI logic interacting with Supabase

const MEMORIES = [
    { id: 'mem1', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop', caption: 'First day at Campus' },
    { id: 'mem2', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop', caption: 'Electrical Lab Session' }
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
    const displayName = globalProfileMap[post.roll_number] ? `${globalProfileMap[post.roll_number]} (${post.roll_number})` : post.roll_number;

    const html = `
    <div id="post-${post.id}" class="feed-item card mb-4">
        <div class="feed-header" style="display:flex; justify-content:space-between; align-items: center;">
            <strong><i class="ph ph-user"></i> ${displayName}</strong>
            <span class="feed-date text-muted" style="font-size:0.8rem;">${new Date(post.created_at).toLocaleString()}</span>
        </div>
        <p class="mt-2" style="word-break: break-word;">${post.content}</p>
        <div class="feed-actions mt-3" style="display:flex; gap:1rem;">
            <button class="btn-outline btn-small ${hasLiked ? 'active' : ''}" onclick="handleFeedAction('${post.id}', 'likes')" ${hasLiked || hasDisliked ? 'disabled' : ''}>
                <i class="ph ${hasLiked ? 'ph-thumbs-up-fill' : 'ph-thumbs-up'}"></i> <span id="likes-count-${post.id}">${post.likes || 0}</span>
            </button>
            <button class="btn-outline btn-small ${hasDisliked ? 'active' : ''}" onclick="handleFeedAction('${post.id}', 'dislikes')" ${hasLiked || hasDisliked ? 'disabled' : ''}>
                <i class="ph ${hasDisliked ? 'ph-thumbs-down-fill' : 'ph-thumbs-down'}"></i> <span id="dislikes-count-${post.id}">${post.dislikes || 0}</span>
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
        alert("Please log in to share an update.");
        return;
    }

    const roll = window.currentProfile.roll_number;
    const text = document.getElementById('feed-text-input').value.trim();

    if (!roll) {
        alert("User roll number missing. Please contact admin.");
        return;
    }
    if (!text) {
        alert("Please write something to post.");
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
        alert("Failed to post. " + error.message);
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
                    const icon = b.querySelector('.ph');
                    if (icon) {
                        icon.classList.replace('ph-thumbs-up', 'ph-thumbs-up-fill');
                        icon.classList.replace('ph-thumbs-down', 'ph-thumbs-down-fill');
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

    container.innerHTML = MEMORIES.map(m => {
        const hasLiked = likedMemories.includes(m.id);
        const lCount = likesMap[m.id] || 0;
        return `
        <div class="gallery-item card" style="padding:0; overflow:hidden;">
            <img src="${m.url}" alt="${m.caption}" style="width:100%; height:250px; object-fit:cover;">
            <div style="padding:1.5rem;">
                <p><strong>${m.caption}</strong></p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
                    <button class="btn-outline btn-small ${hasLiked ? 'active' : ''}" onclick="likeMemory('${m.id}')" ${hasLiked ? 'disabled' : ''}>
                        <i class="ph ${hasLiked ? 'ph-heart-fill text-accent' : 'ph-heart'}"></i> ${lCount} Likes
                    </button>
                    <button class="btn-outline btn-small" onclick="toggleComments('${m.id}')">Comments <i class="ph ph-chat-centered-text"></i></button>
                </div>
                <div id="comments-section-${m.id}" class="comments-section hidden mt-3" style="border-top: 1px dashed var(--border-color); padding-top:1rem;">
                     <button class="btn-outline btn-small w-100" style="width:100%;" onclick="fetchComments('${m.id}')">Load Comments <i class="ph ph-arrows-clockwise"></i></button>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
        alert("Enter comment text."); return;
    }

    const { error } = await supabaseClient
        .from('memories_comments')
        .insert([{ photo_id: photoId, roll_number: roll, comment_text: text }]);

    if (!error) {
        fetchComments(photoId);
    } else {
        console.error("Error adding comment", error);
        alert("Failed to submit comment. Ensure database is configured properly.");
    }
};
