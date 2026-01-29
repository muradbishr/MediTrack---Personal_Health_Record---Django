// Dashboard page functionality
window.DashboardManager = {
  init() {
    this.checkOnboardingStatus();
    this.setupQuickUpload();
    this.setupFileIntegration();
    this.setupNavigationHandlers();
    this.updateStats();
  },

  checkOnboardingStatus() {
    const onboardingCompleted = localStorage.getItem('meditrack-onboarding-completed');
    const onboardingDate = localStorage.getItem('meditrack-onboarding-date');
    
    if (onboardingCompleted && onboardingDate) {
      document.body.classList.add('onboarding-completed');
      
      // Show welcome banner for new users (completed within last 24 hours)
      const completionDate = new Date(onboardingDate);
      const now = new Date();
      const hoursSinceCompletion = (now - completionDate) / (1000 * 60 * 60);
      
      if (hoursSinceCompletion < 24) {
        const welcomeBanner = document.getElementById('new-user-welcome');
        if (welcomeBanner) {
          welcomeBanner.style.display = 'block';
          
          // Auto-hide after 10 seconds
          setTimeout(() => {
            welcomeBanner.style.transition = 'opacity 0.5s ease-out';
            welcomeBanner.style.opacity = '0';
            setTimeout(() => {
              welcomeBanner.style.display = 'none';
            }, 500);
          }, 10000);
        }
      }
    }
  },

  setupQuickUpload() {
    // Enhanced dashboard drop zone
    const dashboardDropZone = document.getElementById('dashboard-drop-zone');
    if (!dashboardDropZone) return;

    // Make the entire quick upload area a drop zone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dashboardDropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dashboardDropZone.addEventListener(eventName, () => {
        dashboardDropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dashboardDropZone.addEventListener(eventName, () => {
        dashboardDropZone.classList.remove('drag-over');
      }, false);
    });

    dashboardDropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (window.FilesManager) {
        window.FilesManager.handleFiles(files);
        // Auto-open modal to show progress
        document.getElementById('upload-modal').classList.add('active');
      }
    }, false);

    // Click to open modal
    dashboardDropZone.addEventListener('click', () => {
      document.getElementById('upload-modal').classList.add('active');
    });
  },

  setupFileIntegration() {
    // Override FilesManager methods to update dashboard
    if (window.FilesManager) {
      const originalUploadFiles = window.FilesManager.uploadFiles;
      window.FilesManager.uploadFiles = async function() {
        await originalUploadFiles.call(this);
        DashboardManager.updateRecentFiles();
        DashboardManager.addUploadActivity();
        DashboardManager.updateStats();
      };

      // Show progress on dashboard
      const originalUpdateModal = window.FilesManager.updateUploadModal;
      window.FilesManager.updateUploadModal = function() {
        originalUpdateModal.call(this);
        DashboardManager.showUploadProgress();
      };
    }
  },

  setupNavigationHandlers() {
    // Quick action buttons
    const quickActionButtons = document.querySelectorAll('[data-page]');
    quickActionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const page = button.getAttribute('data-page');
        this.navigateToPage(page);
      });
    });

    // File clicks
    const fileItems = document.querySelectorAll('#recent-files-list > div');
    fileItems.forEach(item => {
      item.addEventListener('click', () => {
        this.navigateToPage('files-reports');
      });
    });
  },

