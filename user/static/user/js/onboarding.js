// Onboarding Page JavaScript
let currentStep = 1;
const totalSteps = 3;

document.addEventListener('DOMContentLoaded', function() {
  console.log('Onboarding page loaded');
  initOnboarding();
});

function initOnboarding() {
  // Show initial step
  showStep(currentStep);
  
  // Add keyboard navigation
  document.addEventListener('keydown', handleKeyNavigation);
  
  // Add touch support for mobile
  if ('ontouchstart' in window) {
    addTouchSupport();
  }
  
  // Preload dashboard for faster navigation
  preloadNextPage();
  
  console.log('Onboarding initialized');
}

function showStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.onboarding-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show current step
  const targetStep = document.getElementById(`step-${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
    
    // Update progress indicator if it exists
    updateProgressIndicator(stepNumber);
    
    // Focus management for accessibility
    const firstFocusable = targetStep.querySelector('button, input, [tabindex]');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }
  
  currentStep = stepNumber;
}

function updateProgressIndicator(stepNumber) {
  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((dot, index) => {
    if (index < stepNumber) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function nextStep() {
  if (currentStep < totalSteps) {
    // Add transition effect
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    currentStepElement.style.transform = 'translateX(-30px)';
    currentStepElement.style.opacity = '0';
    
    setTimeout(() => {
      showStep(currentStep + 1);
      
      // Reset and animate in new step
      const newStepElement = document.getElementById(`step-${currentStep}`);
      newStepElement.style.transform = 'translateX(30px)';
      newStepElement.style.opacity = '0';
      
      setTimeout(() => {
        newStepElement.style.transition = 'all 0.3s ease-out';
        newStepElement.style.transform = 'translateX(0)';
        newStepElement.style.opacity = '1';
      }, 50);
    }, 150);
  }
}

function previousStep() {
  if (currentStep > 1) {
    // Add transition effect
    const currentStepElement = document.getElementById(`step-${currentStep}`);
    currentStepElement.style.transform = 'translateX(30px)';
    currentStepElement.style.opacity = '0';
    
    setTimeout(() => {
      showStep(currentStep - 1);
      
      // Reset and animate in new step
      const newStepElement = document.getElementById(`step-${currentStep}`);
      newStepElement.style.transform = 'translateX(-30px)';
      newStepElement.style.opacity = '0';
      
      setTimeout(() => {
        newStepElement.style.transition = 'all 0.3s ease-out';
        newStepElement.style.transform = 'translateX(0)';
        newStepElement.style.opacity = '1';
      }, 50);
    }, 150);
  }
}

function completeOnboarding() {
  const button = event.target;
  const originalText = button.textContent;
  
  // Show loading state
  button.classList.add('loading');
  button.disabled = true;
  
  // Save onboarding completion to localStorage
  localStorage.setItem('meditrack-onboarding-completed', 'true');
  localStorage.setItem('meditrack-onboarding-date', new Date().toISOString());
  
  // Simulate loading and redirect to signup
  setTimeout(() => {
    window.location.href = 'signup.html';
  }, 1200);
}

//

function handleKeyNavigation(event) {
  switch (event.key) {
    case 'ArrowRight':
    case 'Enter':
      if (event.target.classList.contains('continue-btn')) {
        if (currentStep === totalSteps) {
          completeOnboarding();
        } else {
          nextStep();
        }
      }
      break;
      
    case 'ArrowLeft':
      if (currentStep > 1) {
        previousStep();
      }
      break;
      
    
  }
}

function addTouchSupport() {
  // Add touch feedback to buttons
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('touchstart', function() {
      this.style.transform = 'translateY(-1px)';
    });
    
    button.addEventListener('touchend', function() {
      setTimeout(() => {
        if (!this.disabled) {
          this.style.transform = 'translateY(0)';
        }
      }, 100);
    });
  });
  
  // Add swipe gesture support
  let startX = 0;
  let startY = 0;
  
  document.addEventListener('touchstart', function(event) {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  });
  
  document.addEventListener('touchend', function(event) {
    if (!startX || !startY) return;
    
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    
    const deltaX = startX - endX;
    const deltaY = startY - endY;
    
    // Check if it's a horizontal swipe (not vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe left - go to next step
        if (currentStep < totalSteps) {
          nextStep();
        }
      } else {
        // Swipe right - go to previous step
        if (currentStep > 1) {
          previousStep();
        }
      }
    }
    
    startX = 0;
    startY = 0;
  });
}

function preloadNextPage() {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = 'dashboard.html';
  document.head.appendChild(link);
}

// Analytics tracking (placeholder for future implementation)
function trackOnboardingStep(stepNumber, action) {
  const eventData = {
    event: 'onboarding_step',
    step: stepNumber,
    action: action,
    timestamp: new Date().toISOString()
  };
  
  // Store in localStorage for now (would send to analytics service in production)
  const analytics = JSON.parse(localStorage.getItem('meditrack-analytics') || '[]');
  analytics.push(eventData);
  localStorage.setItem('meditrack-analytics', JSON.stringify(analytics));
  
  console.log('Onboarding event tracked:', eventData);
}

// Add smooth hover effects to cards
document.querySelectorAll('.feature-card, .ux-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-4px)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
});

// Error handling
window.addEventListener('error', function(event) {
  console.error('Onboarding error:', event.error);
  
  // Show user-friendly error message
  showNotification('Something went wrong. Please refresh the page.', 'error');
});

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    max-width: 300px;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
  `;
  
  if (type === 'error') {
    notification.style.background = '#fee2e2';
    notification.style.color = '#dc2626';
    notification.style.border = '1px solid #fecaca';
  } else {
    notification.style.background = '#dbeafe';
    notification.style.color = '#1d4ed8';
    notification.style.border = '1px solid #bfdbfe';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Handle window resize for responsive design
function handleResize() {
  const isMobile = window.innerWidth <= 768;
  
  // Adjust animations for mobile
  if (isMobile) {
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.style.transition = 'opacity 0.3s ease-out';
    });
  }
}

window.addEventListener('resize', handleResize);

// Initialize responsive behavior
handleResize();

// Track when onboarding starts
trackOnboardingStep(1, 'started');