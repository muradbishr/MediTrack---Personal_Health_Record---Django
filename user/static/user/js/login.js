// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function () {
  console.log('Login page loaded');
  initLogin();
});

function initLogin() {
  setupFormValidation();
  setupPasswordToggle();
  addFormSubmitHandler();
  setupForgotPassword();
  console.log('Login initialized');
}

// Form validation setup
function setupFormValidation() {
  const form = document.getElementById('login-form');
  const inputs = form.querySelectorAll('input[required]');

  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => clearFieldError(input));
  });
}

function validateField(input) {
  const fieldName = input.name;
  const value = input.value.trim();
  let isValid = true;
  let errorMessage = '';

  // Clear previous error state
  clearFieldError(input);

  switch (fieldName) {
    case 'email':
      if (!value) {
        errorMessage = 'Email is required';
        isValid = false;
      } else if (!isValidEmail(value)) {
        errorMessage = 'Please enter a valid email address';
        isValid = false;
      }
      break;

    case 'password':
      if (!value) {
        errorMessage = 'Password is required';
        isValid = false;
      } else if (value.length < 8) {
        errorMessage = 'Password must be at least 8 characters';
        isValid = false;
      }
      break;
  }

  if (!isValid) {
    showFieldError(input, errorMessage);
  }

  return isValid;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showFieldError(input, message) {
  input.classList.add('error');
  const errorElement = document.getElementById(`${input.name}-error`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFieldError(input) {
  input.classList.remove('error');
  const errorElement = document.getElementById(`${input.name}-error`);
  if (errorElement) {
    errorElement.textContent = '';
  }
}

// Password toggle functionality
function setupPasswordToggle() {
  window.togglePassword = function (inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentNode.querySelector('.password-toggle');
    const icon = button.querySelector('.eye-icon');

    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12A18.45 18.45 0 0 1 5.06 5.06L17.94 17.94Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.61 23 12A18.5 18.5 0 0 1 19.42 16.42" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M1 1L23 23" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
      `;
    } else {
      input.type = 'password';
      icon.innerHTML = `
        <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
      `;
    }
  };
}

// Forgot password functionality
function setupForgotPassword() {
  const forgotPasswordLink = document.querySelector('.forgot-password');

  forgotPasswordLink.addEventListener('click', function (event) {
    event.preventDefault();
    handleForgotPassword();
  });
}

function handleForgotPassword() {
  const email = document.getElementById('email').value.trim();

  if (!email) {
    showNotification('Please enter your email address first', 'error');
    document.getElementById('email').focus();
    return;
  }

  if (!isValidEmail(email)) {
    showNotification('Please enter a valid email address', 'error');
    document.getElementById('email').focus();
    return;
  }

  // Simulate password reset email
  showNotification(`Password reset instructions sent to ${email}`, 'success');
}

// Form submission
function addFormSubmitHandler() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const success = await handleLoginForm();
    if (success) {
      const user = JSON.parse(localStorage.getItem('meditrack-user') || '{}');
      const redirectUrl = user.is_doctor ? '/careprovider/' : '/dashboard/';

      // Show success notification (if not already shown)
      showNotification('Login successful — redirecting...', 'success');

      // Allow the toast to be visible for 800ms before redirecting
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 800);
    }
  });
}


async function handleLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) { console.error('[login.js] form missing'); return false; }
  const email = (form.querySelector('input[name="email"]')?.value || '').trim();
  const password = (form.querySelector('input[name="password"]')?.value || '').trim();

  if (!email || !password) {
    showNotification('Email and password are required', 'error');
    return false;
  }

  try {
    // NB: ensure this endpoint matches your Django urls.py
    const resp = await fetch('/login_check/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    console.log('[login.js] server response status', resp.status);

    // handle non-2xx early (e.g., 403 for email_not_verified)
    const body = await resp.json().catch(()=>null);
    if (!resp.ok) {
      console.warn('[login.js] non-ok response', resp.status, body);
      if (body && body.reason === 'email_not_verified') {
        showNotification('Email not verified. Redirecting...', 'error');
        window.location.href = body.enter_otp_url || `/enter-otp/?email=${encodeURIComponent(email)}`;
        return false;
      }
      showNotification(body?.message || `Server returned ${resp.status}`, 'error');
      return false;
    }

    if (!body || !body.success) {
      showNotification(body?.message || 'Login failed', 'error');
      return false;
    }

    localStorage.setItem('meditrack-user', JSON.stringify(body.user || {}));
    localStorage.setItem('meditrack-authenticated', 'true');

    showNotification('Login successful', 'success');
    return true;
  } catch (err) {
    console.error('[login.js] fetch error', err);
    showNotification(err.message || 'Login error', 'error');
    return false;
  }
}




async function simulateLoginAPI(formData) {
  const response = await fetch('/login_check/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password')
    })
  });



  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message);  // Backend message will be shown
  }

  // Use the backend 'user' object directly
  return {
    user: result.user  // <-- contains first_name, last_name, email
  };
}






// Google login simulation
// Utility to generate random string
function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Utility to generate a random user
function generateFakeUser(provider) {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Sam', 'Drew'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Lee', 'Davis', 'Miller', 'Wilson', 'Clark', 'Turner'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomString(3)}@${provider}.com`;

  return {
    first_name: firstName,
    last_name: lastName,
    email: email,
    password: '12345qwert!' // random password for backend
  };
}

// Google signup using Django view
window.loginWithGoogle = async function(event) {
  const button = event.target.closest('.btn-social');
  button.classList.add('loading');
  button.disabled = true;

  try {
    const userData = generateFakeUser('google');

    const formData = new FormData();
    formData.append('first_name', userData.first_name);
    formData.append('last_name', userData.last_name);
    formData.append('email', userData.email);
    formData.append('password', userData.password);

    const response = await fetch('/signup/', {
      method: 'POST',
      body: formData,
      headers: { 'X-CSRFToken': getCSRFToken() }
    });

    const result = await response.json();

    if (!result.success) {
      showNotification(result.message || 'Failed to create account', 'error');
      return;
    }

    // Save user info locally
    localStorage.setItem('meditrack-user', JSON.stringify(result.user));
    localStorage.setItem('meditrack-authenticated', 'true');

    showNotification('Account login with Google! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = dashboardUrl;
    }, 1000);

  } catch (error) {
    console.error(error);
    showNotification('Google signup failed. Please try again.', 'error');
  } finally {
    button.classList.remove('loading');
    button.disabled = false;
  }
};

// Apple signup using Django view


window.loginWithApple = async function(event) {
  const button = event.target.closest('.btn-social');
  button.classList.add('loading');
  button.disabled = true;

  try {
    const userData = generateFakeUser('apple');

    const formData = new FormData();
    formData.append('first_name', userData.first_name);
    formData.append('last_name', userData.last_name);
    formData.append('email', userData.email);
    formData.append('password', userData.password);

    const response = await fetch('/signup/', {
      method: 'POST',
      body: formData,
      headers: { 'X-CSRFToken': getCSRFToken() }
    });

    const result = await response.json();

    if (!result.success) {
      showNotification(result.message || 'Failed to create account', 'error');
      return;
    }

    // Save user info locally
    localStorage.setItem('meditrack-user', JSON.stringify(result.user));
    localStorage.setItem('meditrack-authenticated', 'true');

    showNotification('Account login with Apple! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = dashboardUrl;
    }, 1000);

  } catch (error) {
    console.error(error);
    showNotification('Apple signup failed. Please try again.', 'error');
  } finally {
    button.classList.remove('loading');
    button.disabled = false;
  }
};

// Auto-fill email if remembered
function checkRememberedUser() {
  const rememberMe = localStorage.getItem('meditrack-remember-me');
  const savedEmail = localStorage.getItem('meditrack-user-email');

  if (rememberMe && savedEmail) {
    document.getElementById('email').value = savedEmail;
    document.getElementById('rememberMe').checked = true;
    document.getElementById('password').focus();
  }
}

// Notification system (same as signup)
function showNotification(message, type = 'info') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Add notification styles
const notificationStyles = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    max-width: 320px;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }
  
  .notification.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  
  .notification.info {
    background: #dbeafe;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize remembered user check
checkRememberedUser();

// Keyboard navigation
document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
    const form = document.getElementById('login-form');
    const firstError = form.querySelector('.form-input.error');

    if (firstError) {
      firstError.focus();
    } else {
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton && !submitButton.disabled) {
        submitButton.click();
      }
    }
  }
});

// Error handling
window.addEventListener('error', function (event) {
  console.error('Login page error:', event.error);
  showNotification('Something went wrong. Please refresh the page.', 'error');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function () {
  const notifications = document.querySelectorAll('.notification');
  notifications.forEach(notification => notification.remove());
});
function getCSRFToken() {
  let cookieValue = null;
  const name = 'csrftoken';
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