navigateToPage(page) {
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
},


  updateRecentFiles() {
    const recentFilesList = document.getElementById('recent-files-list');
    if (!recentFilesList || !window.FilesManager) return;

    const recentFiles = window.FilesManager.files.slice(-3).reverse();
    
    if (recentFiles.length === 0) {
      recentFilesList.innerHTML = `
        <div class="flex items-center justify-center py-6">
          <div class="text-center">
            <div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span class="no-files-icon text-slate-400"></span>
            </div>
            <p class="text-sm text-slate-600">No files uploaded yet</p>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        const noFilesIcon = document.querySelector('.no-files-icon');
        if (noFilesIcon && window.setIcon) {
          window.setIcon(noFilesIcon, 'fileText');
        }
      }, 100);
      
      return;
    }
    
    recentFilesList.innerHTML = recentFiles.map(file => `
      <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100" style="cursor: pointer; transition: background-color 0.2s;">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <span class="text-blue-600 recent-file-icon" data-type="${file.type}"></span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 truncate">${file.name}</p>
          <p class="text-xs text-slate-500">${file.category} • ${file.date}</p>
        </div>
      </div>
    `).join('');

    // Set up icons for recent files
    setTimeout(() => {
      const recentFileIcons = document.querySelectorAll('.recent-file-icon');
      recentFileIcons.forEach(icon => {
        const type = icon.getAttribute('data-type');
        const iconType = type === 'image' ? 'image' : 'fileText';
        if (window.setIcon) {
          window.setIcon(icon, iconType);
        }
      });
    }, 100);
  },

  showUploadProgress() {
    const progressCard = document.getElementById('upload-progress-dashboard');
    const progressList = document.getElementById('upload-progress-list');
    
    if (!progressCard || !progressList || !window.FilesManager) return;

    if (window.FilesManager.uploadQueue.length > 0) {
      progressCard.style.display = 'block';
      progressList.innerHTML = window.FilesManager.uploadQueue.map(file => 
        this.createProgressItemHTML(file)
      ).join('');
    } else {
      progressCard.style.display = 'none';
    }
  },

  createProgressItemHTML(file) {
    const statusIcon = file.status === 'completed' ? '✓' : 
                      file.status === 'error' ? '✗' : 
                      file.status === 'uploading' ? '⟳' : '⏸';
    
    const statusColor = file.status === 'completed' ? 'text-green-600' : 
                       file.status === 'error' ? 'text-red-600' : 
                       'text-blue-600';
    
    return `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <span class="${statusColor} text-sm">${statusIcon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 truncate">${file.name}</p>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span>${file.size}</span>
            <span>•</span>
            <span>${file.category}</span>
          </div>
          ${file.status === 'uploading' ? `
            <div class="w-full bg-slate-200 rounded-full h-1 mt-1">
              <div class="bg-blue-600 h-1 rounded-full transition-all duration-300" style="width: ${file.progress}%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  addUploadActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;

    const currentTime = new Date().toLocaleString();
    const newActivity = `
      <div class="flex items-center gap-3" style="padding: 0.5rem 0;">
        <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
          <span class="text-slate-600 upload-activity-icon"></span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900">New files uploaded successfully</p>
          <p class="text-xs text-slate-500">Just now</p>
        </div>
      </div>
    `;
    
    activityList.insertAdjacentHTML('afterbegin', newActivity);
    
    // Set up icon for new activity
    setTimeout(() => {
      const uploadIcon = document.querySelector('.upload-activity-icon');
      if (uploadIcon && window.setIcon) {
        window.setIcon(uploadIcon, 'upload');
      }
    }, 100);
  },

  updateStats() {
    if (!window.FilesManager) return;

    // Update file count in welcome banner
    const fileCount = window.FilesManager.files.length;
    // You can add more stats here as needed
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  // Health summary updates
  updateHealthSummary(newData) {
    // This could be integrated with health data from other pages
    console.log('Health summary updated:', newData);
  },

  // Show toast notification
  showToast(message, type = 'info') {
    if (window.MedRecordApp && window.MedRecordApp.showToast) {
      window.MedRecordApp.showToast(message, type);
    }
  }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure other scripts have loaded
  setTimeout(() => {
    if (window.DashboardManager) {
      window.DashboardManager.init();
    }
  }, 100);
});
// Open modal when clicking "Add Detailed Trends"
document.querySelectorAll('.btn.btn-secondary').forEach(btn => {
  if (btn.textContent.includes('Add Detailed Trends')) {
    btn.addEventListener('click', () => {
      document.getElementById('trends-modal').classList.add('active');
    });
  }
});

// Close modal
document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal-overlay').classList.remove('active');
  });
});

// Close modal when clicking outside content
document.getElementById('trends-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('active');
  }
});

// Handle form submission
document.getElementById('trends-form').addEventListener('submit', e => {
  e.preventDefault();
  
  const bp = document.getElementById('bp').value;
  const hr = document.getElementById('hr').value;
  const weight = document.getElementById('weight').value;
  const bs = document.getElementById('bs').value;

  // Here you can send it to your backend or store locally
  console.log({bp, hr, weight, bs});

  alert('Detailed trends saved successfully!');
  
  // Close modal
  document.getElementById('trends-modal').classList.remove('active');
  
  // Optional: reset form
  e.target.reset();
});
document.getElementById('trends-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    fetch("{% url 'user:save_trends' %}", {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success'){
            alert(data.message);
            document.getElementById('trends-modal').classList.remove('active');
        } else {
            alert('Error: ' + JSON.stringify(data.errors));
        }
    });
});

