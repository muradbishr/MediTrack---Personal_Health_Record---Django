    // Initialize files page specific icons and functionality
    document.addEventListener('DOMContentLoaded', function() {
      // Sidebar icons
      setIcon(document.getElementById('logo-icon'), 'heart');
      setIcon(document.getElementById('nav-dashboard'), 'dashboard');
      setIcon(document.getElementById('nav-health'), 'heart');
      setIcon(document.getElementById('nav-files'), 'fileText');
      setIcon(document.getElementById('nav-alerts'), 'bell');
      setIcon(document.getElementById('nav-share'), 'share2');
      setIcon(document.getElementById('nav-profile'), 'user');
      setIcon(document.getElementById('toggle-icon'), 'chevronLeft');
      
      // TopBar icons
      setIcon(document.getElementById('menu-icon'), 'menu');
      setIcon(document.getElementById('bell-icon'), 'bell');
      setIcon(document.getElementById('settings-icon'), 'settings');
      
      // Page specific icons
      setIcon(document.getElementById('filter-icon'), 'filter');
      setIcon(document.getElementById('upload-icon'), 'upload');
      setIcon(document.getElementById('upload-icon-large'), 'upload', 'icon-lg');
      setIcon(document.getElementById('modal-close-icon'), 'x');
      setIcon(document.getElementById('fab-upload-icon'), 'upload');
      
      // File icons will be set up dynamically when files are rendered

      // Initialize file upload functionality
      if (window.FilesManager) {
        window.FilesManager.init();
      }
    });



  // user/static/user/js/edit-items.js   (أو الصق في قالبك داخل <script>)
