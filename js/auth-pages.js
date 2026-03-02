let studentsData = {};
let isVerified = false;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('forgot-form').addEventListener('submit', handleForgot);

    // 1. Load Students Dictionary
    try {
        const response = await fetch('data/students.json');
        studentsData = await response.json();
        setupVerificationListener();
    } catch (error) {
        console.error("Failed to load student dictionary:", error);
    }
});

function setupVerificationListener() {
    const rollInput = document.getElementById('reg-roll');
    const nameInput = document.getElementById('user-name');
    const verifyCheck = document.getElementById('verify-check');
    const rollMessage = document.getElementById('roll-message');
    const registerBtn = document.getElementById('btn-register');

    if (!rollInput || !nameInput || !rollMessage || !registerBtn) return;

    // Initially disable if empty or no match
    registerBtn.disabled = true;

    rollInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();

        // Clear previous state
        rollMessage.innerText = "";
        rollMessage.className = "text-sm mt-1";
        verifyCheck.classList.remove('active');
        registerBtn.disabled = true;

        if (val.length === 3) {
            const rollNum = parseInt(val);

            if (val === "000") {
                // Check if test mode is active
                checkTestModeStatus();
            } else if (rollNum >= 1 && rollNum <= 72) {
                // 2. Batch 1 Logic (001 to 072)
                rollMessage.innerText = "Batch 1 members cannot register currently. Ask Admin for access.";
                rollMessage.classList.add("text-warning");
                nameInput.value = "";
                nameInput.readOnly = false;
                isVerified = false;
            } else if (studentsData[val]) {
                // 3. Batch 2 Logic (Valid JSON Match)
                rollMessage.innerText = "";
                nameInput.value = studentsData[val];
                nameInput.readOnly = true;
                verifyCheck.classList.add('active');
                isVerified = true;
                registerBtn.disabled = false; // ENABLE ONLY HERE
                document.getElementById('test-code-area').classList.add('hidden');
            } else {
                // 4. Unknown Roll
                rollMessage.innerText = "Roll number not found. Access denied.";
                rollMessage.classList.add("text-error");
                nameInput.value = "";
                nameInput.readOnly = false;
                isVerified = false;
                document.getElementById('test-code-area').classList.add('hidden');
            }
        } else {
            // Partial input
            if (nameInput.readOnly) {
                nameInput.value = "";
                nameInput.readOnly = false;
            }
            isVerified = false;
            document.getElementById('test-code-area').classList.add('hidden');
        }
    });
}

async function checkTestModeStatus() {
    const rollMessage = document.getElementById('roll-message');
    const nameInput = document.getElementById('user-name');
    const testArea = document.getElementById('test-code-area');
    const registerBtn = document.getElementById('btn-register');

    try {
        const { data, error } = await supabaseClient
            .from('system_config')
            .select('value')
            .eq('key', 'test_mode_code')
            .maybeSingle();

        if (data && data.value && data.value !== 'DISABLED' && data.value !== 'INIT') {
            rollMessage.innerText = "Test Hub Access Detected.";
            rollMessage.className = "text-sm mt-1 text-success";
            nameInput.value = "Fetching Test Identity...";
            nameInput.readOnly = true;
            testArea.classList.remove('hidden');

            // Fetch next test user number
            const { count } = await supabaseClient
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .ilike('name', 'Test User %');

            nameInput.value = `Test User ${(count || 0) + 1}`;
            registerBtn.disabled = false;
            window.activeTestCode = data.value;
        } else {
            rollMessage.innerText = "Invalid roll number.";
            rollMessage.classList.add("text-error");
            nameInput.value = "";
            nameInput.readOnly = false;
            testArea.classList.add('hidden');
        }
    } catch (e) {
        console.error("Test mode check failed", e);
    }
}



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

    // 0. Test User Validation
    if (rollLast3 === '000') {
        const inputCode = document.getElementById('test-code-input').value.trim();
        if (inputCode !== window.activeTestCode) {
            showToast("Invalid Test Activation Code. Ask admin for the current code.", "error");
            btn.disabled = false;
            btn.innerHTML = 'Register <i class="ph ph-user-plus"></i>';
            return;
        }
    }

    btn.disabled = true;
    btn.innerHTML = 'Checking... <i class="ph ph-spinner ph-spin"></i>';

    // 1. Check if roll number is already registered (skip for test users to allow infinite testing)
    if (rollLast3 !== '000') {
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('roll_number', fullRoll)
            .maybeSingle();

        if (checkError) {
            console.error("Database check failed:", checkError);
        }

        if (existingUser) {
            showToast("Roll Number already registered. Please login.", "error");
            btn.disabled = false;
            btn.innerHTML = 'Register <i class="ph ph-user-plus"></i>';
            return;
        }
    }


    // 2. Heuristic Email Validation
    if (!isEmailGenuine(name, email)) {
        showToast("Please use a personalized email address consisting of your name (e.g., firstname@gmail.com).", "error");
        btn.disabled = false;
        btn.innerHTML = 'Register <i class="ph ph-user-plus"></i>';
        return;
    }

    btn.innerHTML = 'Registering... <i class="ph ph-spinner ph-spin"></i>';

    // For test users, we append a timestamp to allow multiple '000' registrations in the DB
    const finalRoll = rollLast3 === '000' ? `${fullRoll}-${Date.now()}` : fullRoll;

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: pass,
        options: {
            data: {
                name: name,
                roll_number: finalRoll,
                is_batch2_verified: rollLast3 === '000' ? true : isVerified // Test users are auto-verified
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

/**
 * Heuristic Check: Ensures the email looks personalized to the student.
 */
function isEmailGenuine(fullName, email) {
    if (!fullName || !email) return false;

    // Bypass for Test Users
    if (fullName.startsWith('Test User')) return true;

    const cleanName = fullName.toLowerCase().trim();

    const emailPrefix = email.toLowerCase().split("@")[0];

    const nameParts = cleanName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    const hasFirstName = emailPrefix.includes(firstName);
    const hasLastName = lastName ? emailPrefix.includes(lastName) : false;

    return hasFirstName || hasLastName;
}

