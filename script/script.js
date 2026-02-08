document.addEventListener('DOMContentLoaded', () => {
    console.log('EEvolution 2.0 Landing Page Loaded');

    // Global state for notices & blogs
    window.currentSemesterNotices = [];
    window.currentSemesterBlogs = [];

    initBackgroundCanvas();
    initScrollReveal();
    initTiltEffect();
    initBackgroundCanvas();
    initScrollReveal();
    initTiltEffect();
    initMobileMenu();
    initNavigation();
    initSettings();

    // Initial Load - Default to first sem
    loadResources('first-semister');
    loadNotices('first-semister');
    loadBlogs('first-semister');
    loadMoments();
    loadHallOfFame();
});

// Toast Function
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load Notices Function
async function loadNotices(semesterFolder = 'first-semister') {
    const container = document.getElementById('notices-grid');
    if (!container) return;

    // Show loading
    container.innerHTML = '<div class="loading-spinner">Loading notices...</div>';

    try {
        // Fetch from specific semester folder with cache busting
        const response = await fetch(`data/${semesterFolder}/notices.json?t=${new Date().getTime()}`);

        // Handle 404 gracefully
        if (!response.ok) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No notices for this semester.</div>';
            return;
        }

        const notices = await response.json();
        window.currentSemesterNotices = notices; // Store for detail view
        container.innerHTML = ''; // Clear loading

        if (!notices || notices.length === 0) {
            console.warn('Notices data is empty or null for', semesterFolder);
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No notices available.</div>';
            return;
        }

        notices.forEach(notice => {
            const card = document.createElement('div');
            card.className = 'notice-card scroll-reveal';

            let imageHtml = '';
            if (notice.hasImage && notice.imageUrl) {
                imageHtml = `
                    <div class="notice-image-header" style="background-image: url('${notice.imageUrl}');">
                        <div class="notice-overlay"></div>
                    </div>
                `;
            }

            let pdfBtnHtml = '';
            if (notice.hasPdf) {
                pdfBtnHtml = `
                    <a href="${notice.pdfLink}" class="btn-action-icon" title="Download PDF">
                        <i class="fas fa-file-download"></i>
                    </a>
                `;
            }

            // Create snippet
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notice.content;
            let snippet = tempDiv.textContent || tempDiv.innerText || "";
            if (snippet.length > 100) {
                snippet = snippet.substring(0, 100) + "......";
            } else if (!snippet && notice.content) {
                // Fallback if structured content like tables have no direct text
                snippet = "Click to view details......";
            }

            card.innerHTML = `
                ${imageHtml}
                <div class="notice-body">
                    <div class="notice-meta">
                        <span class="notice-date">
                            <i class="far fa-calendar-alt"></i> ${notice.date}
                        </span>
                        <div class="notice-options">
                            ${pdfBtnHtml}
                            <button class="btn-action-icon" onclick="shareNotice('${notice.id}')" title="Share Link">
                                <i class="fas fa-share-nodes"></i>
                            </button>
                        </div>
                    </div>

                    <h3 class="notice-title">${notice.title}</h3>
                    <p class="notice-content">${snippet}</p>

                    <div class="notice-footer">
                        <button onclick="openNoticeDetail('${notice.id}')" class="read-more-link" style="background:none; border:none; padding:0; cursor:pointer;">Read full notice <i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
                `;
            container.appendChild(card);
        });

        // Re-init reveal
        setTimeout(() => {
            const reveals = container.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div style="text-align: center; color: #ff4444; padding: 2rem;">Error loading notices.</div>';
    }
}

// Open Detail View
window.openNoticeDetail = function (id) {
    const notice = window.currentSemesterNotices.find(n => n.id === id);
    if (!notice) return;

    // Populate Details
    document.getElementById('detail-title').innerText = notice.title;
    document.getElementById('detail-date').innerHTML = `<i class="far fa-calendar-alt"></i> ${notice.date}`;
    document.getElementById('detail-content').innerHTML = notice.content; // Render HTML

    // Handle PDF Action in Detail View
    const actionsContainer = document.getElementById('detail-actions');
    if (actionsContainer) {
        actionsContainer.innerHTML = '';
        if (notice.hasPdf) {
            actionsContainer.innerHTML = `
                <a href="${notice.pdfLink}" class="btn primary" target="_blank" style="display:inline-flex; align-items:center; gap:0.5rem; margin-top:2rem;">
                    <i class="fas fa-file-download"></i> Download PDF
                </a>
            `;
        }
    }

    // Switch View
    switchSection('notice-view');
};

// Share Function
window.shareNotice = function (id) {
    const link = `https://ny-ee-upgrad.com/notices/${id}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast("Link Copied!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast("Failed to copy link");
    });
};

// Load Blogs Function
async function loadBlogs(semesterFolder) {
    const container = document.getElementById('blogs-grid');
    if (!container) return;

    // Feature Check: Only availble for 2nd Sem+
    if (semesterFolder === 'first-semister') {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                <i class="fas fa-rocket" style="font-size: 3rem; margin-bottom: 1rem; color: var(--primary);"></i>
                <h3>Feature Coming Soon</h3>
                <p>Class Blogs are available from <strong>Second Semester</strong> onwards.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="loading-spinner">Loading blogs...</div>';

    try {
        const response = await fetch(`data/${semesterFolder}/blogs.json?t=${new Date().getTime()}`);

        if (!response.ok) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No blogs found for this semester.</div>';
            return;
        }

        const blogs = await response.json();
        window.currentSemesterBlogs = blogs;

        container.innerHTML = '';

        if (!blogs || blogs.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No blogs posted yet.</div>';
            return;
        }

        blogs.forEach(blog => {
            const card = document.createElement('div');
            card.className = 'blog-card scroll-reveal';

            // Extract snippet from content (strip HTML)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = blog.content;
            let snippet = tempDiv.textContent || tempDiv.innerText || "";
            snippet = snippet.length > 120 ? snippet.substring(0, 120) + '...' : snippet;

            card.innerHTML = `
                <div class="blog-header">
                    <span class="blog-class-badge">${blog.className}</span>
                    <span class="blog-date"><i class="far fa-calendar-alt"></i> ${blog.date}</span>
                </div>
                <div class="blog-body">
                    <h3 class="blog-topic">${blog.topic}</h3>
                    <p class="blog-snippet">${snippet}</p>
                </div>
                <div class="blog-footer">
                    <button onclick="openBlog('${blog.id}')" class="btn-read-blog">Read Full Note <i class="fas fa-arrow-right"></i></button>
                </div>
            `;
            container.appendChild(card);
        });

        // Trigger reveal
        setTimeout(() => {
            const reveals = container.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error("Error loading blogs:", error);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ff4444;">Failed to load blogs.</div>';
    }
}

// Open Blog Detail
window.openBlog = function (id) {
    const blog = window.currentSemesterBlogs.find(b => b.id === id);
    if (!blog) return;

    document.getElementById('blog-title').innerText = blog.topic; // Topic as Title
    document.getElementById('blog-subject').innerText = blog.className;
    document.getElementById('blog-date').innerHTML = `<i class="far fa-calendar-alt"></i> ${blog.date}`;
    document.getElementById('blog-content').innerHTML = blog.content;

    switchSection('blog-view');
};

// Load Moments Function (Independent)
async function loadMoments() {
    const grid = document.getElementById('moments-grid');
    if (!grid) return;

    try {
        const response = await fetch(`data/site-data/moments.json?t=${new Date().getTime()}`);
        if (!response.ok) {
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No moments captured yet.</div>';
            return;
        }

        const moments = await response.json();

        // Clear loading
        grid.innerHTML = '';

        if (!moments || moments.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Gallery is empty.</div>';
            return;
        }

        // Sort by Date (Newest First)
        moments.sort((a, b) => new Date(b.date) - new Date(a.date));

        moments.forEach(moment => {
            const card = document.createElement('div');
            card.className = 'moment-card scroll-reveal';

            // Handle Multiple Images
            let imagesHtml = '';
            let indicatorsHtml = '';

            // Support both old 'imageUrl' and new 'imageUrls' format for backward compatibility
            const images = moment.imageUrls || (moment.imageUrl ? [moment.imageUrl] : []);

            if (images.length > 0) {
                images.forEach((url, index) => {
                    const activeClass = index === 0 ? 'active' : '';
                    imagesHtml += `<img src="${url}" class="moment-img ${activeClass}" alt="${moment.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Event+Image'">`;
                    if (images.length > 1) {
                        indicatorsHtml += `<span class="indicator ${activeClass}" onclick="switchMomentImage(this, ${index})"></span>`;
                    }
                });
            } else {
                imagesHtml = `<img src="https://via.placeholder.com/400x300?text=No+Image" class="moment-img active" alt="No Image">`;
            }

            card.innerHTML = `
                <div class="moment-image-wrapper" ontouchstart="handleTouchStart(event)" ontouchmove="handleTouchMove(event)" ontouchend="handleTouchEnd(event)">
                    <div class="moment-slider">
                        ${imagesHtml}
                    </div>
                    ${images.length > 1 ? `<div class="moment-indicators">${indicatorsHtml}</div>` : ''}
                    <div class="moment-overlay">
                        <span class="moment-date"><i class="far fa-calendar-alt"></i> ${moment.date}</span>
                    </div>
                    ${images.length > 1 ? `
                        <button class="slider-btn prev" onclick="moveSlide(this, -1)">&#10094;</button>
                        <button class="slider-btn next" onclick="moveSlide(this, 1)">&#10095;</button>
                    ` : ''}
                </div>
                <div class="moment-info">
                    <h3 class="moment-title">${moment.title}</h3>
                    <p class="moment-caption">${moment.caption}</p>
                </div>
            `;
            grid.appendChild(card);
        });

        // Trigger reveal
        setTimeout(() => {
            const reveals = grid.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error("Error loading moments:", error);
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ff4444;">Failed to load moments.</div>';
    }
}

// Slider Logic
window.moveSlide = function (btn, direction) {
    const wrapper = btn.closest('.moment-image-wrapper');
    const images = wrapper.querySelectorAll('.moment-img');
    const indicators = wrapper.querySelectorAll('.indicator');
    let activeIndex = Array.from(images).findIndex(img => img.classList.contains('active'));

    images[activeIndex].classList.remove('active');
    if (indicators.length > 0) indicators[activeIndex].classList.remove('active');

    let newIndex = activeIndex + direction;
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;

    images[newIndex].classList.add('active');
    if (indicators.length > 0) indicators[newIndex].classList.add('active');
};

window.switchMomentImage = function (indicator, index) {
    const wrapper = indicator.closest('.moment-image-wrapper');
    const images = wrapper.querySelectorAll('.moment-img');
    const indicators = wrapper.querySelectorAll('.indicator');

    // Deactivate all
    images.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));

    // Activate specific
    images[index].classList.add('active');
    indicators[index].classList.add('active');
}


// Touch Swipe Logic for Mobile
let xDown = null;
let yDown = null;

window.handleTouchStart = function (evt) {
    const firstTouch = evt.touches[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};

window.handleTouchMove = function (evt) {
    if (!xDown || !yDown) {
        return;
    }

    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;

    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
        const wrapper = evt.target.closest('.moment-image-wrapper');
        if (!wrapper) return;

        // Prevent scrolling if swiping horizontally on slider
        if (Math.abs(xDiff) > 10) evt.preventDefault();

        if (xDiff > 0) {
            /* left swipe */
            const nextBtn = wrapper.querySelector('.next');
            if (nextBtn) nextBtn.click();
        } else {
            /* right swipe */
            const prevBtn = wrapper.querySelector('.prev');
            if (prevBtn) prevBtn.click();
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};

window.handleTouchEnd = function (evt) {
    xDown = null;
    yDown = null;
};

// Load Hall of Fame Function (Contributors & Donators)
async function loadHallOfFame() {
    const contributorsGrid = document.getElementById('contributors-grid');
    const donatorsGrid = document.getElementById('donators-grid');

    if (!contributorsGrid && !donatorsGrid) return;

    try {
        const response = await fetch(`data/site-data/hall-of-fame.json?t=${new Date().getTime()}`);
        if (!response.ok) return;

        const data = await response.json();

        // Load Contributors
        if (contributorsGrid && data.contributors) {
            contributorsGrid.innerHTML = '';
            data.contributors.forEach(person => {
                const card = document.createElement('div');
                card.className = 'hof-card scroll-reveal';
                card.innerHTML = `
                    <div class="hof-img-wrapper">
                        <img src="${person.image}" alt="${person.name}" loading="lazy">
                        <div class="hof-glow"></div>
                    </div>
                    <div class="hof-info">
                        <h3>${person.name}</h3>
                        <p class="hof-roll">${person.roll}</p>
                    </div>
                `;
                contributorsGrid.appendChild(card);
            });
        }

        // Load Donators
        if (donatorsGrid && data.donators) {
            donatorsGrid.innerHTML = '';
            data.donators.forEach(person => {
                const card = document.createElement('div');
                card.className = 'hof-card donator scroll-reveal';
                card.innerHTML = `
                    <div class="hof-img-wrapper">
                        <img src="${person.image}" alt="${person.name}" loading="lazy">
                        <div class="hof-glow gold"></div>
                    </div>
                    <div class="hof-info">
                        <h3>${person.name}</h3>
                        <p class="hof-roll">${person.roll}</p>
                    </div>
                `;
                donatorsGrid.appendChild(card);
            });
        }

        // Trigger reveal
        setTimeout(() => {
            const reveals = document.querySelectorAll('.hof-card.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error("Error loading Hall of Fame:", error);
    }
}



// Toggle FAQ Item
window.toggleFaq = function (element) {
    const answer = element.querySelector('.faq-answer');
    const isActive = element.classList.contains('active');

    // Close all others
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
    });

    if (!isActive) {
        element.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + "px";
    }
};

// Settings Interactions
function initSettings() {
    // Semester Selection
    const semesterOptions = document.querySelectorAll('.semester-option:not(.disabled)');

    semesterOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all
            semesterOptions.forEach(opt => opt.classList.remove('active'));
            // Add to clicked
            option.classList.add('active');
            // Check the hidden radio
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;

                // Determine semantic value
                const semName = option.querySelector('.sem-name').innerText;
                let semFolder = 'first-semister';
                if (semName.includes('Second')) semFolder = 'second-semister';
                else if (semName.includes('Third')) semFolder = 'third-semister';

                // Update Display
                const display = document.getElementById('current-semester-display');
                if (display) display.innerText = `Current: ${semName}`;

                // Reload Resources
                loadResources(semFolder);
                loadNotices(semFolder); // Reload Notices
                loadBlogs(semFolder); // Reload Blogs
            }
        });
    });

    // Experimental Toggle
    const expToggle = document.getElementById('experimental-toggle');
    if (expToggle) {
        expToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                console.log("Experimental Mode Enabled: Command Interface Loading...");
                alert("Experimental Mode Enabled. (Command Interface coming soon!)");
            } else {
                console.log("Experimental Mode Disabled");
            }
        });
    }
}

// Load Resources Function
async function loadResources(semesterFolder) {
    const grid = document.getElementById('resources-grid');
    if (!grid) return;

    // Show loading
    grid.innerHTML = '<div class="loading-spinner" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Loading subjects...</div>';

    try {
        const [subjectsResponse, linksResponse] = await Promise.all([
            fetch(`data/${semesterFolder}/subject.json?t=${new Date().getTime()}`),
            fetch(`data/${semesterFolder}/resources-link.json?t=${new Date().getTime()}`)
        ]);

        if (!subjectsResponse.ok) throw new Error('Failed to load subjects');

        const subjects = await subjectsResponse.json();
        const resourceLinks = linksResponse.ok ? await linksResponse.json() : []; // Handle if file missing or empty

        // Clear loading
        grid.innerHTML = '';

        if (!subjects || subjects.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No subjects found for this semester.</div>';
            return;
        }

        subjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'resource-card scroll-reveal';
            // Make card clickable
            card.style.cursor = 'pointer';
            card.onclick = () => openSubjectResources(sub, resourceLinks);

            // Icon mapping - Font Awesome
            let icon = '<i class="fas fa-book"></i>';
            if (sub.type === 'Lab') icon = '<i class="fas fa-flask"></i>';

            card.innerHTML = `
                <div class="resource-icon-wrapper">
                    ${icon}
                </div>
                <div class="resource-info">
                    <h3>${sub.name}</h3>
                    <div class="meta-tags">
                        <span class="meta-tag code">${sub.code}</span>
                        <span class="meta-tag">${sub.type}</span>
                    </div>
                </div>
                <div class="resource-action">
                    <button class="btn-arrow">➔</button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Re-initialize scroll reveal for new elements
        setTimeout(() => {
            const reveals = grid.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ff4444; padding: 2rem;">Error loading resources. Please try again later.</div>';
    }
}

// Open Subject Resources View
function openSubjectResources(subject, allLinks) {
    // Filter links for this subject
    const subjectLinks = allLinks.filter(link => link.subjectCode === subject.code);

    // Populate Header
    document.getElementById('subject-title').innerText = subject.name;
    document.getElementById('subject-code').innerText = subject.code;

    const cardsGrid = document.getElementById('pdf-cards-grid');
    cardsGrid.innerHTML = '';

    if (subjectLinks.length === 0) {
        cardsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No resources available for this subject yet.</div>';
    } else {
        subjectLinks.forEach(link => {
            const pdfCard = document.createElement('div');
            pdfCard.className = 'pdf-card scroll-reveal';
            pdfCard.innerHTML = `
                <div class="pdf-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="pdf-info">
                    <h4>${link.pdfName}</h4>
                    <p>${link.description || 'No description available.'}</p>
                </div>
                <div class="pdf-action">
                    <a href="${link.link}" target="_blank" class="btn secondary small">
                        <span class="btn-text">View / Download</span>
                        <span class="btn-icon"><i class="fas fa-download"></i></span>
                    </a>
                </div>
            `;
            cardsGrid.appendChild(pdfCard);
        });

        // Trigger reveal for new cards
        setTimeout(() => {
            const reveals = cardsGrid.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 50);
    }

    switchSection('resource-view');
}

// Navigation & Section Switching
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    window.switchSection = function (targetId) {
        console.log("Attempting switch to:", targetId);

        // Update Nav Links
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('active');
            }
        });

        // Update Sections
        sections.forEach(section => {
            // First, hide everything and remove active class
            section.classList.remove('active');

            if (section.id === targetId) {
                // For the target, make it active
                // We use a small timeout to allow display:none to be unset by the class change if needed,
                // but relying on CSS class 'active' to handle display:block is cleaner if CSS is correct.
                // However, let's force a reflow just in case animations are stuck.
                section.classList.add('active');

                // Re-trigger scroll reveal
                setTimeout(() => {
                    const reveals = section.querySelectorAll('.scroll-reveal');
                    reveals.forEach(el => el.classList.add('visible'));
                }, 50);
            }
        });

        window.scrollTo(0, 0);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            // Update fragment without scrolling
            if (history.pushState) {
                history.pushState(null, null, '#' + target);
            } else {
                location.hash = target;
            }
            switchSection(target);
        });
    });

    // Handle Deep Linking / Refresh
    const hash = window.location.hash.substring(1);
    if (hash) {
        // Check if it's a valid section
        const targetSection = document.getElementById(hash);
        if (targetSection && targetSection.classList.contains('page-section')) {
            switchSection(hash);
        } else {
            switchSection('home');
        }
    } else {
        switchSection('home');
    }
}