document.addEventListener('click', e => console.log('CLICKED:', e.target, e.target.closest('[data-pk]')));

    document.addEventListener('DOMContentLoaded', function () {
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  }

  function openModal() {
    const modal = document.getElementById('edit-item-modal');
    if (!modal) return;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const modal = document.getElementById('edit-item-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.getElementById('modal-errors').style.display = 'none';
  }

  // find nearest row and edit URL
  function findRowAndUrl(btn) {
    const row = btn.closest('tr[data-pk], .mobile-card[data-pk]');
    if (!row) return null;
    const pk = row.dataset.pk;
    const editUrl = row.dataset.editUrl || row.getAttribute('data-edit-url') || null;
    return { row, pk, editUrl };
  }

  async function fetchItem(editUrl) {
    const resp = await fetch(editUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('Failed to fetch item: ' + resp.status);
    return resp.json();
  }
  // >>> ضع هذا داخل نفس DOMContentLoaded بعد دوال openModal و closeModal <<<

(function enableModalOutsideClickAndEsc() {
  const modal = document.getElementById('edit-item-modal');
  if (!modal) return;

  // إغلاق بالضغط خارج النافذة
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // منع إغلاق عند الضغط داخل المحتوى
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // إغلاق بالـ Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeModal();
    }
  });
})();


  function removeFamilyFields() {
  [
    'field-condition',
    'field-relationship',
    'field-age_of_onset',
    'field-notes'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

  // Fill modal fields from data depending on type
  function fillModalFor(type, data) {
    removeFamilyFields();
    // reset visibility
    ['field-medication_name','field-dosage','field-frequency','field-start_date'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    ['field-name','field-type','field-severity','field-reaction','field-disease_name','field-date_diagnosed','field-status'].forEach(x=>{ const el = document.getElementById(x); if (el) el.style.display='none'; });

    // set id
    document.getElementById('edit-item-id').value = data.id;

    if (type === 'medication') {
      document.getElementById('edit-modal-title').textContent = 'Edit Medication';
      document.getElementById('field-medication_name').style.display = '';
      document.getElementById('field-dosage').style.display = '';
      document.getElementById('field-frequency').style.display = '';
      document.getElementById('field-start_date').style.display = '';

      document.getElementById('edit-medication_name').value = data.medication_name || '';
      document.getElementById('edit-dosage').value = data.dosage || '';
      document.getElementById('edit-frequency').value = data.frequency || '';
      document.getElementById('edit-start_date').value = data.start_date || '';
    }

    if (type === 'allergy') {
      document.getElementById('edit-modal-title').textContent = 'Edit Allergy';
      // ensure fields for allergy exist in DOM (create if not)
      ensureAllergyFields();
      document.getElementById('field-name').style.display = '';
      document.getElementById('field-type').style.display = '';
      document.getElementById('field-severity').style.display = '';
      document.getElementById('field-reaction').style.display = '';

      document.getElementById('edit-name').value = data.name || '';
      document.getElementById('edit-type').value = data.type || '';
      document.getElementById('edit-severity').value = data.severity || '';
      document.getElementById('edit-reaction').value = data.reaction || '';
    }

    if (type === 'chronic') {
      document.getElementById('edit-modal-title').textContent = 'Edit Chronic Disease';
      ensureChronicFields();
      document.getElementById('field-disease_name').style.display = '';
      document.getElementById('field-date_diagnosed').style.display = '';
      document.getElementById('field-status').style.display = '';
      document.getElementById('field-severity').style.display = '';

      document.getElementById('edit-disease_name').value = data.disease_name || '';
      document.getElementById('edit-date_diagnosed').value = data.date_diagnosed || '';
      document.getElementById('edit-status').value = data.status || '';
      document.getElementById('edit-severity').value = data.severity || '';
    }

if (type === 'family') {
  document.getElementById('edit-modal-title').textContent = 'Edit Family History';
  ensureFamilyHistoryFields();
  document.getElementById('edit-condition').value = data.condition || '';
  document.getElementById('edit-relationship').value = data.relationship || '';
  document.getElementById('edit-age_of_onset').value = data.age_of_onset || '';
  document.getElementById('edit-notes').value = data.notes || '';
}


    // change save button text
    document.getElementById('edit-save').textContent = 'Update';
  }

  // helpers to dynamically ensure allergy/chronic fields exist
// إنشاء حقل الـ severity مرة واحدة فقط
function ensureSeverityField() {
  if (document.getElementById('field-severity')) return;
  const form = document.getElementById('edit-item-form');
  const html = `
    <div id="field-severity" class="form-row">
      <label>Severity</label>
      <input id="edit-severity" name="severity" class="form-input">
    </div>
  `;
  form.insertAdjacentHTML('afterbegin', html);
}

function ensureAllergyFields() {
  if (document.getElementById('field-name')) return;
  const form = document.getElementById('edit-item-form');
  const html = `
    <div id="field-name" class="form-row"><label>Allergen</label><input id="edit-name" name="name" class="form-input"></div>
    <div id="field-type" class="form-row"><label>Type</label><input id="edit-type" name="type" class="form-input"></div>
    <div id="field-reaction" class="form-row"><label>Reaction</label><input id="edit-reaction" name="reaction" class="form-input"></div>
  `;
  form.insertAdjacentHTML('beforebegin', html);
  // ensure shared severity exists
  ensureSeverityField();
}

function ensureFamilyHistoryFields() {
  // prevent duplicate
  if (document.getElementById('field-condition') && document.getElementById('edit-condition')) return;

  const form = document.getElementById('edit-item-form');
  if (!form) return;

  const html = `
    <div id="field-condition" class="form-row">
      <label>Condition</label>
      <input id="edit-condition" name="condition" class="form-input">
    </div>
    <div id="field-relationship" class="form-row">
      <label>Relationship</label>
      <select id="edit-relationship" name="relationship" class="form-select">
        <option value="mother">Mother</option>
        <option value="father">Father</option>
        <option value="brother">Brother</option>
        <option value="sister">Sister</option>
        <option value="grandmother">Grandmother</option>
        <option value="grandfather">Grandfather</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div id="field-age_of_onset" class="form-row">
      <label>Age of Onset</label>
      <input id="edit-age_of_onset" name="age_of_onset" type="number" min="0" max="120" class="form-input">
    </div>
    <div id="field-notes" class="form-row">
      <label>Notes</label>
      <textarea id="edit-notes" name="notes" class="form-input"></textarea>
    </div>
  `;

  form.insertAdjacentHTML('afterbegin', html);
}

function ensureChronicFields() {
  if (document.getElementById('field-disease_name') && document.getElementById('edit-disease_name')) return;
  const form = document.getElementById('edit-item-form');
  const html = `
    <div id="field-disease_name" class="form-row"><label>Disease</label><input id="edit-disease_name" name="disease_name" class="form-input"></div>
    <div id="field-date_diagnosed" class="form-row"><label>Date Diagnosed</label><input id="edit-date_diagnosed" name="date_diagnosed" type="date" class="form-input"></div>
    <div id="field-status" class="form-row"><label>Status</label><input id="edit-status" name="status" class="form-input"></div>
  `;
  form.insertAdjacentHTML('beforebegin', html);
  // ensure shared severity exists
  ensureSeverityField();
 }

  // event delegation for edit buttons
// Delegated edit handler — supports medication, allergy, chronic, family
document.addEventListener('click', async function (e) {
  const btn = e.target.closest(
    '.edit-med-btn, .edit-allergy-btn, .edit-chronic-btn, .edit-family-btn, .edit-btn'
  );
  if (!btn) return;
  e.preventDefault();

  const found = findRowAndUrl(btn);
  if (!found) {
    alert('Item row not found');
    return;
  }
  const { row, pk, editUrl } = found;

  // decide type from surrounding tab or classes
  let type = 'medication';
  const tab = row && row.closest && row.closest('.tab-content');
  if (tab && tab.dataset && tab.dataset.tabContent) {
    const tc = tab.dataset.tabContent.toLowerCase();
    if (tc.includes('allerg')) type = 'allergy';
    else if (tc.includes('chronic')) type = 'chronic';
    else if (tc.includes('family')) type = 'family';
    else if (tc.includes('medicat')) type = 'medication';
  } else {
    if (btn.classList.contains('edit-med-btn')) type = 'medication';
    else if (btn.classList.contains('edit-allergy-btn')) type = 'allergy';
    else if (btn.classList.contains('edit-chronic-btn') || btn.classList.contains('edit-btn')) type = 'chronic';
    else if (btn.classList.contains('edit-family-btn')) type = 'family';
  }

  // fallback edit URL patterns (adjust to your backend routes if different)
  const url = editUrl || (type === 'medication' ? `/medications/${pk}/api/`
                : type === 'allergy' ? `/allergies/${pk}/api/`
                : type === 'chronic' ? `/chronic/${pk}/api/`
                : `/family/history/${pk}/`); // <-- adjust if your family endpoint differs

  try {
    const data = await fetchItem(url);
    fillModalFor(type, data);
    const saveBtn = document.getElementById('edit-save');
    saveBtn.dataset.editUrl = url;
    saveBtn.dataset.type = type;
    saveBtn.dataset.pk = pk;
    openModal();
  } catch (err) {
    console.error(err);
    alert('Failed to load item data. See console.');
  }
});

  // cancel
  document.getElementById('edit-cancel').addEventListener('click', function () {
    closeModal();
  });

  // submit (update)
  document.getElementById('edit-item-form').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const saveBtn = document.getElementById('edit-save');
    const url = saveBtn.dataset.editUrl;
    const type = saveBtn.dataset.type;
    const pk = saveBtn.dataset.pk;

    if (!url) { alert('No update URL'); return; }

    // gather form data according to type
    const payload = {};
    if (type === 'medication') {
      payload.medication_name = document.getElementById('edit-medication_name').value.trim();
      payload.dosage = document.getElementById('edit-dosage').value.trim();
      payload.frequency = document.getElementById('edit-frequency').value.trim();
      payload.start_date = document.getElementById('edit-start_date').value || '';
    } else if (type === 'allergy') {
      payload.name = document.getElementById('edit-name').value.trim();
      payload.type = document.getElementById('edit-type').value.trim();
      payload.severity = document.getElementById('edit-severity').value.trim();
      payload.reaction = document.getElementById('edit-reaction').value.trim();
    } else if (type === 'chronic') {
      payload.disease_name = document.getElementById('edit-disease_name').value.trim();
      payload.date_diagnosed = document.getElementById('edit-date_diagnosed').value || '';
      payload.status = document.getElementById('edit-status').value.trim();
      payload.severity = document.getElementById('edit-severity').value.trim();
    }else if (type === 'family') {
  payload.condition = document.getElementById('edit-condition').value.trim();
  payload.relationship = document.getElementById('edit-relationship').value.trim();
  payload.age_of_onset = document.getElementById('edit-age_of_onset').value.trim();
  payload.notes = document.getElementById('edit-notes').value.trim();
}

    try {
      saveBtn.disabled = true;
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (!resp.ok) {
        let errText = await resp.text();
        console.error('Update failed', resp.status, errText);
        document.getElementById('modal-errors').textContent = 'Update failed (see console)';
        document.getElementById('modal-errors').style.display = 'block';
        return;
      }
      if (!contentType.includes('application/json')) {
        const txt = await resp.text();
        console.error('Expected JSON', txt);
        document.getElementById('modal-errors').textContent = 'Unexpected server response';
        document.getElementById('modal-errors').style.display = 'block';
        return;
      }
      const data = await resp.json();
      // success if request succeeded and we got JSON
// do NOT overload `data.status` (it is a FIELD for chronic)
if (data.errors) {
  document.getElementById('modal-errors').textContent = JSON.stringify(data.errors);
  document.getElementById('modal-errors').style.display = 'block';
  return;
}


      // update the table row and mobile card if present
      const row = document.querySelector(`tr[data-pk="${pk}"]`);
      const mobile = document.querySelector(`.mobile-card[data-pk="${pk}"]`);
      if (type === 'medication' && data) {
        if (row) {
          const nameEl = row.querySelector('.med-name'); if (nameEl) nameEl.textContent = data.medication_name;
          const dEl = row.querySelector('.med-dosage'); if (dEl) dEl.textContent = data.dosage;
          const fEl = row.querySelector('.med-frequency'); if (fEl) fEl.textContent = data.frequency;
          const sEl = row.querySelector('.med-start'); if (sEl) sEl.textContent = data.start_date || '';
        }
        if (mobile) {
          const h4 = mobile.querySelector('h4'); if (h4) h4.textContent = data.medication_name;
          // other mobile nodes update similarly (search by structure)
          mobile.querySelectorAll('div.space-y-2 > div').forEach(function(div){
            // naive mapping based on text labels left; better to give them classes in template for reliable updates
          });
        }
      }

      if (type === 'allergy' && data) {
        if (row) {
          const cols = row.children;
          // update sensible columns by classes (ensure template has proper classes)
          const nameCell = row.querySelector('.allergy-name'); if (nameCell) nameCell.textContent = data.name;
          const typeCell = row.querySelector('.allergy-type'); if (typeCell) typeCell.textContent = data.type;
        }
        if (mobile) {
          const h4 = mobile.querySelector('h4'); if (h4) h4.textContent = data.name;
        }
      }

      if (type === 'chronic' && data) {
        if (row) {
          const nameCell = row.querySelector('.chronic-name'); if (nameCell) nameCell.textContent = data.disease_name;
          const dateCell = row.querySelector('.chronic-date'); if (dateCell) dateCell.textContent = data.date_diagnosed;
          const statusCell = row.querySelector('.chronic-status'); if (statusCell) statusCell.textContent = data.status;
          const sevCell = row.querySelector('.chronic-severity'); if (sevCell) sevCell.textContent = data.severity;
        }
        if (mobile) {
          const h4 = mobile.querySelector('h4'); if (h4) h4.textContent = data.disease_name;
        }
      }

      if (type === 'family' && data) {
  if (row) {
    const condCell = row.querySelector('.family-condition'); if (condCell) condCell.textContent = data.condition || payload.condition || '';
    const relCell = row.querySelector('.family-relationship'); if (relCell) relCell.textContent = data.relationship || payload.relationship || '';
    const ageCell = row.querySelector('.family-age'); if (ageCell) ageCell.textContent = data.age_of_onset || payload.age_of_onset || '';
    const notesCell = row.querySelector('.family-notes'); if (notesCell) notesCell.textContent = data.notes || payload.notes || '';
  }
  if (mobile) {
    const h4 = mobile.querySelector('h4'); if (h4) h4.textContent = data.condition || payload.condition || '';
    // add more mobile updates here if your card structure has specific nodes (give them classes for reliability)
  }
}


      closeModal();
      if (window.MedRecordApp && typeof window.MedRecordApp.showToast === 'function') {
        window.MedRecordApp.showToast('Updated successfully','success');
      }
    } catch (err) {
      console.error('Network/update error', err);
      document.getElementById('modal-errors').textContent = 'Network/server error while updating. See console.';
      document.getElementById('modal-errors').style.display = 'block';
    } finally {
      saveBtn.disabled = false;
    }
  });
});


