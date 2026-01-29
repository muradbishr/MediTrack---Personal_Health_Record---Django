// Files & Reports page functionality
window.FilesManager = {
  files: [],
  uploadQueue: [],
  isUploading: false,

  // filter state
  filterCategory: '', // "" = All
  filterType: '',     // "" = All

  // set filter category
  setFilterCategory(category) {
    this.filterCategory = category || '';
  },

  // set filter type
  setFilterType(type) {
    this.filterType = type || '';
  },


  init() {
    this.loadFilesFromAPI();
    this.setupFileUpload();
    this.setupDropZone();
    this.renderFiles();
    
    
  },

  
  showToast(message, type = "info") {
    if (window.MedRecordApp && window.MedRecordApp.showToast) {
      window.MedRecordApp.showToast(message, type);
    } else {
      console.log("Toast:", message);
    }
  },

  // Load files from sessionStorage
  async loadFilesFromAPI() {
    try {
      const response = await fetch("/api/files/");
      const data = await response.json();

      this.files = data.files; // backend must return { files: [...] }
      this.renderFiles();

    } catch (error) {
      console.error("Error loading files:", error);
      this.showToast("Failed to load files", "error");
    }
  },


  // Save files to sessionStorage
  saveFilesToStorage() {
    sessionStorage.setItem('medrecord-files', JSON.stringify(this.files));
  },

  setupFileUpload() {
    const modal = document.getElementById('upload-modal');
    const chooseFilesBtn = modal.querySelector('.btn.btn-primary');
    const uploadFilesBtn = modal.querySelector('.modal-footer .btn-primary');

    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.dicom,.dcm,.doc,.docx,.zip';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Choose files button click
    chooseFilesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });

    // File selection handler
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
    });

    // Upload files button click
    uploadFilesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const filesToSend = this.uploadQueue.map(f => f.file);

      this.uploadFiles();
    });
  },

  setupDropZone() {
    const modal = document.getElementById('upload-modal');
    const dropZone = modal.querySelector('[style*="dashed"]');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
    });

    dropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    }, false);

   
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  highlight(element) {
    element.style.borderColor = '#3b82f6';
    element.style.backgroundColor = '#eff6ff';
  },

  unhighlight(element) {
    element.style.borderColor = '#cbd5e1';
    element.style.backgroundColor = 'transparent';
  },

  handleFiles(files) {
    const validFiles = files.filter(file => this.validateFile(file));

    if (validFiles.length === 0) {
      if (window.MedRecordApp && window.MedRecordApp.showToast) {
        window.MedRecordApp.showToast('No valid files selected. Please select PDF, image, or document files.', 'error');
      } else {
        alert('No valid files selected. Please select PDF, image, or document files.');
      }
      return;
    }

    // Add files to upload queue
    validFiles.forEach(file => {
      const fileObj = {
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        type: this.getFileType(file),
        category: this.getCategoryFromType(this.getFileType(file)),
        size: this.formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0],
        progress: 0,
        status: 'pending' // pending, uploading, completed, error
      };

      this.uploadQueue.push(fileObj);
    });

    this.updateUploadModal();

    if (window.MedRecordApp && window.MedRecordApp.showToast) {
      window.MedRecordApp.showToast(`${validFiles.length} file(s) ready for upload`, 'info');
    }
  },

  validateFile(file) {
    const maxSize = 500 * 1024 * 1024; // 50MB
    const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'dicom', 'dcm', 'doc', 'docx','zip'];

    if (file.size > maxSize) {
      if (window.MedRecordApp && window.MedRecordApp.showToast) {
        window.MedRecordApp.showToast(`File "${file.name}" is too large. Max size is 500MB.`, 'error');
      } else {
        alert(`File "${file.name}" is too large. Max size is 500MB.`);
      }
      return false;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(extension)) {
      if (window.MedRecordApp && window.MedRecordApp.showToast) {
        window.MedRecordApp.showToast(`File type ".${extension}" is not supported.`, 'error');
      } else {
        alert(`File type ".${extension}" is not supported.`);
      }
      return false;
    }

    return true;
  },

  getFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(extension)) return 'image';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['dicom', 'dcm'].includes(extension)) return 'dicom';
    if (['doc', 'docx'].includes(extension)) return 'document';
    if (['zip'].includes(extension)) return 'image';
    return 'other';
  },

  getCategoryFromType(type) {
    const categoryMap = {
      'image': 'Imaging',
      'pdf': 'Document',
      'dicom': 'Imaging',
      'zip': 'Imaging',
      'document': 'Document',
      'other': 'Other'
    };
    return categoryMap[type] || 'Other';
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  updateUploadModal() {
    const modal = document.getElementById('upload-modal');
    const modalBody = modal.querySelector('.modal-body');

    if (this.uploadQueue.length === 0) {
      this.resetUploadModal();
      return;
    }

    modalBody.innerHTML = `
      <div class="space-y-4">
        <div style="border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 2rem; text-align: center; transition: border-color 0.2s; cursor: pointer;" id="upload-drop-zone">
          <span id="upload-icon-large" style="width: 3rem; height: 3rem; color: #94a3b8; margin: 0 auto 1rem;"></span>
          <p class="text-lg font-medium text-slate-900" style="margin-bottom: 0.5rem;">Drag and drop more files here</p>
          <p class="text-sm text-slate-600" style="margin-bottom: 1rem;">or click to browse files</p>
          <button class="btn btn-secondary" id="choose-more-files">Choose More Files</button>
          <p class="text-xs text-slate-500" style="margin-top: 1rem;">Supported formats: PDF, DICOM, JPG, PNG (Max 50MB)</p>
        </div>
        
        <div class="space-y-3">
          <h4 class="font-medium text-slate-900">Files to Upload (${this.uploadQueue.length})</h4>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${this.uploadQueue.map(file => this.createUploadFileHTML(file)).join('')}
          </div>
        </div>
      </div>
    `;

    // Re-setup upload icon
    setTimeout(() => {
      const uploadIcon = document.getElementById('upload-icon-large');
      if (uploadIcon && window.setIcon) setIcon(uploadIcon, 'upload', 'icon-lg');
    }, 0);

    // Re-setup drop zone for the new element
    this.setupDropZoneForElement(document.getElementById('upload-drop-zone'));

    // Setup choose more files button
    const chooseMoreBtn = document.getElementById('choose-more-files');
    if (chooseMoreBtn) {
      chooseMoreBtn.addEventListener('click', () => {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.click();
      });
    }
  },

  setupDropZoneForElement(dropZone) {
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
    });

    dropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    }, false);

    dropZone.addEventListener('click', () => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.click();
    });
  },

  createUploadFileHTML(file) {
    const iconType = file.type === 'image' ? 'image' : 'fileText';
    const progressBar = file.status === 'uploading' ?
      `<div class="w-full bg-gray-200 rounded-full h-1.5">
         <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style="width: ${file.progress}%"></div>
       </div>` : '';

    const statusIcon = file.status === 'completed' ? '✓' :
      file.status === 'error' ? '✗' :
        file.status === 'uploading' ? '⟳' : '';

    return `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-file-id="${file.id}">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="upload-file-icon" data-icon="${iconType}"></span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <p class="font-medium text-slate-900 text-sm truncate">${file.name}</p>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">${file.size}</span>
              ${statusIcon ? `<span class="text-sm ${file.status === 'completed' ? 'text-green-600' : file.status === 'error' ? 'text-red-600' : 'text-blue-600'}">${statusIcon}</span>` : ''}
              <button class="text-red-500 hover:text-red-700" onclick="FilesManager.removeFromQueue('${file.id}')">
                <span class="remove-file-icon" data-icon="x"></span>
              </button>
            </div>
          </div>
          ${progressBar}
          <p class="text-xs text-slate-500">${file.category}</p>
        </div>
      </div>
    `;
  },

  removeFromQueue(fileId) {
    this.uploadQueue = this.uploadQueue.filter(file => file.id !== fileId);
    this.updateUploadModal();

    if (window.MedRecordApp && window.MedRecordApp.showToast) {
      window.MedRecordApp.showToast('File removed from upload queue', 'info');
    }
  },

