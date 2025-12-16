// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
    showError('No token provided. Please request a new magic link.');
} else {
    verifyToken(token);
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            localStorage.setItem('token', data.token);

            // Show success and redirect
            document.getElementById('status-message').innerHTML = `
                <h2>✓ Success!</h2>
                <p style="color: var(--success-color); margin-top: 1rem;">
                    Redirecting to your dashboard...
                </p>
            `;

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError(data.error || 'Invalid or expired magic link');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function showError(message) {
    document.getElementById('status-message').style.display = 'none';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-container').style.display = 'block';
}