document.addEventListener('DOMContentLoaded', function () {

  // ---------- helpers ----------
  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (let i = 0; i < cookies.length; i++) {
      const parts = cookies[i].split('=');
      const key = parts.shift();
      const value = decodeURIComponent(parts.join('='));
      if (key === name) return value;
    }
    return null;
  }

  async function postForm(url, formData) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken') || '',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: formData
    });
  }

  function removeItemByPk(pk) {
    const tableRow = document.querySelector(`tr[data-pk="${pk}"]`);
    const mobileCard = document.querySelector(`.mobile-card[data-pk="${pk}"]`);
    if (tableRow) tableRow.remove();
    if (mobileCard) mobileCard.remove();
  }

  function fallbackDeleteUrlForContainer(container, pk) {
    if (!pk) return null;
    // common patterns - adjust to your project routes if different
    if (container && container.closest && container.closest('.tab-content[data-tab-content="allergies"]')) {
      return `/delete_allergy/${pk}/`;
    }
    if (container && container.closest && container.closest('.tab-content[data-tab-content="chronic-diseases"]')) {
      return `/delete_chronic/${pk}/`;
    }
    if (container && container.closest && container.closest('.tab-content[data-tab-content="medications"]')) {
      return `/medications/delete/${pk}/`;
    }
    
    // last-resort generic
    return `/medications/delete/${pk}/`;
  }

  async function sendDelete(url) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken') || '',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: null
    });
  }

  // ---------- Delegated delete handler (robust) ----------