resetUploadModal() {
  const modal = document.getElementById('upload-modal');
  const modalBody = modal.querySelector('.modal-body');

  modalBody.innerHTML = `
    <div style="border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 2rem; text-align: center; transition: border-color 0.2s; cursor: pointer;" id="upload-drop-zone">
      <span id="upload-icon-large" style="width: 3rem; height: 3rem; color: #94a3b8; margin: 0 auto 1rem;"></span>
      <p class="text-lg font-medium text-slate-900" style="margin-bottom: 0.5rem;">Drag and drop your files here</p>
      <p class="text-sm text-slate-600" style="margin-bottom: 1rem;">or click to browse files</p>
      <button class="btn btn-primary">Choose Files</button>
      <p class="text-xs text-slate-500" style="margin-top: 1rem;">Supported formats: PDF, DICOM, JPG, PNG (Max 50MB)</p>
    </div>
  `;

  // Re-setup upload icon
  setTimeout(() => {
    const uploadIcon = document.getElementById('upload-icon-large');
    if (uploadIcon && window.setIcon) setIcon(uploadIcon, 'upload', 'icon-lg');
  }, 0);

  // Re-setup drop zone
  this.setupDropZoneForElement(document.getElementById('upload-drop-zone'));

  // Re-setup "Choose Files" button
  const chooseFilesBtn = modalBody.querySelector('.btn.btn-primary');
  if (chooseFilesBtn) {
    chooseFilesBtn.onclick = (e) => {
  e.preventDefault();
  fileInput.click();
};

  }

  // 🔹 Re-setup "Upload" button in modal footer
  const uploadFilesBtn = modal.querySelector('.modal-footer .btn-primary');
  if (uploadFilesBtn) {
    uploadFilesBtn.onclick = (e) => {
  e.preventDefault();
  this.uploadFiles();
};

  }
},


