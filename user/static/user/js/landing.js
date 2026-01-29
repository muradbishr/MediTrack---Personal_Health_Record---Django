// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function () {
  console.log('Landing page loaded');

  // Add entrance animations
  const content = document.querySelector('.landing-content');
  if (content) {
    content.style.opacity = '0';
    content.style.transform = 'translateY(100px)';

    setTimeout(() => {
      content.style.transition = 'all 0.9s ease-out';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    }, 10);
  }
});

// Handle Get Started button
function handleGetStarted() {
  // Add loading state
  const button = event.target;
  const originalText = button.textContent;

  button.textContent = 'Loading...';
  button.disabled = true;
  button.style.opacity = '0.8';

  // Simulate loading and redirect to onboarding
  setTimeout(() => {
    window.location.href = onboardingUrl;
  }, 800);
}

// Handle Login button
function handleLogin() {
  // Add loading state
  const button = event.target;
  const originalText = button.textContent;

  button.textContent = 'Redirecting...';
  button.disabled = true;
  button.style.opacity = '0.8';

  // Simulate loading and redirect to login page
  setTimeout(() => {
    window.location.href = loginUrl;
  }, 800);
}

// Add keyboard navigation
document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    // If Get Started button is focused, trigger it
    const getStartedBtn = document.querySelector('.btn-primary');
    if (document.activeElement === getStartedBtn) {
      handleGetStarted();
    }

    // If Log In button is focused, trigger it
    const loginBtn = document.querySelector('.btn-secondary');
    if (document.activeElement === loginBtn) {
      handleLogin();
    }
  }
});

// Add smooth hover effects
document.querySelectorAll('.btn').forEach(button => {
  button.addEventListener('mouseenter', function () {
    this.style.transform = 'translateY(-2px)';
  });

  button.addEventListener('mouseleave', function () {
    if (!this.disabled) {
      this.style.transform = 'translateY(0)';
    }
  });
});

// Handle window resize for responsive design
function handleResize() {
  const container = document.querySelector('.landing-container');
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    container.style.padding = '1rem';
  } else {
    container.style.padding = '2rem';
  }
}

window.addEventListener('resize', handleResize);

// Initialize app
function initLanding() {
  handleResize();

  // Preload next page for faster navigation
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = onboardingUrl;
  document.head.appendChild(link);

  console.log('Landing page initialized');
}

// Call init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanding);
} else {
  initLanding();
}

// Add touch support for mobile
if ('ontouchstart' in window) {
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('touchstart', function () {
      this.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('touchend', function () {
      setTimeout(() => {
        if (!this.disabled) {
          this.style.transform = 'translateY(0)';
        }
      }, 100);
    });
  });
}

// Error handling
window.addEventListener('error', function (event) {
  console.error('Landing page error:', event.error);

  // Show user-friendly error message
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fee2e2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    border: 1px solid #fecaca;
  `;
  errorDiv.textContent = 'Something went wrong. Please refresh the page.';
  document.body.appendChild(errorDiv);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
});