document.addEventListener('DOMContentLoaded', () => {
    console.log('EEvolution 2.0 Landing Page Loaded');
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
});

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
        const response = await fetch(`data/${semesterFolder}/subject.json`);
        if (!response.ok) throw new Error('Failed to load subjects');

        const subjects = await response.json();
        // Clear loading
        grid.innerHTML = '';

        if (!subjects || subjects.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No subjects found for this semester.</div>';
            return;
        }

        subjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'feature-card scroll-reveal';
            // Add tilt data attribute for effect re-init
            card.setAttribute('data-tilt', '');

            // Icon mapping
            let icon = '📘';
            if (sub.type === 'Lab') icon = '🧪';

            card.innerHTML = `
                <div class="card-glow"></div>
                <div class="icon" style="font-size: 2rem; margin-bottom: 0.5rem;">${icon}</div>
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${sub.name}</h3>
                <p style="font-size: 0.85rem; color: var(--primary); margin-bottom: 0.25rem;">${sub.code}</p>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${sub.type} Course</p>
                <button class="btn secondary small" style="width: 100%; margin-top: 1rem; padding: 0.5rem;">View Materials</button>
            `;
            grid.appendChild(card);
        });

        // Re-initialize effects for new elements
        // We use a short timeout to ensure DOM is ready
        setTimeout(() => {
            initTiltEffect();
            const reveals = grid.querySelectorAll('.scroll-reveal');
            reveals.forEach(el => el.classList.add('visible'));
        }, 100);

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ff4444; padding: 2rem;">Error loading resources. Please try again later.</div>';
    }
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
