        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                padding: 1rem;
                border-radius: 0.5rem;
                background-color: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                box-shadow: 0 10px 15px rgba(0,0,0,0.1);
                z-index: 9999;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }

        function getCSRFToken() {
            return document.querySelector('[name=csrfmiddlewaretoken]').value;
        }

function handleRequest(action, requestId) {
    fetch(window.HANDLE_SHARING_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({
            request_id: requestId,
            action: action
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === "success") {
            showNotification(data.message, "success");
            document.getElementById(`request-card-${requestId}`)?.remove();
            location.reload();
        } else {
            showNotification(data.message, "error");
        }
    })
    .catch(() => {
        showNotification("An error occurred.", "error");
    });
}


function calculateAge(dobIso) {
  if (!dobIso) return '—';
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return '—';
  const diff = Date.now() - dob.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 1rem; right: 1rem; padding: 0.65rem 0.9rem;
    border-radius: 0.5rem; color: #fff; z-index: 9999;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#16a34a' : '#2563eb'};
    box-shadow: 0 6px 18px rgba(0,0,0,0.12);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial;
  `;
  notification.innerText = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3500);
}

function fillListTable(tbodyId, items, columnsRenderer) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = "";

  // determine colspan from table header if exists
  let colspan = 4;
  const table = tbody.closest("table");
  if (table) {
    const ths = table.querySelectorAll("thead th");
    if (ths && ths.length) colspan = ths.length;
  }

  if (!items || items.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colspan;
    td.innerText = "No records";
    td.style.opacity = "0.7";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  items.forEach(item => {
    const tr = document.createElement("tr");
    const cells = columnsRenderer(item) || [];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.innerText = text ?? "—";
      tr.appendChild(td);
    });
    // if renderer produced fewer cells than header, pad
    while (tr.children.length < colspan) {
      const td = document.createElement("td");
      td.innerHTML = "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function renderPermissions(containerId, permissions) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = "";
  (permissions || []).forEach(p => {
    const d = document.createElement("div");
    d.className = "badge badge-secondary text-xs";
    d.innerText = p;
    c.appendChild(d);
  });
}


////
function renderPermissionsInCard(accessPk, permissions) {
  const c = document.querySelector(
    `.access-permissions-summary[data-access-pk="${accessPk}"]`
  );
  if (!c) return;

  c.innerHTML = "";

  (permissions || []).forEach(p => {
    const d = document.createElement("div");
    d.className = "badge badge-secondary text-xs";
    d.innerText = p;
    c.appendChild(d);
  });
}

////

function renderEmergencyContacts(containerId, contacts) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  // إذا لم توجد جهات اتصال
  if (!contacts || contacts.length === 0) {
    const noDiv = document.createElement("div");
    noDiv.className = "text-muted-foreground";
    noDiv.innerText = "No emergency contacts";
    container.appendChild(noDiv);
    return;
  }

  // عرض كل جهة اتصال كبطاقة بسيطة
  contacts.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "mb-3 p-3 border rounded-lg"; // عدّل الستايل حسب الحاجة

    const nameRow = document.createElement("div");
    nameRow.className = "flex justify-between";
    nameRow.innerHTML = `<span class="text-muted-foreground">Name:</span><span class="font-medium">${escapeHtml(c.name || c.full_name || "—")}</span>`;

    const relRow = document.createElement("div");
    relRow.className = "flex justify-between";
    relRow.innerHTML = `<span class="text-muted-foreground">Relationship:</span><span class="font-medium">${escapeHtml(c.relationship || "—")}</span>`;

    const phoneRow = document.createElement("div");
    phoneRow.className = "flex justify-between";
    // بعض الأنظمة ترسل phone أو phone_number
    const phone = c.phone_number || c.phone || c.mobile || "—";
    phoneRow.innerHTML = `<span class="text-muted-foreground">Phone:</span><span class="font-medium">${escapeHtml(phone)}</span>`;

    card.appendChild(nameRow);
    card.appendChild(relRow);
    card.appendChild(phoneRow);

    container.appendChild(card);
  });
}

function renderFiles(containerId, files) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (!files || files.length === 0) {
    container.innerHTML = "<div class='text-muted-foreground'>No files</div>";
    return;
  }
  files.forEach(f => {
    const card = document.createElement("div");
    card.className = "card p-4";
    const name = f.file_name || "File";
    const size = f.size_display || (f.size ? `${(f.size/1024/1024).toFixed(1)} MB` : "—");
    const uploaded = f.upload_date ? new Date(f.upload_date).toLocaleDateString() : "—";
    card.innerHTML = `
      <div class="space-y-2">
        <h4 class="font-medium text-sm">${name}</h4>
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">${f.category || f.file_type || 'Document'}</span>
          <span class="text-xs text-muted-foreground">${size}</span>
        </div>
        <p class="text-xs text-muted-foreground">${uploaded}</p>
        <div class="flex gap-2 mt-2">
          ${f.download_url ? `<a class="btn btn-primary btn-sm" href="${f.download_url}" target="_blank">Open</a>` : ""}
<div class="flex gap-2 mt-2">
  ${f.download_url
    ? `<a class="btn btn-ghost btn-sm" href="${f.download_url}" download>Download</a>`
    : ""
  }
</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function viewPatientDetails(pk) {
  window.currentAccessPk = pk;
  if (!pk) { showNotification("Invalid access key", "error"); return; }
  const url = `/user/api/accessgrant/${pk}/`;
  const nameEl = document.getElementById('patient-name');
  const prevName = nameEl?.innerText;
  if (nameEl) nameEl.innerText = "Loading...";

  fetch(url, { method: "GET", credentials: "same-origin", headers: { "Accept": "application/json" } })
    .then(async resp => {
      if (resp.status === 403) throw new Error("Access denied");
      if (resp.status === 404) throw new Error("Not found");
      if (!resp.ok) throw new Error(await resp.text());
      return resp.json();
    })
    .then(data => {
      const p = data.patient || {};
      const a = data.accessgrant || {};
      window.currentPatientId = p.id;


      document.getElementById('patient-name').innerText = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—";
      document.getElementById('patient-id').innerText = `ID: ${p.id ?? "—"}`;
      document.getElementById('patient-dob').innerText = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "—";
      document.getElementById('patient-age').innerText = p.date_of_birth ? calculateAge(p.date_of_birth) : "—";
      document.getElementById('patient-gender').innerText = p.gender || "—";
      document.getElementById('patient-blood').innerText = p.blood_type || "—";

      // access info
      if (document.getElementById('access-level')) document.getElementById('access-level').innerText = a.data_scope || "—";
      if (document.getElementById('access-granted')) document.getElementById('access-granted').innerText = a.granted_at ? new Date(a.granted_at).toLocaleDateString() : "—";
      if (document.getElementById('access-expires')) document.getElementById('access-expires').innerText = a.revoked_at ? new Date(a.revoked_at).toLocaleDateString() : "—";
      renderPermissions("access-permissions", a.permissions || []);
      renderPermissionsInCard(pk, a.permissions || []);

      
      

      // fill lists
      fillListTable("chronic-table-body", data.chronic || [], item => [
        item.disease,
        item.date_diagnosed ? new Date(item.date_diagnosed).toLocaleDateString() : "—",
        item.status,
        item.severity,
        "" // placeholder for actions column
      ]);

      fillListTable("allergy-table-body", data.allergies || [], item => [
        item.allergen, item.type, item.severity, item.reaction, ""
      ]);

      fillListTable("med-table-body", data.medications || [], item => [
        item.medication_name, item.dosage, item.frequency,
        item.start_date ? new Date(item.start_date).toLocaleDateString() : "—", ""
      ]);
      // (add these lines right after the fillListTable(...) calls)
      attachActionsToTable("chronic-table-body", data.chronic || [], 'chronic');
      attachActionsToTable("allergy-table-body", data.allergies || [], 'allergy');
      attachActionsToTable("med-table-body", data.medications || [], 'medication');


      renderEmergencyContacts("emergency-contacts-list", data.emergency_contacts || []);
      renderFiles("files-list", data.files || []);

      if (typeof showSection === "function") showSection("provider-patient-detail");
    })
    .catch(err => {
      console.error(err);
      if (nameEl) nameEl.innerText = prevName;
      showNotification(err.message || "Failed to load patient details", "error");
    });

    
}


  function actionButtonsMarkup(type, id) {
  return `
    <div class="action-buttons" data-type="${type}" data-id="${id}">
      <button class="btn btn-ghost btn-edit" data-type="${type}" data-id="${id}" title="Edit">
        <span class="icon-edit" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z"/>
          </svg>
        </span>
      </button>

      <button class="btn btn-ghost btn-delete" data-type="${type}" data-id="${id}" title="Delete">
        <span class="icon-delete" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </span>
      </button>
    </div>
  `;
}

 


// ---------- SVG icons ----------
const ICON_PLUS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21v-3.75L14.06 6.19a2 2 0 012.82 0l1.94 1.94a2 2 0 010 2.82L7.75 21H3z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- Helpers ----------
function escapeHtml(str){ if(!str && str!==0) return ''; return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function getCSRFToken(){ // tries common patterns; replace if you have other method
  const match = document.cookie.match(/csrftoken=([^;]+)/); if(match) return match[1];
  const el = document.querySelector('input[name="csrfmiddlewaretoken"]'); if(el) return el.value;
  return '';
}
function showNotification(msg, type='info'){ console.log('NOTIFY', type, msg); /* replace with your UI toast */ }

// ---------- Modal state ----------
let _medState = { action: null, item: null };

function openMedModal(action, item=null){
  _medState = { action, item };
  document.getElementById('med-error').style.display='none';
  document.getElementById('med-modal-title').innerText = action === 'add' ? 'Add Medication' : 'Edit Medication';
  document.getElementById('med-name').value = item ? (item.medication_name || '') : '';
  document.getElementById('med-dosage').value = item ? (item.dosage || '') : '';
  document.getElementById('med-frequency').value = item ? (item.frequency || '') : '';
  document.getElementById('med-started').value = item ? (item.started || '') : '';
  document.getElementById('med-modal').classList.remove('hidden');
  document.getElementById('med-modal').setAttribute('aria-hidden','false');
}
function closeMedModal(e){ document.getElementById('med-modal').classList.add('hidden'); document.getElementById('med-modal').setAttribute('aria-hidden','true'); _medState={action:null,item:null}; }

// submit add/edit
async function submitMedModal(){
  const name = document.getElementById('med-name').value.trim();
  const dosage = document.getElementById('med-dosage').value.trim();
  const freq = document.getElementById('med-frequency').value.trim();
  const started = document.getElementById('med-started').value.trim();
  if(!name){ const err = document.getElementById('med-error'); err.innerText='Medication name is required'; err.style.display='block'; return; }
  const payload = { medication_name: name, dosage, frequency: freq, started, access_pk: window.currentAccessPk   // 🔥 REQUIRED!!
 };
  const token = getCSRFToken();
  try {
    let url = '/user/api/medication/'; let method = 'POST';
    if(_medState.action === 'edit' && _medState.item && (_medState.item.id || _medState.item.pk)){
      const id = _medState.item.id || _medState.item.pk;
      url = `/user/api/medication/${id}/`; method = 'PUT';
    }
    const resp = await fetch(url, { method, credentials:'same-origin',
      headers: {'Content-Type':'application/json', 'X-CSRFToken': token }, body: JSON.stringify(payload) });
    if(!resp.ok){ const j = await resp.json().catch(()=>({})); document.getElementById('med-error').innerText = j.message || `Server error ${resp.status}`; document.getElementById('med-error').style.display='block'; return; }
    closeMedModal();
    showNotification((_medState.action==='add'?'Added':'Updated')+' medication','success');
    // Try to refresh table: prefer user-defined loader functions else reload page
    if(typeof loadMedications === 'function') loadMedications();
    else if(typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
    else location.reload();
  } catch(err){ console.error(err); document.getElementById('med-error').innerText='Network error'; document.getElementById('med-error').style.display='block'; }
}

// delete
async function deleteMedication(id){
  if(!confirm('Are you sure you want to delete this medication?')) return;
  const token = getCSRFToken();
  try {
    const resp = await fetch(`/user/api/medication/${id}/`, { method:'DELETE', credentials:'same-origin', headers:{ 'X-CSRFToken': token }});
    if(!resp.ok){ const j = await resp.json().catch(()=>({})); showNotification(j.message || 'Delete failed','error'); return; }
    showNotification('Deleted medication','success');
    if(typeof loadMedications === 'function') loadMedications();
    else if(typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
    else location.reload();
  } catch(err){ console.error(err); showNotification('Network error','error'); }
}

// ---------- Main renderer: استدعي هذه الدالة بعد جلب items ----------
function renderMedTable(items){
  const tbody = document.getElementById('med-table-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  (items || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.medication_name)}</td>
      <td>${escapeHtml(item.dosage)}</td>
      <td>${escapeHtml(item.frequency)}</td>
      <td>${escapeHtml(item.started)}</td>
    `;
    // actions cell
    const td = document.createElement('td');
    const group = document.createElement('div'); group.className = 'action-group';
    // Add
    const bAdd = document.createElement('button'); bAdd.className='icon-btn add'; bAdd.title='Add'; bAdd.innerHTML = ICON_PLUS;
    bAdd.onclick = (e) => { e.stopPropagation(); openMedModal('add', null); };
    group.appendChild(bAdd);
    // Edit
    const bEdit = document.createElement('button'); bEdit.className='icon-btn edit'; bEdit.title='Edit'; bEdit.innerHTML = ICON_EDIT;
    bEdit.onclick = (e) => { e.stopPropagation(); openMedModal('edit', item); };
    group.appendChild(bEdit);
    // Delete
    const bDel = document.createElement('button'); bDel.className='icon-btn del'; bDel.title='Delete'; bDel.innerHTML = ICON_TRASH;
    bDel.onclick = (e) => { e.stopPropagation(); const id = item.id || item.pk; if(!id){ alert('Missing id'); return; } deleteMedication(id); };
    group.appendChild(bDel);

    td.appendChild(group);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}
/* ---------- Attach action buttons into existing table rows ---------- */

function attachActionsToTable(tbodyId, items, kind) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((tr, idx) => {
    // ensure last cell exists
    let lastTd = tr.querySelector("td:last-child");
    if (!lastTd) {
      lastTd = document.createElement("td");
      tr.appendChild(lastTd);
    }
    // clear placeholder
    lastTd.innerHTML = "";

    const item = (items && items[idx]) ? items[idx] : null;
    const id = item ? (item.id || item.pk || "") : "";

    const group = document.createElement("div");
    group.className = "action-group";

    // Add button (opens quick-add prompt for that kind)
    const bAdd = document.createElement("button");
    bAdd.className = "icon-btn add";
    bAdd.title = "Add";
    bAdd.innerHTML = ICON_PLUS;
    bAdd.onclick = (e) => { e.stopPropagation(); quickEdit(kind, 'add', null); };
    group.appendChild(bAdd);

    // Edit button
    const bEdit = document.createElement("button");
    bEdit.className = "icon-btn edit";
    bEdit.title = "Edit";
    bEdit.innerHTML = ICON_EDIT;
    bEdit.onclick = (e) => { e.stopPropagation(); quickEdit(kind, 'edit', item); };
    group.appendChild(bEdit);

    // Delete button
    const bDel = document.createElement("button");
    bDel.className = "icon-btn del";
    bDel.title = "Delete";
    bDel.innerHTML = ICON_TRASH;
    bDel.onclick = (e) => { e.stopPropagation(); if (!id) { alert('Missing id'); return; } deleteGeneric(kind, id); };
    group.appendChild(bDel);

    lastTd.appendChild(group);
  });
}

/* ---------- Generic delete for chronic/allergy/medication ---------- */

/* ---------- Quick add/edit prompt (lightweight) ---------- */
/* For meds we prefer the existing modal; for chronic/allergy we use quick prompt */
async function quickEdit(kind, action, item) {
  // medication: use your modal already defined
  if (kind === 'medication') {
    if (action === 'add') openMedModal('add', null);
    else openMedModal('edit', item);
    return;
  }

  // For chronic/allergy use simple prompt fields (name + second + third)
  const field1Label = kind === 'chronic' ? 'Disease name' : 'Allergen';
  const field2Label = kind === 'chronic' ? 'Date diagnosed (YYYY-MM-DD)' : 'Type';
  const field3Label = kind === 'chronic' ? 'Severity / status' : 'Severity';

  if (action === 'add') {
    const f1 = prompt(`${field1Label}:`);
    if (f1 === null) return; // cancelled
    const f2 = prompt(`${field2Label}:`) || "";
    const f3 = prompt(`${field3Label}:`) || "";

    const payload = (kind === 'chronic') ?
      { disease: f1, date_diagnosed: f2 || null, severity: f3 || null, access_pk: window.currentAccessPk } :
      { allergen: f1, type: f2, severity: f3, access_pk: window.currentAccessPk };

    const token = getCSRFToken();
    try {
      const resp = await fetch(`/user/api/${kind}/`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const j = await resp.json().catch(()=>({}));
        showNotification(j.message || `Create failed (${resp.status})`, 'error');
        return;
      }
      showNotification('Created successfully', 'success');
      if (typeof viewPatientDetails === "function") viewPatientDetails(window.currentAccessPk || null);
    } catch (err) {
      console.error(err);
      showNotification('Network error', 'error');
    }
    return;
  }

  // edit
  if (!item) { alert('Missing item to edit'); return; }
  const cur1 = kind === 'chronic' ? (item.disease || '') : (item.allergen || '');
  const cur2 = kind === 'chronic' ? (item.date_diagnosed || '') : (item.type || '');
  const cur3 = kind === 'chronic' ? (item.severity || '') : (item.severity || '');

  const nf1 = prompt(`${field1Label}:`, cur1);
  if (nf1 === null) return;
  const nf2 = prompt(`${field2Label}:`, cur2) || "";
  const nf3 = prompt(`${field3Label}:`, cur3) || "";

  const payload = (kind === 'chronic') ?
    { disease: nf1, date_diagnosed: nf2 || null, severity: nf3 || null } :
    { allergen: nf1, type: nf2, severity: nf3 };

  const token = getCSRFToken();
  try {
    const id = item.id || item.pk;
    const resp = await fetch(`/user/api/${kind}/${id}/`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({}));
      showNotification(j.message || `Update failed (${resp.status})`, 'error');
      return;
    }
    showNotification('Updated successfully', 'success');
    if (typeof viewPatientDetails === "function") viewPatientDetails(window.currentAccessPk || null);
  } catch (err) {
    console.error(err);
    showNotification('Network error', 'error');
  }
}
function fillListTable(tbodyId, items, columnsRenderer) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = "";

  // determine colspan from table header if exists
  let colspan = 4;
  const table = tbody.closest("table");
  if (table) {
    const ths = table.querySelectorAll("thead th");
    if (ths && ths.length) colspan = ths.length;
  }

  if (!items || items.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colspan;
    td.innerText = "No records";
    td.style.opacity = "0.7";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  items.forEach(item => {
    const tr = document.createElement("tr");
    // store whole item for later (attachActions will parse it)
    try { tr.dataset.item = JSON.stringify(item); } catch(e) { tr.dataset.item = ""; }

    const cells = columnsRenderer(item) || [];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.innerText = text ?? "—";
      tr.appendChild(td);
    });
    // if renderer produced fewer cells than header, pad
    while (tr.children.length < colspan) {
      const td = document.createElement("td");
      td.innerHTML = "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}


/* ---------- Helpers (re-using patterns from your file) ---------- */
function closeChronicModal(e){ document.getElementById('chronic-modal').classList.add('hidden'); document.getElementById('chronic-modal').setAttribute('aria-hidden','true'); window._chronicState = null; }
function closeAllergyModal(e){ document.getElementById('allergy-modal').classList.add('hidden'); document.getElementById('allergy-modal').setAttribute('aria-hidden','true'); window._allergyState = null; }

let _chronicState = { action: null, item: null };
let _allergyState = { action: null, item: null };

function openChronicModal(action, item=null) {
  _chronicState = { action, item };
  document.getElementById('chronic-error').style.display = 'none';
  document.getElementById('chronic-modal-title').innerText = action === 'add' ? 'Add Chronic Disease' : 'Edit Chronic Disease';
  document.getElementById('chronic-disease').value = item ? (item.disease || '') : '';
  // normalize date input value to YYYY-MM-DD if possible
  const dateVal = item ? (item.date_diagnosed || item.date || '') : '';
  document.getElementById('chronic-date').value = dateVal ? (new Date(dateVal)).toISOString().slice(0,10) : '';
  document.getElementById('chronic-severity').value = item ? (item.severity || '') : '';
  document.getElementById('chronic-status').value = item ? (item.status || 'active') : 'active';
  document.getElementById('chronic-modal').classList.remove('hidden');
  document.getElementById('chronic-modal').setAttribute('aria-hidden','false');
}

function openAllergyModal(action, item=null) {
  _allergyState = { action, item };
  document.getElementById('allergy-error').style.display = 'none';
  document.getElementById('allergy-modal-title').innerText = action === 'add' ? 'Add Allergy' : 'Edit Allergy';
  document.getElementById('allergy-allergen').value = item ? (item.allergen || '') : '';
  document.getElementById('allergy-type').value = item ? (item.type || '') : '';
  document.getElementById('allergy-severity').value = item ? (item.severity || '') : '';
  document.getElementById('allergy-reaction').value = item ? (item.reaction || '') : '';
  document.getElementById('allergy-modal').classList.remove('hidden');
  document.getElementById('allergy-modal').setAttribute('aria-hidden','false');
}

/* ---------- Submit handlers (POST / PUT) ---------- */
async function submitChronicModal() {
  const disease = document.getElementById('chronic-disease').value.trim();
  const date_diagnosed = document.getElementById('chronic-date').value || null;
  const severity = document.getElementById('chronic-severity').value.trim();
  const status = document.getElementById('chronic-status').value;
  if (!disease) { const err = document.getElementById('chronic-error'); err.innerText = 'Disease is required'; err.style.display = 'block'; return; }

  const payload = { disease, date_diagnosed, severity, status, access_pk: window.currentAccessPk || null };
  const token = getCSRFToken();

  try {
    let url = '/user/api/chronic/'; let method = 'POST';
    if (_chronicState.action === 'edit' && _chronicState.item && (_chronicState.item.id || _chronicState.item.pk)) {
      const id = _chronicState.item.id || _chronicState.item.pk;
      url = `/user/api/chronic/${id}/`; method = 'PUT';
    }
    const resp = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({}));
      document.getElementById('chronic-error').innerText = j.message || `Server error ${resp.status}`;
      document.getElementById('chronic-error').style.display = 'block';
      return;
    }
    closeChronicModal();
    showNotification((_chronicState.action==='add'?'Added':'Updated') + ' chronic disease', 'success');
    if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
    else location.reload();
  } catch (err) {
    console.error(err);
    const e = document.getElementById('chronic-error');
    e.innerText = 'Network or server error';
    e.style.display = 'block';
  }
}

async function submitAllergyModal() {
  const allergen = document.getElementById('allergy-allergen').value.trim();
  const type = document.getElementById('allergy-type').value.trim();
  const severity = document.getElementById('allergy-severity').value.trim();
  const reaction = document.getElementById('allergy-reaction').value.trim();
  if (!allergen) { const err = document.getElementById('allergy-error'); err.innerText = 'Allergen is required'; err.style.display = 'block'; return; }

  const payload = { allergen, type, severity, reaction, access_pk: window.currentAccessPk || null };
  const token = getCSRFToken();

  try {
    let url = '/user/api/allergy/'; let method = 'POST';
    if (_allergyState.action === 'edit' && _allergyState.item && (_allergyState.item.id || _allergyState.item.pk)) {
      const id = _allergyState.item.id || _allergyState.item.pk;
      url = `/user/api/allergy/${id}/`; method = 'PUT';
    }
    const resp = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({}));
      document.getElementById('allergy-error').innerText = j.message || `Server error ${resp.status}`;
      document.getElementById('allergy-error').style.display = 'block';
      return;
    }
    closeAllergyModal();
    showNotification((_allergyState.action==='add'?'Added':'Updated') + ' allergy', 'success');
    if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
    else location.reload();
  } catch (err) {
    console.error(err);
    const e = document.getElementById('allergy-error');
    e.innerText = 'Network or server error';
    e.style.display = 'block';
  }
}

/* ---------- Generic delete used by actions ---------- */
async function deleteRecord(kind, id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  const token = getCSRFToken();
  try {
    const resp = await fetch(`/user/api/${kind}/${id}/`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': token }
    });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({}));
      showNotification(j.message || `Delete failed (${resp.status})`, 'error');
      return;
    }
    showNotification('Deleted successfully', 'success');
    if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
    else location.reload();
  } catch (err) {
    console.error(err);
    showNotification('Network error', 'error');
  }
}


////
  function _getCSRF() {
    try {
      if (typeof getCSRFToken === 'function') {
        const t = getCSRFToken();
        if (t) return t;
      }
    } catch (e) {}
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg, type='info'){ if (typeof showNotification === 'function') showNotification(msg,type); else console.log(type,msg); }


 // --- modal functions (add/edit)
  function openFamilyModal(action, item) {
    const modal = document.getElementById('family-modal');
    if (!modal) return;
    document.getElementById('family-error').style.display = 'none';
    document.getElementById('family-modal-title').innerText = action === 'add' ? 'Add Family History' : 'Edit Family History';
    document.getElementById('family-condition').value = item ? (item.condition || '') : '';
    document.getElementById('family-relationship').value = item ? (item.relationship || '') : '';
    document.getElementById('family-age').value = item ? (item.age_of_onset || item.age || '') : '';
    document.getElementById('family-notes').value = item ? (item.notes || '') : '';
    const saveBtn = document.getElementById('family-save-btn');
    saveBtn.dataset.action = action;
    saveBtn.dataset.id = item ? (item.id || item.pk || '') : '';
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
  }
  function closeFamilyModal() {
    const m = document.getElementById('family-modal');
    if (!m) return;
    m.classList.add('hidden'); m.setAttribute('aria-hidden','true');
  }

  async function submitFamilyModal() {
    const btn = document.getElementById('family-save-btn');
    const action = btn.dataset.action || 'add';
    const id = btn.dataset.id || '';
    const condition = (document.getElementById('family-condition').value || '').trim();
    const relationship = (document.getElementById('family-relationship').value || '').trim();
    const age_raw = (document.getElementById('family-age').value || '').trim();
    const notes = (document.getElementById('family-notes').value || '').trim();
    const age = age_raw === '' ? null : Number(age_raw);

    if (!condition) {
      const e = document.getElementById('family-error'); e.innerText = 'Condition is required'; e.style.display='block'; return;
    }

    const payload = { condition, relationship, age_of_onset: age, notes };
    const token = _getCSRF();

    try {
      if (action === 'add') {
        // include access_pk so provider can create on behalf of patient
        payload.access_pk = window.currentAccessPk || null;
        const resp = await fetch('/api/family-history/', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type':'application/json', 'X-CSRFToken': token, 'Accept':'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await resp.json().catch(()=>({}));
        if (!resp.ok || j.status !== 'success') {
          const msg = j.message || JSON.stringify(j) || `Server ${resp.status}`; document.getElementById('family-error').innerText = msg; document.getElementById('family-error').style.display='block'; return;
        }
        toast('Family history added', 'success');
        closeFamilyModal();
        if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
        else loadFamily(window.currentAccessPk);
      } else {
        if (!id) { document.getElementById('family-error').innerText='Missing id'; document.getElementById('family-error').style.display='block'; return; }
        const resp = await fetch(`/api/family-history/${id}/`, {
          method: 'PUT', credentials:'same-origin',
          headers: { 'Content-Type':'application/json', 'X-CSRFToken': token, 'Accept':'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await resp.json().catch(()=>({}));
        if (!resp.ok || j.status !== 'success') {
          const msg = j.message || JSON.stringify(j) || `Server ${resp.status}`; document.getElementById('family-error').innerText = msg; document.getElementById('family-error').style.display='block'; return;
        }
        toast('Family history updated', 'success');
        closeFamilyModal();
        if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
        else loadFamily(window.currentAccessPk);
      }
    } catch (err) {
      console.error('family submit error', err);
      document.getElementById('family-error').innerText = 'Network/server error'; document.getElementById('family-error').style.display='block';
    }
  }

  async function deleteFamily(id) {
    if (!id) { alert('Missing id'); return; }
    if (!confirm('Delete this family history record?')) return;
    try {
      const token = _getCSRF();
      const resp = await fetch(`/api/family-history/${id}/`, {
        method: 'DELETE', credentials:'same-origin',
        headers: { 'X-CSRFToken': token, 'Accept':'application/json' }
      });
      const j = await resp.json().catch(()=>({}));
      if (!resp.ok) { alert(j.message || 'Delete failed'); console.error('delete family', j); return; }
      toast('Deleted', 'info');
      if (typeof viewPatientDetails === 'function') viewPatientDetails(window.currentAccessPk || null);
      else loadFamily(window.currentAccessPk);
    } catch (err) {
      console.error('delete family error', err);
      alert('Network/server error while deleting.');
    }
  }

  /////
/* ---------- attachActionsToTable: inject Add/Edit/Delete into Actions column ---------- */
function attachActionsToTable(tbodyId, kind) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((tr, idx) => {
    // ensure last cell exists
    let lastTd = tr.querySelector("td:last-child");
    if (!lastTd) {
      lastTd = document.createElement("td");
      tr.appendChild(lastTd);
    }
    // clear placeholder
    lastTd.innerHTML = "";

    // parse item from data attribute
    let item = null;
    try { item = tr.dataset.item ? JSON.parse(tr.dataset.item) : null; } catch(e) { item = null; }

    // build group
    const group = document.createElement("div");
    group.className = "action-group";

    // Add button
    const bAdd = document.createElement("button");
    bAdd.className = "icon-btn add";
    bAdd.title = "Add";
    bAdd.innerHTML = ICON_PLUS;
    bAdd.onclick = (e) => { e.stopPropagation(); 
      if (kind === 'medication') openMedModal('add', null);
      else if (kind === 'chronic') openChronicModal('add', null);
      else if (kind === 'allergy') openAllergyModal('add', null);
      else if (kind === 'family') openFamilyModal('add', null);

    };
    group.appendChild(bAdd);

    // Edit button
    const bEdit = document.createElement("button");
    bEdit.className = "icon-btn edit";
    bEdit.title = "Edit";
    bEdit.innerHTML = ICON_EDIT;
    bEdit.onclick = (e) => { e.stopPropagation(); 
      if (kind === 'medication') openMedModal('edit', item);
      else if (kind === 'chronic') openChronicModal('edit', item);
      else if (kind === 'allergy') openAllergyModal('edit', item);
      else if (kind === 'family') openFamilyModal('edit', item);

    };
    group.appendChild(bEdit);

    // Delete button
    const bDel = document.createElement("button");
    bDel.className = "icon-btn del";
    bDel.title = "Delete";
    bDel.innerHTML = ICON_TRASH;
    bDel.onclick = (e) => { e.stopPropagation();
      const id = item ? (item.id || item.pk) : null;
      if (!id) { alert('Missing id'); return; }
      // map kind to endpoint name: medication | chronic | allergy
        if (kind == 'family'){
          deleteFamily(id);
        }
        else{
          const endpointKind = (kind === 'medication') ? 'medication' : kind;
          deleteRecord(endpointKind, id);
        }
    };
    group.appendChild(bDel);

    if (!item) {
    bEdit.style.display = 'none';
    bDel.style.display = 'none';
    }

    lastTd.appendChild(group);
  });
}

/* ---------- Wrap viewPatientDetails so we attach actions after table fill ---------- */
if (typeof viewPatientDetails === 'function') {
  const _origView = viewPatientDetails;
  window.viewPatientDetails = function(pk) {
    const ret = _origView(pk);
    // call attachers shortly after original to allow tables to be filled
    setTimeout(() => {
      attachActionsToTable("chronic-table-body", "chronic");
      attachActionsToTable("allergy-table-body", "allergy");
      attachActionsToTable("med-table-body", "medication");
      
    }, 160);
    return ret;
  };
}

/* provider-family-history-integration.js
   Drop after your provider JS. Uses getCSRFToken(), showNotification(), fillListTable(), attachActionsToTable().
*/

(function () {
  if (window.__providerFamilyHistoryIntegrated) return;
  window.__providerFamilyHistoryIntegrated = true;

  // --- small helpers (use existing helpers if present) ---
  function _getCSRF() {
    try {
      if (typeof getCSRFToken === 'function') {
        const t = getCSRFToken();
        if (t) return t;
      }
    } catch (e) {}
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg, type='info'){ if (typeof showNotification === 'function') showNotification(msg,type); else console.log(type,msg); }

  // --- rendering ---
  function ensureFamilyContainers() {
    // find card
    const card = document.getElementById('provider-family-history-card') || document.querySelector('.card:has(.card-title:text("Family"))');
    if (!card) return null;
    let mobile = card.querySelector('#family-history-cards');
    if (!mobile) {
      mobile = document.createElement('div');
      mobile.id = 'family-history-cards';
      mobile.className = 'mb-4';
      const content = card.querySelector('.card-content') || card;
      content.insertBefore(mobile, content.firstChild);
    }
    let tbody = card.querySelector('#family-table-body');
    if (!tbody) {
      // find any tbody and set id
      const anyTbody = card.querySelector('tbody');
      if (anyTbody) anyTbody.id = 'family-table-body';
      tbody = card.querySelector('#family-table-body');
      if (!tbody) {
        const tbl = document.createElement('table');
        tbl.className = 'table';
        tbl.innerHTML = `<thead><tr><th>Condition</th><th>Relation</th><th>Age of Onset</th><th>Notes</th><th>Actions</th></tr></thead><tbody id="family-table-body"></tbody>`;
        (card.querySelector('.card-content') || card).appendChild(tbl);
        tbody = tbl.querySelector('tbody');
      }
    }
    return { card, mobile, tbody };
  }

  function renderFamilyHistory(items) {
    const c = ensureFamilyContainers();
    if (!c) return;
    const { mobile, tbody } = c;
    tbody.innerHTML = '';
    mobile.innerHTML = '';

    if (!items || items.length === 0) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td ></td>
    <td></td>
    <td></td>

  `;
  tbody.appendChild(tr);

  // 🔥 now actions can attach
  attachActionsToTable('family-table-body', 'family');
  return;
    }

    items.forEach(item => {
      const id = item.id || item.pk || '';
      // table row
      const tr = document.createElement('tr');
      tr.setAttribute('data-pk', id);
      try { tr.dataset.item = JSON.stringify(item); } catch(e) { }
      tr.innerHTML = `
        <td class="family-condition">${escapeHtml(item.condition || '')}</td>
        <td class="family-relationship">${escapeHtml(item.relationship || '')}</td>
        <td class="family-age">${escapeHtml(item.age_of_onset == null ? '' : item.age_of_onset)}</td>
        <td class="family-notes">${escapeHtml(item.notes || '')}</td>
        <td class="family-actions"></td>
      `;
      tbody.appendChild(tr);

      
    });

    // attach actions into rows (uses your attachActionsToTable)
    // If attachActionsToTable doesn't know family, we will add actions manually below.
    if (typeof attachActionsToTable === 'function') {
      attachActionsToTable('family-table-body', 'family');
    } else {
      // fallback: add action buttons manually
      document.querySelectorAll('#family-table-body tr').forEach((tr, idx) => {
        const item = tr.dataset.item ? JSON.parse(tr.dataset.item) : null;
        const cell = tr.querySelector('.family-actions') || tr.appendChild(document.createElement('td'));
        cell.innerHTML = '';
        const btnEdit = document.createElement('button'); btnEdit.className='btn btn-ghost btn-sm'; btnEdit.textContent='Edit';
        btnEdit.onclick = (e) => { e.stopPropagation(); openFamilyModal('edit', item); };
        const btnDel = document.createElement('button'); btnDel.className='btn btn-ghost btn-sm text-red-600'; btnDel.textContent='Delete';
        btnDel.style.marginLeft = '6px';
        btnDel.onclick = (e) => { e.stopPropagation(); deleteFamily(item.id || item.pk); };
        cell.appendChild(btnEdit); cell.appendChild(btnDel);
      });
      document.querySelectorAll('#family-history-cards .mobile-card').forEach(card => {
        const item = card.dataset.item ? JSON.parse(card.dataset.item) : null;
        const container = card.querySelector('.family-actions-mobile');
        if (!container) return;
        container.innerHTML = '';
        const be = document.createElement('button'); be.className='btn btn-sm'; be.textContent='Edit';
        be.onclick = (e)=>{ e.stopPropagation(); openFamilyModal('edit', item); };
        const bd = document.createElement('button'); bd.className='btn btn-sm'; bd.style.marginLeft='8px'; bd.textContent='Delete';
        bd.onclick = (e)=>{ e.stopPropagation(); deleteFamily(item.id || item.pk); };
        container.appendChild(be); container.appendChild(bd);
      });
    }
  }

  // --- loader: try accessgrant endpoint first, fallback to list endpoint ---
  async function loadFamily(accessPk) {
    if (!accessPk) {
      renderFamilyHistory([]);
      return;
    }
    // 1) Try `/user/api/accessgrant/<pk>/` (preferred — if backend returns family_history inside)
    try {
      const resp = await fetch(`/user/api/accessgrant/${accessPk}/`, { method:'GET', credentials:'same-origin', headers:{ 'Accept':'application/json' }});
      if (resp.ok) {
        const j = await resp.json().catch(()=>({}));
        const list = j.family_history || j.family || j.family_history_items || j.familyHistory || [];
        if (Array.isArray(list)) { renderFamilyHistory(list); return; }
      }
    } catch (err) { /* fallback below */ }

    // 2) fallback to list endpoint
    try {
      const resp2 = await fetch(`/api/family-history/list/?access_pk=${encodeURIComponent(accessPk)}`, { method:'GET', credentials:'same-origin', headers:{ 'Accept':'application/json' }});
      if (resp2.ok) {
        const j2 = await resp2.json().catch(()=>({}));
        // many list endpoints return array or { results: [...] }
        const arr = Array.isArray(j2) ? j2 : (Array.isArray(j2.results) ? j2.results : []);
        renderFamilyHistory(arr);
        return;
      }
    } catch (err) { /* nothing */ }

    // nothing
    renderFamilyHistory([]);
  }

  // --- attach Add button into card header if not present ---

  // --- hook into viewPatientDetails ---
  if (typeof window.viewPatientDetails === 'function') {
    const orig = window.viewPatientDetails;
    window.viewPatientDetails = function (pk) {
      try { window.currentAccessPk = pk; } catch(e){ }
      const ret = orig(pk);
      // load family after main details
      setTimeout(()=> { loadFamily(pk); 
        // ensure attachers (if attachActionsToTable is present)
        try {
          attachActionsToTable("family-table-body","family");
        } catch(e) {}
      }, 250);
      return ret;
    };
  } else {
    // fallback: expose loader
    window.loadFamilyHistory = loadFamily;
  }

  // Also expose small API
  window.providerFamilyHistory = {
    load: loadFamily,
    openAdd: ()=>openFamilyModal('add', null),
    openEdit: (item)=>openFamilyModal('edit', item),
    delete: deleteFamily
  };

  // initialize add button / modal if elements exist
  // ensure modal exists (in case HTML not added)
  // if modal not present, script still works but prompts won't show
})();



function editProviderNotes() {
  document.getElementById('provider-notes-display').classList.add('hidden');
  document.getElementById('provider-notes-editor').classList.remove('hidden');
}

async function saveProviderNotes() {
  const textarea = document.getElementById("provider-note-text");
  const note = textarea.value.trim();
  if (!note) return alert("Note is empty");

  const patientId = window.currentPatientId; // already exists in your page
  const resp = await fetch(`/api/patient/${patientId}/notes/add/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
    },
    body: JSON.stringify({ note })
  });

  if (!resp.ok) {
    alert("Failed to save note");
    return;
  }

  textarea.value = "";
  cancelEditNotes();
  loadProviderNotes();
  showNotification("Provider note saved", "success");
}

function cancelEditNotes() {
  document.getElementById('provider-notes-display').classList.remove('hidden');
  document.getElementById('provider-notes-editor').classList.add('hidden');
}

async function loadProviderNotes() {
  const patientId = window.currentPatientId;
  const resp = await fetch(`/api/patient/${patientId}/notes/`);
  const data = await resp.json();

  const container = document.getElementById("provider-notes-display");
  container.innerHTML = "";

  if (!data.notes.length) {
    container.innerHTML = "<p class='text-sm text-muted-foreground'>No notes yet</p>";
    return;
  }

  data.notes.forEach(n => {
    const div = document.createElement("div");
    div.className = "p-4 rounded-lg bg-slate-100 mb-3";
    div.innerHTML = `
      <div class="flex justify-between mb-2">
        <h4 class="font-medium">Provider Note</h4>
        <span class="text-xs text-muted-foreground">${n.created_at}</span>
      </div>
      <p class="text-sm">${n.note}</p>
    `;
    container.appendChild(div);
  });
}

function exportHealthCSV() {
  if (!window.currentAccessPk) {
    alert("Please select a patient first");
    return;
  }

  window.location.href =
    `/export/health/csv/${window.currentAccessPk}/`;
}


async function apiPost(url, data) {
  const resp = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken()
    },
    body: JSON.stringify(data || {})
  });

  const text = await resp.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch(e) {}

  if (!resp.ok) {
    throw new Error((json && json.error) || text || resp.statusText);
  }
  return json;
}


async function deletePatientCurrent() {
  const accessPk = window.currentAccessPk;
  if (!accessPk) {
    showNotification("No active patient selected", "error");
    return;
  }

  if (!confirm("Are you sure you want to remove access to this patient?")) return;

  try {
    await apiPost("/provider/api/remove-patient/", {
      access_pk: accessPk
    });

    showNotification("Patient access removed", "success");
    location.reload();

    // go back to patient list
    if (typeof showSection === "function") {
      showSection("provider-patients");
    }

    // refresh list
    if (typeof loadPatients === "function") {
      loadPatients();
    }

  } catch (err) {
    showNotification(err.message || "Failed to remove patient access", "error");
  }
}

 

  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("patient-search");
    const clearBtn = document.getElementById("patient-search-clear");
    const filterBtns = document.querySelectorAll(".patient-filter");

    // track selected status filter (your buttons)
    let currentFilter = "active";

    function matchesStatus(card) {
      if (currentFilter === "all") return true;

      const isActive = card.dataset.active === "true";
      const isHidden = card.dataset.hidden === "true";

      if (currentFilter === "active") return isActive;
      if (currentFilter === "hidden") return isHidden;

      // "new" example: treat as recently granted (last 7 days)
      if (currentFilter === "new") {
        const granted = card.dataset.granted ? new Date(card.dataset.granted) : null;
        if (!granted || isNaN(granted)) return false;
        const days = (Date.now() - granted.getTime()) / (1000 * 60 * 60 * 24);
        return days <= 7;
      }

      return true;
    }

    function matchesSearch(card) {
      const q = (searchInput.value || "").trim().toLowerCase();
      if (!q) return true;

      // patient name text
      const nameEl = card.querySelector(".patient-fullname");
      const name = (nameEl?.textContent || "").trim().toLowerCase();

      return name.includes(q);
    }

    function applyFilters() {
      const cards = document.querySelectorAll(".patient-card");
      let shown = 0;

      cards.forEach(card => {
        const ok = matchesStatus(card) && matchesSearch(card);
        card.style.display = ok ? "" : "none";
        if (ok) shown++;
      });

      // optional: you can show "no results" message if shown === 0
    }

    // Search typing
    searchInput?.addEventListener("input", applyFilters);

    // Clear button
    clearBtn?.addEventListener("click", () => {
      searchInput.value = "";
      applyFilters();
      searchInput.focus();
    });

    // Status filter buttons
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter || "all";
        applyFilters();
      });
    });

    // run once on load
    applyFilters();
  });