async uploadFiles(files = null) {
  // If no files passed, take from queue
  if (!files) {
    files = this.uploadQueue.map(f => f.file).filter(Boolean);
  }

  if (!files || files.length === 0) {
    this.showToast("No files to upload", "error");
    return;
  }

  const formData = new FormData();
  for (let file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch("/api/files/upload/", {
      method: "POST",
      body: formData,
      headers: {
        "X-CSRFToken": this.getCSRFToken(),
      },
      credentials: "same-origin"
    });

    if (!response.ok) {
      this.showToast("Upload failed", "error");
      return;
    }

    const data = await response.json();

    // Add server files to list only ONCE ✔
    if (data.uploaded) {
      this.files.unshift(...data.uploaded);
    }

    // Refresh UI
    this.renderFiles();

    // Clear queue
    this.uploadQueue = [];

    // Reset modal body
    this.resetUploadModal();

    // Close modal properly ✔
    document.getElementById("upload-modal").style.display = "none";
    document.body.classList.remove("modal-open");

    // Toast
    this.showToast("Upload successful", "success");

    window.location.reload();


  } catch (error) {
    console.error("Upload error:", error);
    this.showToast("Error uploading files", "error");
  }
},




  getNextFileId() {
    return this.files.length > 0 ? Math.max(...this.files.map(f => f.id)) + 1 : 1;
  },

  async uploadSingleFile(fileObj) {
    return new Promise((resolve) => {
      // Update file status
      fileObj.status = 'uploading';
      fileObj.progress = 0;
      this.updateUploadModal();

      // Setup file icons
      setTimeout(() => {
        this.setupUploadFileIcons();
      }, 0);

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        fileObj.progress += Math.random() * 30;

        if (fileObj.progress >= 100) {
          fileObj.progress = 100;
          fileObj.status = 'completed';
          clearInterval(uploadInterval);

          this.updateUploadModal();
          setTimeout(() => {
            this.setupUploadFileIcons();
          }, 0);

          resolve();
        } else {
          this.updateUploadModal();
          setTimeout(() => {
            this.setupUploadFileIcons();
          }, 0);
        }
      }, 200 + Math.random() * 300);
    });
  },

  setupUploadFileIcons() {
    const uploadFileIcons = document.querySelectorAll('.upload-file-icon');
    const removeFileIcons = document.querySelectorAll('.remove-file-icon');

    uploadFileIcons.forEach(icon => {
      const iconType = icon.getAttribute('data-icon');
      if (window.setIcon) setIcon(icon, iconType);
    });

    removeFileIcons.forEach(icon => {
      if (window.setIcon) setIcon(icon, 'x');
    });
  },

  // FIXED: Actually render files to the DOM