document.addEventListener('click', async function (e) {
    const btn = e.target.closest(
        'button[data-delete-url], button.delete-btn, button.delete-medication-btn,' +
        'button.delete-allergy-btn, .delete-family-history-btn, span[data-delete-url],' +
        'a[data-delete-url], [data-delete-url]'
    );
    if (!btn) return;

    // Pull URL
    let deleteUrl = btn.dataset.deleteUrl || btn.getAttribute('data-delete-url');
    if (!deleteUrl) {
        const anc = btn.closest('[data-delete-url]');
        deleteUrl = anc ? anc.dataset.deleteUrl || anc.getAttribute('data-delete-url') : null;
    }
    if (!deleteUrl) {
        console.error('No delete URL found on', btn);
        alert('Cannot delete: URL missing.');
        return;
    }

    // Container detection
    const container =
        btn.closest('tr[data-pk]') ||
        btn.closest('.mobile-card[data-pk]') ||
        btn.closest('tr') ||
        btn.closest('.mobile-card');

    const pk = container?.dataset?.pk || null;

    if (!confirm('Delete this record? This action cannot be undone.')) return;

    // Send request
    try {
        const resp = await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        const data = await resp.json();

        if (resp.ok && (data.status === 'success' || data.success === true)) {
            if (container) container.remove();
            if (window.MedRecordApp?.showToast)
                window.MedRecordApp.showToast('Record deleted', 'info');
        } else {
            alert(data.message || 'Delete failed.');
            console.error('Delete failed:', data);
        }
    } catch (err) {
        console.error('Network/server error while deleting', err);
        alert('Network/server error while deleting.');
    }
});

  // call icon setter for existing nodes if provided
 if (typeof setIcon === 'function') {
  document.querySelectorAll(
    'span[id^="trash-icon-"], span[id^="trash"], span[id^="trash-allergy"], span[id^="trash-icon-family-"]'
  ).forEach(el => setIcon(el, 'trash2'));

  document.querySelectorAll(
    'span[id^="edit-icon-"], span[id^="edit"], span[id^="edit-icon-family-"]'
  ).forEach(el => setIcon(el, 'edit'));
}


  // ---------- add handlers ----------
  const chronicForm = document.getElementById('add-chronic-form');
  const chronicSubmit = document.getElementById('add-chronic-submit');
  const chronicModal = document.getElementById('add-chronic-modal');

  const allergyForm = document.getElementById('add-allergy-form');
  const allergySubmit = document.getElementById('add-allergy-submit');
  const allergyModal = document.getElementById('add-allergy-modal');
  const allergyErrors = document.getElementById('add-allergy-errors');

  const medicationForm = document.getElementById('add-medication-form');
  const medicationSubmit = document.getElementById('add-medication-submit');
  const medicationModal = document.getElementById('add-medication-modal');
  const medicationErrors = document.getElementById('add-medication-errors');

  const familyHistoryForm = document.getElementById('add-family-history-form');
  const familyHistorySubmit = document.getElementById('add-family-history-submit');
  const familyHistoryModal = document.getElementById('add-family-history-modal');
  const familyHistoryErrors = document.getElementById('add-family-history-errors');


  ////////////////
  // no-reload-functions.js
// Full set of "no-reload" helpers for MedRecord UI.
// Drop this file into your static js and include after the other scripts (or replace the missing functions).

