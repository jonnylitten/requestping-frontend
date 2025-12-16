document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    const submitButton = document.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/request-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = '✓ Check your email! We sent you a magic link.';
            successDiv.style.display = 'block';
            document.getElementById('email').value = '';
            submitButton.textContent = 'Link Sent!';
        } else {
            errorDiv.textContent = data.error || 'Failed to send magic link';
            errorDiv.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Send Magic Link';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Send Magic Link';
    }
});
