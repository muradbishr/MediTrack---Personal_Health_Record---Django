// Global app state
let state = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  isMobile: false,
  currentPage: 'dashboard'
};

// DOM elements
let elements = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
  initializeElements();
  setupEventListeners();
  checkMobile();
  setCurrentPage();
  window.addEventListener('resize', checkMobile);
});

function initializeElements() {
  elements = {
    sidebar: document.querySelector('.sidebar'),
    mobileOverlay: document.querySelector('.mobile-overlay'),
    topbarMenuBtn: document.querySelector('.topbar-menu-btn'),
    sidebarToggleBtn: document.querySelector('.sidebar-toggle-btn'),
    userMenuBtn: document.querySelector('.user-menu-btn'),
    userDropdown: document.querySelector('.dropdown-menu'),
    navItems: document.querySelectorAll('.sidebar-nav-item'),
    modals: document.querySelectorAll('.modal-overlay'),
    modalTriggers: document.querySelectorAll('[data-modal-trigger]'),
    modalCloses: document.querySelectorAll('[data-modal-close]')
  };
}

function setupEventListeners() {
  // Mobile menu toggle
  if (elements.topbarMenuBtn) {
    elements.topbarMenuBtn.addEventListener('click', toggleMobileMenu);
  }

  // Sidebar toggle (desktop)
  if (elements.sidebarToggleBtn) {
    elements.sidebarToggleBtn.addEventListener('click', toggleSidebar);
  }

  // Mobile overlay click
  if (elements.mobileOverlay) {
    elements.mobileOverlay.addEventListener('click', closeMobileMenu);
  }

  // User menu toggle
  if (elements.userMenuBtn) {
    elements.userMenuBtn.addEventListener('click', toggleUserMenu);
  }

  // Navigation items
  elements.navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      if (page) {
        navigateToPage(page);
      }
    });
  });

  // Modal functionality
  setupModals();

  // Close dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.user-menu') && elements.userDropdown) {
      elements.userDropdown.classList.remove('active');
    }
  });

  // Switch toggles
  setupSwitches();

  // Tab functionality
  setupTabs();
}

function checkMobile() {
  const mobile = window.innerWidth < 1024;
  state.isMobile = mobile;

  if (mobile) {
    state.sidebarCollapsed = true;
    state.mobileMenuOpen = false;
    if (elements.sidebar) {
      elements.sidebar.classList.add('mobile');
      elements.sidebar.classList.remove('open');
    }
  } else {
    if (elements.sidebar) {
      elements.sidebar.classList.remove('mobile', 'open');
    }
    if (elements.mobileOverlay) {
      elements.mobileOverlay.classList.remove('active');
    }
  }

  updateSidebarState();
}

function toggleMobileMenu() {
  if (state.isMobile) {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    updateMobileMenuState();
  } else {
    toggleSidebar();
  }
}

function toggleSidebar() {
  if (!state.isMobile) {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    updateSidebarState();
  }
}

function closeMobileMenu() {
  state.mobileMenuOpen = false;
  updateMobileMenuState();
}

function updateMobileMenuState() {
  if (elements.sidebar && state.isMobile) {
    if (state.mobileMenuOpen) {
      elements.sidebar.classList.add('open');
      if (elements.mobileOverlay) {
        elements.mobileOverlay.classList.add('active');
      }
    } else {
      elements.sidebar.classList.remove('open');
      if (elements.mobileOverlay) {
        elements.mobileOverlay.classList.remove('active');
      }
    }
  }
}

function updateSidebarState() {
  if (elements.sidebar && !state.isMobile) {
    if (state.sidebarCollapsed) {
      elements.sidebar.classList.add('collapsed');
    } else {
      elements.sidebar.classList.remove('collapsed');
    }
  }
}

function toggleUserMenu() {
  if (elements.userDropdown) {
    elements.userDropdown.classList.toggle('active');
  }
}

function navigateToPage(page) {
  // Update active nav item
  elements.navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    }
  });

  // Close mobile menu after navigation
  if (state.isMobile) {
    state.mobileMenuOpen = false;
    updateMobileMenuState();
  }

  // Navigate to the page
  const pageUrls = {
    'dashboard': '/dashboard/',
    'health-data': '/health-data/',
    'files-reports': '/files-reports/',
    'alerts': '/alerts/',
    'share-permissions': '/share-permissions/',
    'profile': '/profile/'
  };

  if (pageUrls[page]) {
    window.location.href = window.location.origin + pageUrls[page];
  }

}

function setCurrentPage() {
  // Determine current page from URL
  const path = window.location.pathname;
  
  // Handle both cases: with and without trailing slash
  const pathSegments = path.split('/').filter(segment => segment !== '');
  const currentSegment = pathSegments[pathSegments.length - 1] || 'dashboard';

  const pageMap = {
    'dashboard': 'dashboard',
    'health-data': 'health-data', 
    'files-reports': 'files-reports',
    'alerts': 'alerts',
    'share-permissions': 'share-permissions',
    'profile': 'profile'
  };

  state.currentPage = pageMap[currentSegment] || 'dashboard';

  // Update active nav item
  elements.navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === state.currentPage) {
      item.classList.add('active');
    }
  });
}

function setupModals() {
  // Modal triggers
  elements.modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', function () {
      const modalId = this.getAttribute('data-modal-trigger');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
      }
    });
  });

  // Modal close buttons
  elements.modalCloses.forEach(closeBtn => {
    closeBtn.addEventListener('click', function () {
      const modal = this.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Close modal when clicking overlay
  elements.modals.forEach(modal => {
    modal.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });
}

function setupSwitches() {
  const switches = document.querySelectorAll('.switch input');
  switches.forEach(switchEl => {
    switchEl.addEventListener('change', function () {
      // Handle switch state changes
      console.log('Switch toggled:', this.checked);
    });
  });
}

function setupTabs() {
  const tabTriggers = document.querySelectorAll('.tab-trigger');
  const tabContents = document.querySelectorAll('.tab-content');

  // Set up initial state - show first tab
  if (tabTriggers.length > 0 && tabContents.length > 0) {
    const firstTab = tabTriggers[0].getAttribute('data-tab');
    showTab(firstTab, tabTriggers, tabContents);
  }

  tabTriggers.forEach(trigger => {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      const targetTab = this.getAttribute('data-tab');
      showTab(targetTab, tabTriggers, tabContents);
    });
  });
}

function showTab(targetTab, tabTriggers, tabContents) {
  // Update active trigger
  tabTriggers.forEach(trigger => {
    trigger.classList.remove('active');
    if (trigger.getAttribute('data-tab') === targetTab) {
      trigger.classList.add('active');
    }
  });

  // Update active content
  tabContents.forEach(content => {
    const tabContentId = content.getAttribute('data-tab-content');
    if (tabContentId === targetTab) {
      content.style.display = 'block';
      content.classList.add('active');
    } else {
      content.style.display = 'none';
      content.classList.remove('active');
    }
  });
}

// Utility functions
function showToast(message, type = 'info') {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: type === 'error' ? '#ef4444' : '#2563eb',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    zIndex: '1000',
    fontSize: '14px',
    fontWeight: '500'
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Export functions for use in individual pages
window.MedRecordApp = {
  showToast,
  formatDate,
  navigateToPage,
  state
};