(function () {
  'use strict';

  // Safe fallback for setIcon (if your icon system exists, it will override this)
  if (typeof window.setIcon !== 'function') {
    window.setIcon = function (el, name, extraClass) {
      try {
        if (!el) return;
        el.className = (extraClass ? extraClass + ' ' : '') + 'icon-' + name;
      } catch (e) { /* noop */ }
    };
  }

  // ---------- utilities ----------
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  }

  function createCell(text, cls) {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text || '';
    return td;
  }

  function createButton(html, classes, attrs) {
    const btn = document.createElement('button');
    btn.className = classes || 'btn';
    btn.type = 'button';
    if (html && html.indexOf('<') !== -1) btn.innerHTML = html; else btn.textContent = html || '';
    if (attrs) {
      Object.keys(attrs).forEach(k => btn.setAttribute(k, attrs[k]));
    }
    return btn;
  }

  function prependToParent(parent, node) {
    if (!parent) return;
    if (parent.firstChild) parent.insertBefore(node, parent.firstChild);
    else parent.appendChild(node);
  }

  // ---------- expose functions to global scope ----------
  // We'll attach functions to window so other scripts can call them.

  // ---------------- Add Allergy Row ----------------
  function addAllergyRow(item) {
    // table row
    const tbody = document.getElementById('allergies-tbody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.dataset.pk = item.id;
      if (item.edit_url) tr.dataset.editUrl = item.edit_url;
      tr.innerHTML = `
        <td class="allergy-name">${item.allergen || item.name || ''}</td>
        <td class="allergy-type">${item.type || ''}</td>
        <td class="allergy-severity">${item.severity || ''}</td>
        <td class="allergy-reaction">${item.reaction || ''}</td>
        <td>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm edit-allergy-btn" type="button" aria-label="Edit allergy" data-edit-url="${item.edit_url || ''}">
              <span id="edit-icon-allergy-${item.id}" class="icon-sm"></span>
            </button>
            <button class="btn btn-ghost btn-sm text-red-600 delete-allergy-btn" type="button" data-delete-url="${item.delete_url || `/delete_allergy/${item.id}/`}">
              <span id="trash-icon-allergy-${item.id}" class="icon-sm"></span>
            </button>
          </div>
        </td>
      `;
      prependToParent(tbody, tr);
      initDynamicRow(tr);
      dispatchDynamicRowAdded(tr);
      // set icons if available
      setIcon(document.getElementById(`edit-icon-allergy-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-allergy-${item.id}`), 'trash2');
    }

    // mobile card
    const cards = document.getElementById('allergies-cards');
    if (cards) {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.dataset.pk = item.id;
      card.dataset.editUrl = item.edit_url || '';
      card.innerHTML = `
        <strong>${item.allergen || item.name || ''}</strong><br/>
        ${item.type ? ('Type: ' + item.type + '<br/>') : ''}
        ${item.severity ? ('Severity: ' + item.severity + '<br/>') : ''}
        ${item.reaction ? ('Reaction: ' + item.reaction + '<br/>') : ''}
        <div class="mt-2 flex gap-2">
          <button class="btn btn-sm edit-allergy-btn" data-edit-url="${item.edit_url || ''}"><span id="edit-icon-allergy-m-${item.id}" class="icon-sm"></span></button>
          <button class="btn btn-sm delete-allergy-btn" data-delete-url="${item.delete_url || `/delete_allergy/${item.id}/`}"><span id="trash-icon-allergy-m-${item.id}" class="icon-sm"></span></button>
        </div>
      `;
      prependToParent(cards, card);
      initDynamicRow(card);
      dispatchDynamicRowAdded(card);
      setIcon(document.getElementById(`edit-icon-allergy-m-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-allergy-m-${item.id}`), 'trash2');
    }
  }

  // ---------------- Add Chronic Row ----------------
  function addChronicRow(item) {
    const tbody = document.getElementById('chronic-tbody') || document.getElementById('chronic-diseases-tbody') || document.getElementById('chronic-diseases-body');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.dataset.pk = item.id;
      if (item.edit_url) tr.dataset.editUrl = item.edit_url;
      tr.innerHTML = `
        <td class="chronic-name">${item.disease || item.disease_name || ''}</td>
        <td class="chronic-date">${item.date_diagnosed || ''}</td>
        <td class="chronic-status">${item.status_text || item.status || ''}</td>
        <td class="chronic-severity">${item.severity || ''}</td>
        <td>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm edit-chronic-btn" type="button" aria-label="Edit chronic" data-edit-url="${item.edit_url || ''}">
              <span id="edit-icon-chronic-${item.id}" class="icon-sm"></span>
            </button>
            <button class="btn btn-ghost btn-sm text-red-600 delete-chronic-btn" type="button" data-delete-url="${item.delete_url || `/delete_chronic/${item.id}/`}">
              <span id="trash-icon-chronic-${item.id}" class="icon-sm"></span>
            </button>
          </div>
        </td>
      `;
      prependToParent(tbody, tr);
      initDynamicRow(tr);
      dispatchDynamicRowAdded(tr);
      setIcon(document.getElementById(`edit-icon-chronic-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-chronic-${item.id}`), 'trash2');
    }

    const cards = document.getElementById('chronic-cards');
    if (cards) {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.dataset.pk = item.id;
      card.dataset.editUrl = item.edit_url || '';
      card.innerHTML = `
        <strong>${item.disease || item.disease_name || ''}</strong><br/>
        ${item.status_text ? ('Status: ' + item.status_text + '<br/>') : (item.status ? ('Status: ' + item.status + '<br/>') : '')}
        ${item.date_diagnosed ? ('Diagnosed: ' + item.date_diagnosed + '<br/>') : ''}
        ${item.severity ? ('Severity: ' + item.severity + '<br/>') : ''}
        <div class="mt-2 flex gap-2">
          <button class="btn btn-sm edit-chronic-btn" data-edit-url="${item.edit_url || ''}"><span id="edit-icon-chronic-m-${item.id}" class="icon-sm"></span></button>
          <button class="btn btn-sm delete-chronic-btn" data-delete-url="${item.delete_url || `/delete_chronic/${item.id}/`}"><span id="trash-icon-chronic-m-${item.id}" class="icon-sm"></span></button>
        </div>
      `;
      prependToParent(cards, card);
      initDynamicRow(card);
      dispatchDynamicRowAdded(card);
      setIcon(document.getElementById(`edit-icon-chronic-m-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-chronic-m-${item.id}`), 'trash2');
    }
  }

  // ---------------- Add Medication Row (improves earlier implementation) ----------------
  function addMedicationRow(item) {
    const tbody = document.getElementById('medications-tbody');
    if (!tbody) {
      const cards = document.getElementById('medications-cards');
      if (!cards) { window.location.reload(); return; }
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.dataset.pk = item.id;
      card.innerHTML = `
        <strong class="med-name">${item.medication || item.medication_name || ''}</strong><br/>
        ${item.dosage ? ('Dosage: ' + item.dosage + '<br/>') : ''}
        ${item.frequency ? ('Frequency: ' + item.frequency + '<br/>') : ''}
        ${item.start_date ? ('Start: ' + item.start_date + '<br/>') : ''}
        <div class="mt-2 flex gap-2">
          <button class="btn btn-sm edit-med-btn" data-edit-url="${item.edit_url || ''}"><span id="edit-icon-med-m-${item.id}" class="icon-sm"></span></button>
          <button class="btn btn-sm delete-medication-btn" data-delete-url="${item.delete_url || `/medications/delete/${item.id}/`}"><span id="trash-icon-med-m-${item.id}" class="icon-sm"></span></button>
        </div>
      `;
      prependToParent(cards, card);
      initDynamicRow(card);
      dispatchDynamicRowAdded(card);
      setIcon(document.getElementById(`edit-icon-med-m-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-med-m-${item.id}`), 'trash2');
      return;
    }

    const tr = document.createElement('tr');
    tr.dataset.pk = item.id;
    tr.innerHTML = `
      <td class="med-name">${item.medication || item.medication_name || ''}</td>
      <td class="med-dosage">${item.dosage || ''}</td>
      <td class="med-frequency">${item.frequency || ''}</td>
      <td class="med-start">${item.start_date || ''}</td>
      <td>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm edit-med-btn" type="button" data-edit-url="${item.edit_url || ''}"><span id="edit-icon-med-${item.id}" class="icon-sm"></span></button>
          <button class="btn btn-ghost btn-sm text-red-600 delete-medication-btn" type="button" data-delete-url="${item.delete_url || `/medications/delete/${item.id}/`}"><span id="trash-icon-med-${item.id}" class="icon-sm"></span></button>
        </div>
      </td>
    `;

    prependToParent(tbody, tr);
    initDynamicRow(tr);
    dispatchDynamicRowAdded(tr);
    setIcon(document.getElementById(`edit-icon-med-${item.id}`), 'edit');
    setIcon(document.getElementById(`trash-icon-med-${item.id}`), 'trash2');
  }

  // ---------------- Add Family History Row (existing one preserved) ----------------
  function addFamilyHistoryRow(item) {
    const tbody = document.getElementById('family-history-tbody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.dataset.pk = item.id;
      tr.dataset.editUrl = item.edit_url || item.editUrl || `/family/history/${item.id}/`;
      tr.innerHTML = `
        <td class="family-condition">${item.condition || ''}</td>
        <td class="family-relationship">${item.relationship || ''}</td>
        <td class="family-age">${item.age_of_onset || ''}</td>
        <td class="family-notes">${item.notes || ''}</td>
        <td>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm edit-family-btn" type="button" aria-label="Edit family history" data-edit-url="${item.edit_url || ''}">
              <span id="edit-icon-family-${item.id}" class="icon-sm"></span>
            </button>

            <button class="btn btn-ghost btn-sm text-red-600 delete-family-history-btn" type="button" data-delete-url="${item.delete_url || `/family/delete-history/${item.id}/`}">
              <span id="trash-icon-family-${item.id}" class="icon-sm"></span>
            </button>
          </div>
        </td>
      `;
      prependToParent(tbody, tr);
      initDynamicRow(tr);
      dispatchDynamicRowAdded(tr);
      setIcon(document.getElementById(`edit-icon-family-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-family-${item.id}`), 'trash2');
    }

    const cards = document.getElementById('family-history-cards');
    if (cards) {
      const card = document.createElement('div');
      card.className = 'mobile-card';
      card.dataset.pk = item.id;
      card.dataset.editUrl = item.edit_url || `/family/history/${item.id}/`;
      card.innerHTML = `
        <strong>${item.condition || ''}</strong><br/>
        Relation: ${item.relationship || ''}<br/>
        Age of Onset: ${item.age_of_onset || 'N/A'}<br/>
        Notes: ${item.notes || ''}<br/>
        <div class="mt-2 flex gap-2">
          <button class="btn btn-sm edit-family-btn" data-edit-url="${item.edit_url || ''}"><span id="edit-icon-family-m-${item.id}" class="icon-sm"></span></button>
          <button class="btn btn-sm delete-family-history-btn" data-delete-url="${item.delete_url || `/family/delete-history/${item.id}/`}"><span id="trash-icon-family-m-${item.id}" class="icon-sm"></span></button>
        </div>
      `;
      prependToParent(cards, card);
      initDynamicRow(card);
      dispatchDynamicRowAdded(card);
      setIcon(document.getElementById(`edit-icon-family-m-${item.id}`), 'edit');
      setIcon(document.getElementById(`trash-icon-family-m-${item.id}`), 'trash2');
    }
  }

  // ---------------- Update existing row/card after edit ----------------
  function updateRowAfterEdit(type, data, pk) {
    if (!pk) return;
    const row = document.querySelector(`tr[data-pk="${pk}"]`);
    const mobile = document.querySelector(`.mobile-card[data-pk="${pk}"]`);

    if (type === 'medication') {
      if (row) {
        const nameEl = row.querySelector('.med-name'); if (nameEl) nameEl.textContent = data.medication_name || data.medication || '';
        const dEl = row.querySelector('.med-dosage'); if (dEl) dEl.textContent = data.dosage || '';
        const fEl = row.querySelector('.med-frequency'); if (fEl) fEl.textContent = data.frequency || '';
        const sEl = row.querySelector('.med-start'); if (sEl) sEl.textContent = data.start_date || '';
      }
      if (mobile) {
        const h = mobile.querySelector('strong') || mobile.querySelector('h4'); if (h) h.textContent = data.medication_name || data.medication || '';
      }
    }

    if (type === 'allergy') {
      if (row) {
        const nameCell = row.querySelector('.allergy-name'); if (nameCell) nameCell.textContent = data.name || data.allergen || '';
        const typeCell = row.querySelector('.allergy-type'); if (typeCell) typeCell.textContent = data.type || '';
        const sevCell = row.querySelector('.allergy-severity'); if (sevCell) sevCell.textContent = data.severity || '';
        const reactCell = row.querySelector('.allergy-reaction'); if (reactCell) reactCell.textContent = data.reaction || '';
      }
      if (mobile) {
        const h4 = mobile.querySelector('strong') || mobile.querySelector('h4'); if (h4) h4.textContent = data.name || data.allergen || '';
      }
    }

    if (type === 'chronic') {
      if (row) {
        const nameCell = row.querySelector('.chronic-name'); if (nameCell) nameCell.textContent = data.disease_name || data.disease || '';
        const dateCell = row.querySelector('.chronic-date'); if (dateCell) dateCell.textContent = data.date_diagnosed || '';
        const statusCell = row.querySelector('.chronic-status'); if (statusCell) statusCell.textContent = data.status || data.status_text || '';
        const sevCell = row.querySelector('.chronic-severity'); if (sevCell) sevCell.textContent = data.severity || '';
      }
      if (mobile) {
        const h4 = mobile.querySelector('strong') || mobile.querySelector('h4'); if (h4) h4.textContent = data.disease_name || data.disease || '';
      }
    }

    if (type === 'family') {
      if (row) {
        const condCell = row.querySelector('.family-condition'); if (condCell) condCell.textContent = data.condition || '';
        const relCell = row.querySelector('.family-relationship'); if (relCell) relCell.textContent = data.relationship || '';
        const ageCell = row.querySelector('.family-age'); if (ageCell) ageCell.textContent = data.age_of_onset || '';
        const notesCell = row.querySelector('.family-notes'); if (notesCell) notesCell.textContent = data.notes || '';
      }
      if (mobile) {
        const h4 = mobile.querySelector('strong') || mobile.querySelector('h4'); if (h4) h4.textContent = data.condition || '';
      }
    }
  }

  // Attach to window so other inline scripts can call them
  window.addAllergyRow = addAllergyRow;
  window.addChronicRow = addChronicRow;
  window.addMedicationRow = addMedicationRow;
  window.addFamilyHistoryRow = addFamilyHistoryRow;
  window.updateRowAfterEdit = updateRowAfterEdit;

  // Helpful: attempt to set icons for any existing dynamic icon placeholders
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[id^="edit-icon-"]').forEach(el => {
      const id = el.id;
      if (id.indexOf('-m-') === -1) setIcon(el, 'edit');
    });
    document.querySelectorAll('[id^="trash-icon-"]').forEach(el => setIcon(el, 'trash2'));
  });

})();


  // ---------- Add Chronic ----------
  if (chronicForm && chronicSubmit) {
    chronicSubmit.addEventListener('click', async function (ev) {
      ev.preventDefault();
      chronicSubmit.disabled = true;

      const formData = new FormData(chronicForm);
      const url = "{% url 'user:add_chronic' %}";

      try {
        const resp = await postForm(url, formData);
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        if (!resp.ok) {
          const text = await resp.text();
          console.error('add_chronic: server returned non-OK', resp.status, text);
          alert('Server error while adding chronic disease. See console.');
          return;
        }
        if (!contentType.includes('application/json')) {
          const text = await resp.text();
          console.error('add_chronic: expected JSON but got', contentType, text);
          alert('Unexpected server response (likely login redirect).');
          return;
        }

        const data = await resp.json();
        if (data.status === 'success') {
          const payload = {
            id: data.id,
            disease: data.disease || data.disease_name || formData.get('disease_name') || '',
            date_diagnosed: data.date_diagnosed || formData.get('date_diagnosed') || '',
            status_text: data.status_text || formData.get('status') || '',
            severity: data.severity || formData.get('severity') || ''
          };
          if (typeof addChronicRow === 'function') addChronicRow(payload);
          else location.reload();

          chronicForm.reset();
          if (chronicModal) chronicModal.classList.remove('active');
        } else {
          console.warn('add_chronic returned', data);
          alert('Add Chronic failed: ' + (data.message || JSON.stringify(data.errors || data)));
        }
      } catch (err) {
        console.error('Network/server error while adding chronic', err);
        alert('Network/server error while adding chronic disease — see console.');
      } finally {
        chronicSubmit.disabled = false;
      }
    });
  }

  // ---------- Add Allergy ----------
  if (allergyForm && allergySubmit) {
    allergySubmit.addEventListener('click', async function (ev) {
      ev.preventDefault();
      allergySubmit.disabled = true;
      if (allergyErrors) { allergyErrors.style.display = 'none'; allergyErrors.textContent = ''; }

      const formData = new FormData(allergyForm);
      const url = "{% url 'user:add_allergy' %}";

      try {
        const resp = await postForm(url, formData);
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        if (!resp.ok) {
          const text = await resp.text();
          console.error('add_allergy: server returned non-OK', resp.status, text);
          if (allergyErrors) { allergyErrors.textContent = 'Server error while adding allergy.'; allergyErrors.style.display = 'block'; }
          else alert('Server error while adding allergy. See console.');
          return;
        }
        if (!contentType.includes('application/json')) {
          const text = await resp.text();
          console.error('add_allergy: expected JSON but got', contentType, text);
          if (allergyErrors) { allergyErrors.textContent = 'Unexpected server response (likely login redirect).'; allergyErrors.style.display = 'block'; }
          else alert('Unexpected server response.');
          return;
        }

        const data = await resp.json();
        if (data.status === 'success') {
          const newItem = {
            id: data.id,
            allergen: data.allergen || formData.get('name') || '',
            type: data.type || formData.get('type') || '',
            severity: data.severity || formData.get('severity') || '',
            reaction: data.reaction || formData.get('reaction') || '',
            delete_url: data.delete_url || (`/delete_allergy/${data.id}/`)
          };
          if (typeof addAllergyRow === 'function') addAllergyRow(newItem);
          else location.reload();

          allergyForm.reset();
          if (allergyModal) allergyModal.classList.remove('active');
        } else {
          console.warn('add_allergy returned error JSON', data);
          if (allergyErrors) {
            const errHtml = data.errors ? Object.entries(data.errors).map(([k,v]) => `<strong>${k}:</strong> ${v}`).join('<br>') : (data.message || JSON.stringify(data));
            allergyErrors.innerHTML = errHtml;
            allergyErrors.style.display = 'block';
          } else {
            alert('Add Allergy failed: ' + (data.message || JSON.stringify(data)));
          }
        }
      } catch (err) {
        console.error('Network/server error while adding allergy', err);
        if (allergyErrors) {
          allergyErrors.textContent = 'Network/server error while adding allergy. See console.';
          allergyErrors.style.display = 'block';
        } else alert('Network/server error while adding allergy.');
      } finally {
        allergySubmit.disabled = false;
      }
    });
  }

  // ---------- Add Medication ----------
  // UI helper to add a medication row/card without reload
  




  if (medicationForm && medicationSubmit) {
    medicationSubmit.addEventListener('click', async function (ev) {
      ev.preventDefault();
      medicationSubmit.disabled = true;
      if (medicationErrors) { medicationErrors.style.display = 'none'; medicationErrors.textContent = ''; }

      const formData = new FormData(medicationForm);
      const url = "{% url 'user:add_medication' %}";

      try {
        const resp = await postForm(url, formData);
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();

        if (!resp.ok) {
          const text = await resp.text();
          console.error('add_medication: server returned non-OK', resp.status, text);
          if (medicationErrors) {
            medicationErrors.textContent = 'Server error while adding medication. See console.';
            medicationErrors.style.display = 'block';
          } else alert('Server error while adding medication. See console.');
          return;
        }

        if (!contentType.includes('application/json')) {
          const text = await resp.text();
          console.error('add_medication: expected JSON but got', contentType, text);
          if (medicationErrors) {
            medicationErrors.textContent = 'Unexpected server response (likely login redirect).';
            medicationErrors.style.display = 'block';
          } else alert('Unexpected server response.');
          return;
        }

        const data = await resp.json();
        if (data.status === 'success') {
          const newItem = {
            id: data.id,
            medication: data.medication,
            dosage: data.dosage,
            frequency: data.frequency,
            start_date: data.start_date,
            delete_url: data.delete_url || `/medications/delete/${data.id}/`
          };

          if (typeof addMedicationRow === 'function') addMedicationRow(newItem);
          else location.reload();

          medicationForm.reset();
          if (medicationModal) medicationModal.classList.remove('active');
        } else {
          const err = data.errors ? JSON.stringify(data.errors) : data.message || JSON.stringify(data);
          if (medicationErrors) {
            medicationErrors.textContent = err;
            medicationErrors.style.display = 'block';
          } else alert('Add medication failed: ' + err);
        }
      } catch (err) {
        console.error('Network/server error while adding medication', err);
        if (medicationErrors) {
          medicationErrors.textContent = 'Network/server error while adding medication. See console.';
          medicationErrors.style.display = 'block';
        } else alert('Network/server error while adding medication.');
      } finally {
        medicationSubmit.disabled = false;
      }
    });
  }

});




