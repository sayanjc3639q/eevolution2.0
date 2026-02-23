// Supabase Configuration
// Leave these as placeholders for the user to replace later.
const supabaseUrl = 'https://mnkytgygusfxngrdnseg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ua3l0Z3lndXNmeG5ncmRuc2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg2MzAsImV4cCI6MjA4NzMzNDYzMH0.A_upRIOaFRCFVMPVX2VVXornCtG3pGVQ7qLYBwijIUs';

// Initialize Supabase Client
// We attach it to the window object so other scripts can access it globally.
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global Toast Notification System
window.showToast = function (message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 400); // Wait for transition to finish
    }, 4000);
};

// Global Centered Alert Modal (for critical actions like email verification)
window.showCenterAlert = function (title, message, type = 'success') {
    let overlay = document.getElementById('center-alert-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'center-alert-overlay';
        document.body.appendChild(overlay);
    }

    const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';

    overlay.innerHTML = `
        <div class="center-alert-box ${type}">
            <i class="ph ${iconClass} center-alert-icon"></i>
            <h3 class="center-alert-title">${title}</h3>
            <p class="center-alert-message">${message}</p>
            <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="document.getElementById('center-alert-overlay').classList.remove('show')">Got it <i class="ph ph-check"></i></button>
        </div>
    `;

    // Small delay to ensure CSS transition triggers
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
};
