document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('forgot-form').addEventListener('submit', handleForgot);
});

function toggleAuthForm(formId) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(formId).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.innerHTML = 'Logging In... <i class="ph ph-spinner ph-spin"></i>';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

    if (error) {
        showToast(error.message, "error");
        btn.disabled = false;
        btn.innerHTML = 'Log In <i class="ph ph-sign-in"></i>';
    } else {
        window.location.href = "index.html";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const rollLast3 = document.getElementById('reg-roll').value.trim();
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-register');

    if (!/^\d{3}$/.test(rollLast3)) {
        showToast("Roll number must be exactly 3 digits.", "error");
        return;
    }

    const fullRoll = `25/EE/${rollLast3}`;

    btn.disabled = true;
    btn.innerHTML = 'Registering... <i class="ph ph-spinner ph-spin"></i>';

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: pass,
        options: {
            data: {
                name: name,
                roll_number: fullRoll
            }
        }
    });

    if (error) {
        showToast(error.message, "error");
        btn.disabled = false;
        btn.innerHTML = 'Register <i class="ph ph-user-plus"></i>';
    } else {
        showCenterAlert("Check Your Inbox!", "Registration successful! We've sent a verification link to your email. Please verify before logging in.", "success");
        toggleAuthForm('login-form');
        btn.disabled = false;
        btn.innerHTML = 'Register <i class="ph ph-user-plus"></i>';
    }
}

async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('btn-forgot');

    btn.disabled = true;
    btn.innerHTML = 'Sending... <i class="ph ph-spinner ph-spin"></i>';

    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    if (error) {
        showToast(error.message, "error");
    } else {
        showCenterAlert("Check Your Inbox!", "We've sent a password reset link to your email.", "success");
    }
    btn.disabled = false;
    btn.innerHTML = 'Send Reset Link <i class="ph ph-envelope-simple"></i>';
}