document.addEventListener('DOMContentLoaded', function() {

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  }

  // ---------------- Add Family History Row ----------------
// ---------------- Handle Add Form ----------------
  const familyHistoryForm = document.getElementById('add-family-history-form');
  const familyHistorySubmit = document.getElementById('add-family-history-submit');
  const familyHistoryModal = document.getElementById('add-family-history-modal');
  const familyHistoryErrors = document.getElementById('add-family-history-errors');

if (familyHistoryForm && familyHistorySubmit) {
  familyHistorySubmit.addEventListener('click', async function (ev) {
    ev.preventDefault();
    familyHistorySubmit.disabled = true;
    familyHistoryErrors.style.display = 'none';
    familyHistoryErrors.textContent = '';

    const formData = new FormData(familyHistoryForm);
    const url = "{% url 'user:add_family_history' %}";

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
      });

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      if (!resp.ok) {
        const text = await resp.text();
        console.error('add_family_history: server returned non-OK', resp.status, text);
        familyHistoryErrors.textContent = 'Server error while adding family history';
        familyHistoryErrors.style.display = 'block';
        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await resp.text();
        console.error('add_family_history: expected JSON but got', contentType, text);
        familyHistoryErrors.textContent = 'Unexpected server response';
        familyHistoryErrors.style.display = 'block';
        return;
      }

      const data = await resp.json();
      if (data.status === 'success') {
        const payload = {
          id: data.id,
          condition: data.condition || formData.get('condition') || '',
          relationship: data.relationship || formData.get('relationship') || '',
          age_of_onset: data.age_of_onset || formData.get('age_of_onset') || '',
          notes: data.notes || formData.get('notes') || ''
        };

        if (typeof addFamilyHistoryRow === 'function') addFamilyHistoryRow(payload);
        else location.reload();

        familyHistoryForm.reset();
        if (familyHistoryModal) familyHistoryModal.classList.remove('active');
      } else {
        console.warn('add_family_history returned', data);
        familyHistoryErrors.textContent = data.message || 'Error adding record';
        familyHistoryErrors.style.display = 'block';
      }

    } catch (err) {
      console.error('Network/server error while adding family history', err);
      familyHistoryErrors.textContent = 'Network/server error';
      familyHistoryErrors.style.display = 'block';
    } finally {
      familyHistorySubmit.disabled = false;
    }
  });
}

 // Unified delegated handler for edit + delete buttons (paste once)


});
// ----------------- Quick fixes to make dynamic rows interactive -----------------
(function () {
  // expose core helpers globally (if they exist in a local scope, re-expose them)
  if (typeof findRowAndUrl === 'function') window.findRowAndUrl = findRowAndUrl;
  if (typeof fetchItem === 'function') window.fetchItem = fetchItem;

  // make sure a single getCookie is available globally
  if (typeof window.getCookie !== 'function') {
    window.getCookie = function (name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      if (match) return decodeURIComponent(match[2]);
      return null;
    };
  }

  // initialize icons & attributes for a newly created row/card
function initDynamicRow(node) {
  if (!node) return;
  // ensure data-pk exists as an attribute (not only dataset)
  if (node.dataset && node.dataset.pk) node.setAttribute('data-pk', node.dataset.pk);

  // ensure edit and delete url attributes exist too
  if (node.dataset && node.dataset.editUrl) node.setAttribute('data-edit-url', node.dataset.editUrl);
  if (node.dataset && node.dataset.deleteUrl) node.setAttribute('data-delete-url', node.dataset.deleteUrl);

  // ensure any child buttons have type="button" to avoid accidental form submits
  node.querySelectorAll('button').forEach(btn => {
    if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
  });

  // normalize data-delete-url on children (some templates put it in dataset only)
  node.querySelectorAll('[data-delete-url], [data-deleteurl]').forEach(btn => {
    const ds = btn.dataset && (btn.dataset.deleteUrl || btn.dataset.deleteurl);
    if (ds) btn.setAttribute('data-delete-url', ds);
  });

  // ensure edit buttons also expose attribute
  node.querySelectorAll('.edit-med-btn, .edit-allergy-btn, .edit-chronic-btn, .edit-family-btn, [data-edit-url]').forEach(btn => {
    const ds = btn.dataset && (btn.dataset.editUrl || btn.getAttribute('data-edit-url'));
    if (ds) btn.setAttribute('data-edit-url', ds);
  });

  // try to set icons (safe)
  try {
    node.querySelectorAll('[id^="edit-icon-"], [id^="trash-icon-"]').forEach(el => {
      if (typeof setIcon === 'function') {
        const id = el.id || '';
        if (id.toLowerCase().indexOf('trash') !== -1) setIcon(el, 'trash2');
        else setIcon(el, 'edit');
      }
    });
  } catch (e) { /* noop */ }
}

  // expose initDynamicRow in case you want to call it manually after adding rows
  window.initDynamicRow = initDynamicRow;

  // Small convenience: when add*Row adds a new element, trigger an event so other code can react
  window.dispatchDynamicRowAdded = function (node) {
    try {
      const ev = new CustomEvent('dynamic-row-added', { detail: { node } });
      document.dispatchEvent(ev);
    } catch (e) { /* noop */ }
  };

  // Auto-listener: when dynamic row is added, run initDynamicRow
  document.addEventListener('dynamic-row-added', function (ev) {
    initDynamicRow(ev.detail && ev.detail.node);
  });

})();