// Mobile Menu Toggle
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    const body = document.body;
    const navLinks = document.querySelectorAll('.nav a');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
            body.classList.toggle('nav-open');
        });

        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                body.classList.remove('nav-open');
            });
        });

        // Close menu when clicking outside (on the overlay)
        document.addEventListener('click', (e) => {
            if (body.classList.contains('nav-open') &&
                !nav.contains(e.target) &&
                !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                body.classList.remove('nav-open');
            }
        });
    }
}

// Canvas Background Animation - Optimized
function initBackgroundCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    // Config: Reduced count and calculation frequency
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 20 : 40;
    const connectionDistance = isMobile ? 100 : 150;
    const particleSpeed = 0.3; // Slower is smoother

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * particleSpeed;
            this.vy = (Math.random() - 0.5) * particleSpeed;
            this.size = Math.random() * 2 + 0.5;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges instead of bounce for smoother flow
            if (this.x < 0) this.x = width;
            else if (this.x > width) this.x = 0;

            if (this.y < 0) this.y = height;
            else if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.fillStyle = 'rgba(0, 242, 255, 0.4)'; // Reduced opacity
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Optimizing nested loop
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();
            p.draw();

            // Draw connections - Optimized: only check a few neighbors or use distance
            // We keep the standard check but with fewer particles it's fine.
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;

                // Quick check before sqrt
                if (Math.abs(dx) > connectionDistance || Math.abs(dy) > connectionDistance) continue;

                const distSq = dx * dx + dy * dy;
                const connDistSq = connectionDistance * connectionDistance;

                if (distSq < connDistSq) {
                    const opacity = 1 - (distSq / connDistSq);
                    ctx.strokeStyle = `rgba(0, 242, 255, ${0.15 * opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resize();
            createParticles();
        }, 200);
    });

    resize();
    createParticles();
    animate();
}

// Scroll Reveal Observer
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once visible to save resources
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// 3D Tilt Effect - Optimized with requestAnimationFrame
function initTiltEffect() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        let bounds;

        function rotateToMouse(e) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const leftX = mouseX - bounds.x;
            const topY = mouseY - bounds.y;
            const center = {
                x: leftX - bounds.width / 2,
                y: topY - bounds.height / 2
            };
            const distance = Math.sqrt(center.x ** 2 + center.y ** 2);

            card.style.transform = `
                perspective(1000px)
                scale3d(1.02, 1.02, 1.02)
                rotate3d(
                    ${center.y / 100},
                    ${-center.x / 100},
                    0,
                    ${Math.log(distance) * 2}deg
                )
            `;

            // Add dynamic glow position
            const glow = card.querySelector('.card-glow');
            if (glow) {
                glow.style.background = `
                radial-gradient(
                    circle at ${leftX}px ${topY}px, 
                    rgba(255, 255, 255, 0.1), 
                    transparent 40%
                )
               `;
            }
        }

        // Throttle updates
        let animationFrameId = null;

        card.addEventListener('mouseenter', () => {
            bounds = card.getBoundingClientRect();
        });

        card.addEventListener('mousemove', (e) => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => rotateToMouse(e));
        });

        card.addEventListener('mouseleave', () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            card.style.transform = '';
            const glow = card.querySelector('.card-glow');
            if (glow) glow.style.background = '';
        });
    });
}