renderFiles() {
  const filesGrid = document.getElementById('files-grid');
  if (!filesGrid) {
    console.error('Files grid container not found');
    return;
  }

  // Hide loading indicator
  const loadingIndicator = document.getElementById('loading-files');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }

  // Filter files based on popup selections
  const filesToShow = this.files.filter(file => {
    // category filter
    if (this.filterCategory && file.category !== this.filterCategory) return false;

    // type filter
    if (this.filterType && file.type !== this.filterType) return false;

    return true;
  });

  // Clear grid
  filesGrid.innerHTML = '';

  if (filesToShow.length === 0) {
    // No files found (filtered or empty)
    filesGrid.innerHTML = `
      <p class="col-span-full text-center text-gray-500">
        ${this.files.length === 0
          ? 'No files uploaded yet.'
          : 'No files found for selected filter.'}
      </p>
    `;
    return;
  }

  // Render filtered files
  filesToShow.forEach(file => {
    const fileCard = this.createFileCardHTML(file);
    filesGrid.insertAdjacentHTML('beforeend', fileCard);
  });

  // Setup icons for all file cards
  setTimeout(() => {
    this.setupFileCardIcons();
  }, 0);

  console.log('Files rendered:', filesToShow.length);
},

  createFileCardHTML(file) {
    const badgeColor = this.getCategoryBadgeColor(file.category);
    const thumbnailHTML = file.thumbnail ?
      `<img src="${file.thumbnail}" alt="${file.name}" class="w-full h-full object-cover">` :
      `<div class="w-full h-full flex items-center justify-center bg-red-50">
         <span class="file-type-icon text-red-500" style="width: 3rem; height: 3rem;" data-type="${file.type}"></span>
       </div>`;

    return `
      <div class="card file-card" style="transition: box-shadow 0.2s;" data-file-id="${file.id}">
        <div class="card-content" style="padding: 1rem;">
          <!-- Thumbnail -->
          <div class="aspect-video bg-slate-100 rounded-xl" style="margin-bottom: 1rem; overflow: hidden;">
            ${thumbnailHTML}
          </div>

          <!-- File Info -->
          <div class="space-y-2">
            <h3 class="font-medium text-slate-900 text-sm line-clamp-2">${file.name}</h3>
            <div class="flex items-center justify-between">
              <span class="badge" style="background-color: ${badgeColor.bg}; color: ${badgeColor.text};">${file.category}</span>
              <span class="text-xs text-slate-500">${file.size}</span>
            </div>
            <p class="text-xs text-slate-500">${file.upload_date}</p>
          </div>

          <!-- Actions -->
          <div class="file-actions flex items-center justify-between" style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; opacity: 0; transition: opacity 0.2s;">
            <div class="flex items-center gap-1">
              <button class="btn btn-ghost btn-sm" style="width: 2rem; height: 2rem; padding: 0;" onclick="FilesManager.viewFile(${file.id})" title="View File">
                <span class="file-action-icon" data-icon="eye"></span>
              </button>
              <button class="btn btn-ghost btn-sm" style="width: 2rem; height: 2rem; padding: 0;" onclick="FilesManager.downloadFile(${file.id})" title="Download File">
                <span class="file-action-icon" data-icon="download"></span>
              </button>
            </div>
            <button class="btn btn-ghost btn-sm text-red-600" style="width: 2rem; height: 2rem; padding: 0;" onclick="FilesManager.deleteFile(${file.id})" title="Delete File">
              <span class="file-action-icon" data-icon="trash2"></span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  getCategoryBadgeColor(category) {
    const colorMap = {
      'Lab Report': { bg: '#dbeafe', text: '#1d4ed8' },
      'Imaging': { bg: '#f3e8ff', text: '#7c3aed' },
      'Medication': { bg: '#dcfce7', text: '#16a34a' },
      'Document': { bg: '#fef3c7', text: '#d97706' },
      'Other': { bg: '#f3f4f6', text: '#374151' }
    };
    return colorMap[category] || colorMap['Other'];
  },

  setupFileCardIcons() {
    // Setup file type icons
    const fileTypeIcons = document.querySelectorAll('.file-type-icon');
    fileTypeIcons.forEach(icon => {
      const type = icon.getAttribute('data-type');
      const iconType = type === 'image' ? 'image' : 'fileText';
      if (window.setIcon) setIcon(icon, iconType, 'icon-lg');
    });

    // Setup action icons
    const actionIcons = document.querySelectorAll('.file-action-icon');
    actionIcons.forEach(icon => {
      const iconType = icon.getAttribute('data-icon');
      if (window.setIcon) setIcon(icon, iconType);
    });

    // Setup hover effects
    const fileCards = document.querySelectorAll('.file-card');
    fileCards.forEach(card => {
      const actions = card.querySelector('.file-actions');
      if (actions) {
        card.addEventListener('mouseenter', () => {
          actions.style.opacity = '1';
          card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        });
        card.addEventListener('mouseleave', () => {
          actions.style.opacity = '0';
          card.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
        });
      }
    });
  },

  viewFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (file) {
      window.open(`/api/files/${file.id}/download/`, "_blank");

    }
  },

  downloadFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (file) {
      // Create download link
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (window.MedRecordApp && window.MedRecordApp.showToast) {
        window.MedRecordApp.showToast(`Downloading ${file.name}`, 'info');
      }
    }
  },
  
  // add to FilesManager
  getCSRFToken() {
    // uses the global helper getCookie(name) already in your file
    return getCookie('csrftoken');
  },


  async deleteFile(id) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`/api/files/${id}/delete/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": this.getCSRFToken(),
        }
      });

      if (!response.ok) {
        this.showToast("Failed to delete file", "error");
        return;
      }

      this.files = this.files.filter(f => f.id !== id);
      this.renderFiles();

      this.showToast("File deleted", "success");

    } catch (error) {
      console.error("Delete error:", error);
      this.showToast("Server error deleting file", "error");
    }
  }

};
// helper to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].trim();
      if (c.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(c.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie('csrftoken');

async function loadFilesFromServer() {
  try {
    const resp = await fetch('/api/files/', { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('Failed to fetch files');
    const data = await resp.json();
    if (data.files) {
      FilesManager.files = data.files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        category: f.category,
        size: f.size,
        date: f.date,
        url: f.url,
        thumbnail: f.thumbnail ? `${window.location.origin}${f.thumbnail}` : null

      }));
      FilesManager.renderFiles();
    }
  } catch (err) {
    console.error(err);
  }
}
async function uploadFilesToServer(fileList) {
  const fd = new FormData();
  for (const f of fileList) {
    fd.append('files', f);
  }
  try {
    const resp = await fetch('/api/files/upload/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': csrftoken
      },
      body: fd
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || 'Upload failed');
    }
    const data = await resp.json();
    // تحديث FilesManager.files بناءً على الرد
    if (data.uploaded) {
      const newFiles = data.uploaded.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        category: f.category,
        size: f.size,
        date: f.date,
        url: f.url,
        thumbnail: f.thumbnail ? `${window.location.origin}${f.thumbnail}` : null

      }));
      FilesManager.files = newFiles.concat(FilesManager.files);
      FilesManager.saveFilesToStorage(); // أو تزيل هذه السطر إذا ستعتمد على السيرفر فقط
      FilesManager.renderFiles();
    }
  } catch (err) {
    console.error(err);
    alert('Upload failed: ' + err.message);
  }
}
async function deleteFileOnServer(id) {
  try {
    const resp = await fetch(`/api/files/${id}/delete/`, {
      method: 'POST', // أو 'DELETE' إذا أعددت الـ view لقبول DELETE
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': csrftoken }
    });
    if (!resp.ok) throw new Error('Delete failed');
    const data = await resp.json();
    if (data.deleted) {
      FilesManager.files = FilesManager.files.filter(f => f.id !== id);
      FilesManager.saveFilesToStorage();
      FilesManager.renderFiles();
    }
  } catch (err) {
    console.error(err);
    alert('Delete failed: ' + err.message);
  }
}
