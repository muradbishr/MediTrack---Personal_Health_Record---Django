// Signup Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('Signup page loaded');
  initSignup();
});

function initSignup() {
  setupFormValidation();
  setupPasswordToggle();
  addFormSubmitHandler();
  console.log('Signup initialized');
}

// Form validation setup
function setupFormValidation() {
  const form = document.getElementById('signup-form');
  const inputs = form.querySelectorAll('input[required]');
  
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => clearFieldError(input));
  });
  
  // Real-time password validation
  const passwordInput = document.getElementById('password');
  passwordInput.addEventListener('input', validatePasswordStrength);
}

// --- CSRF helper (Django) ---
function getCookie(name) {
  const cookie = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}
const CSRFTOKEN = getCookie('csrftoken');

// --- call server to check if email exists ---


function validateField(input) {
  const fieldName = input.name;
  const value = input.value.trim();
  let isValid = true;
  let errorMessage = '';
  
  // Clear previous error state
  clearFieldError(input);
  
  switch (fieldName) {
    case 'firstName':
      if (!value) {
        errorMessage = 'First name is required';
        isValid = false;
      } else if (value.length < 2) {
        errorMessage = 'First name must be at least 2 characters';
        isValid = false;
      }
      break;
      
    case 'lastName':
      if (!value) {
        errorMessage = 'Last name is required';
        isValid = false;
      } else if (value.length < 2) {
        errorMessage = 'Last name must be at least 2 characters';
        isValid = false;
      }
      break;
      
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
      const passwordValidation = validatePassword(value);
      if (!passwordValidation.isValid) {
        errorMessage = passwordValidation.message;
        isValid = false;
      }
      break;
      
    case 'terms':
      if (!input.checked) {
        errorMessage = 'You must agree to the Terms of Service';
        isValid = false;
      }
      break;
  }
  
  if (!isValid) {
    showFieldError(input, errorMessage);
  }
  
  return isValid;
}

function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least 1 special character' };
  }
  
  return { isValid: true, message: '' };
}

function validatePasswordStrength(event) {
  const password = event.target.value;
  const requirementText = document.querySelector('.requirement-text');
  
  if (!requirementText) return;
  
  const validation = validatePassword(password);
  
  if (password.length === 0) {
    requirementText.textContent = 'Must be at least 8 characters with 1 number and 1 special character';
    requirementText.style.color = '#6b7280';
  } else if (validation.isValid) {
    requirementText.textContent = 'Password meets requirements ✓';
    requirementText.style.color = '#059669';
  } else {
    requirementText.textContent = validation.message;
    requirementText.style.color = '#dc2626';
  }
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
  window.togglePassword = function(inputId) {
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

// Form submission
function addFormSubmitHandler() {
  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    await handleSignup(); // no dashboard redirect
  });
}


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

async function handleSignup() {
  const form = document.getElementById('signup-form');
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');

  // Validate all fields
  const inputs = form.querySelectorAll('input[required]');
  let isFormValid = true;

  inputs.forEach(input => {
    if (!validateField(input)) {
      isFormValid = false;
    }
  });

  if (!isFormValid) {
    showNotification('Please fix the errors above', 'error');
    return false;
  }

  // Show loading state
  submitButton.classList.add('loading');
  submitButton.disabled = true;

  try {
    // Send POST request to Django signup endpoint
    const response = await fetch('/signup/', {
  method: 'POST',
  body: formData,
  headers: { 
    "X-CSRFToken": getCSRFToken()
  }
});

    const result = await response.json();

    if (!result.success) {
      showNotification(result.message || 'Failed to create account', 'error');
      return false;
    }
  // in handleSignup() after server success:
  if (result.success) {
    // do NOT store meditrack-authenticated -> keep user logged out
    showNotification('Account created. Check your email for a 6-digit code', 'success');
    // redirect to OTP page for this email
    const email = encodeURIComponent(result.user.email);
    window.location.href = `/enter-otp/?email=${email}`;
    return true;
  }



  } catch (error) {
    console.error('Signup error:', error);
    showNotification('Failed to create account. Please try again.', 'error');
    return false;

  } finally {
    submitButton.classList.remove('loading');
    submitButton.disabled = false;
  }
}


async function simulateSignupAPI(formData) {
  // Build JSON payload
  const payload = {};
  for (const [k, v] of formData.entries()) payload[k] = v;

  try {
    const resp = await fetch('/user/api/signup/', { // match the URL above
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': CSRFTOKEN
      },
      body: JSON.stringify(payload)
    });

    const json = await resp.json().catch(()=>({}));

    // handle duplicate email (409) and other errors
    if (!resp.ok) {
      if (resp.status === 409) {
        throw new Error(json.error || 'Email already exists');
      }
      throw new Error(json.error || 'Signup failed');
    }

    // success
    console.log('Server signup success for:', json.email || payload.email);
    return { success: true, data: json };

  } catch (err) {
    console.error('Server signup error:', err);
    throw err;
  }
}


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
window.signUpWithGoogle = async function(event) {
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

    showNotification('Account created with Google! Redirecting...', 'success');

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
window.signUpWithApple = async function(event) {
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

    showNotification('Account created with Apple! Redirecting...', 'success');

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


// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Add notification styles dynamically
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

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Keyboard navigation
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
    const form = document.getElementById('signup-form');
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

// Handle browser back/forward
window.addEventListener('popstate', function(event) {
  // Clear any ongoing processes
  const loadingButtons = document.querySelectorAll('.btn.loading');
  loadingButtons.forEach(button => {
    button.classList.remove('loading');
    button.disabled = false;
  });
});

// Error handling
window.addEventListener('error', function(event) {
  console.error('Signup page error:', event.error);
  showNotification('Something went wrong. Please refresh the page.', 'error');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  const notifications = document.querySelectorAll('.notification');
  notifications.forEach(notification => notification.remove());
});