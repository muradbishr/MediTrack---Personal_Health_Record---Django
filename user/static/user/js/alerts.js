// // Alerts page functionality
// // Alerts page functionality (server-backed if window.ALERTS_URLS exists)
// window.AlertsManager = {
//   alerts: window.initialReminders && window.initialReminders.length ? window.initialReminders.slice() : [
//     // fallback demo alerts if no initialReminders provided
//     // ... (يمكنك حذف هذا الافتراضي أو إبقاؤه) ...
//   ],

//   currentDate: new Date(),
//   selectedDate: null,

//   // detect server mode (presence of window.ALERTS_URLS)
//   isServerMode() {
//     return typeof window.ALERTS_URLS === 'object' && !!window.ALERTS_URLS.create;
//   },

//   init() {
//     this.renderAlerts();
//     this.renderCalendar();
//     this.setupEventListeners();

//     // make edit modal fields show/hide date depending on frequency
//     const editFreq = document.getElementById('edit-frequency');
//     const editDateGroup = document.getElementById('edit-date-field-group');
//     if (editFreq && editDateGroup) {
//       editFreq.addEventListener('change', function () {
//         editDateGroup.style.display = this.value === 'daily' ? 'none' : 'block';
//       });
//     }
//   },

//   // ---------- rendering ----------
//   renderAlerts() {
//     const container = document.getElementById('alerts-list');
//     if (!container) return;

//     let alertsToShow = this.alerts;
//     if (this.selectedDate) {
//       const selectedDateStr = this.selectedDate.toISOString().split('T')[0];
//       alertsToShow = this.alerts.filter(alert => {
//         if ((alert.frequency === 'Daily' || alert.frequency === 'daily') && alert.enabled) return true;
//         // accept both nextDue and next_due naming
//         return (alert.nextDue === selectedDateStr || alert.next_due === selectedDateStr);
//       });
//     }

//     container.innerHTML = alertsToShow.map(alert => this.createAlertHTML(alert)).join('');

//     // Set up icons for each alert
//     alertsToShow.forEach(alert => {
//       const iconEl = document.getElementById(`alert-icon-${alert.id}`);
//       const clockEl = document.getElementById(`clock-icon-${alert.id}`);
//       const editEl = document.getElementById(`edit-icon-${alert.id}`);
//       const trashEl = document.getElementById(`trash-icon-${alert.id}`);

//       if (iconEl) setIcon(iconEl, alert.icon || 'pill');
//       if (clockEl) setIcon(clockEl, 'clock');
//       if (editEl) setIcon(editEl, 'edit');
//       if (trashEl) setIcon(trashEl, 'trash2');
//     });
//   },

//   createAlertHTML(alert) {
//     const colorClasses = {
//       green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'background-color: #dcfce7; color: #16a34a;' },
//       blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'background-color: #dbeafe; color: #2563eb;' },
//       purple: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'background-color: #f3e8ff; color: #7c3aed;' }
//     };

//     const colors = colorClasses[alert.color] || colorClasses.green;
//     const opacity = alert.enabled ? '' : 'opacity: 0.6;';

//     const timeDisplay = alert.time || (alert.time_display || 'No time set');
//     const freqDisplay = alert.frequency_display || alert.frequency;
//     const nextDue = alert.nextDue || alert.next_due || '';

//     return `
//       <div class="alert-item">
//         <div class="flex items-start sm:items-center justify-between p-4 rounded-xl border bg-white" style="${opacity}">
//           <div class="flex items-start sm:items-center gap-3 flex-1 min-w-0">
//             <div class="w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0">
//               <span id="alert-icon-${alert.id}" class="${colors.text}" style="margin-top: 8px;"></span>
//             </div>
//             <div class="flex-1 min-w-0">
//               <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
//                 <h4 class="font-medium text-slate-900 text-sm truncate">${this.escapeHtml(alert.title)}</h4>
//                 <span class="badge text-xs self-start" style="${colors.badge}">${this.escapeHtml(alert.type || '')}</span>
//               </div>
//               <div class="flex flex-row sm:flex-row spac_eve gap-2 text-xs text-slate-500">
//                 <div class="flex items-center gap-1" >
//                   <span id="clock-icon-${alert.id}" class="icon-sm flex-shrink-0"></span>
//                   <span style="margin-left: 10px; margin-top: 4px;">${this.escapeHtml(timeDisplay)}</span>
//                 </div>
//                 <span class="hidden sm:inline">•</span>
//                 <span>${this.escapeHtml(freqDisplay)}</span>
//                 <span class="hidden sm:inline">•</span>
//                 <span>Next: ${this.escapeHtml(nextDue)}</span>
//               </div>
//             </div>
//           </div>
//           <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 ml-3">
//             <label class="switch">
//               <input type="checkbox" ${alert.enabled ? 'checked' : ''} onchange="window.AlertsManager.toggleAlert(${alert.id})">
//               <span class="switch-slider"></span>
//             </label>
//             <div class="flex items-center gap-1">
//               <button class="btn btn-ghost btn-sm" style="width: 2rem; height: 2rem; padding: 0;" onclick="window.AlertsManager.openEditModal(${alert.id})">
//                 <span id="edit-icon-${alert.id}" class="icon-sm"></span>
//               </button>
//               <button class="btn btn-ghost btn-sm text-red-600" style="width: 2rem; height: 2rem; padding: 0;" onclick="window.AlertsManager.deleteAlert(${alert.id})">
//                 <span id="trash-icon-${alert.id}" class="icon-sm"></span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     `;
//   },

//   escapeHtml(str) {
//     if (!str && str !== 0) return '';
//     return String(str).replace(/[&<>"'`=\/]/g, function (s) {
//       return ({
//         '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
//         '`': '&#96;', '=': '&#61;', '/': '&#47;'
//       })[s];
//     });
//   },

//   // ---------- calendar (same as before) ----------
//   renderCalendar() {
//     // (reuse your existing calendar implementation; omitted here for brevity)
//     // to keep code short, call the original function body you had for calendar
//     if (typeof this._renderCalendarImpl === 'function') {
//       return this._renderCalendarImpl();
//     }
//     // fallback: call previous implementation (you pasted earlier). 
//     // if you want, copy your earlier renderCalendar body here.
//   },

//   // If you kept earlier renderCalendar body, assign it:
//   // AlertsManager._renderCalendarImpl = AlertsManager.renderCalendarBody; // optional

//   getAlertsForMonth(year, month) {
//     const monthAlerts = {};

//     this.alerts.forEach(alert => {
//       if (!alert.enabled) return;

//       const rawDate = alert.nextDue || alert.next_due;
//       if (!rawDate) return;
//       const alertDate = new Date(rawDate);

//       const freq = (alert.frequency || '').toString().toLowerCase();
//       if (freq === 'daily') {
//         const daysInMonth = new Date(year, month + 1, 0).getDate();
//         for (let day = 1; day <= daysInMonth; day++) {
//           const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//           if (!monthAlerts[dateStr]) monthAlerts[dateStr] = [];
//           monthAlerts[dateStr].push(alert);
//         }
//       } else if (freq === 'weekly') {
//         const alertDayOfWeek = alertDate.getDay();
//         const daysInMonth = new Date(year, month + 1, 0).getDate();
//         const firstDay = new Date(year, month, 1).getDay();
//         for (let day = 1; day <= daysInMonth; day++) {
//           const dayOfWeek = (firstDay + day - 1) % 7;
//           if (dayOfWeek === alertDayOfWeek) {
//             const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//             if (!monthAlerts[dateStr]) monthAlerts[dateStr] = [];
//             monthAlerts[dateStr].push(alert);
//           }
//         }
//       } else {
//         if (alertDate.getFullYear() === year && alertDate.getMonth() === month) {
//           const dateStr = rawDate.split('T')[0] || rawDate;
//           if (!monthAlerts[dateStr]) monthAlerts[dateStr] = [];
//           monthAlerts[dateStr].push(alert);
//         }
//       }
//     });

//     return monthAlerts;
//   },

//   previousMonth() {
//     this.currentDate.setMonth(this.currentDate.getMonth() - 1);
//     this.renderCalendar();
//   },

//   nextMonth() {
//     this.currentDate.setMonth(this.currentDate.getMonth() + 1);
//     this.renderCalendar();
//   },

//   selectDate(year, month, day) {
//     this.selectedDate = new Date(year, month, day);
//     this.renderCalendar();
//     this.renderAlerts();

//     // Show selected date info
//     const dateStr = this.selectedDate.toLocaleDateString('en-US', {
//       year: 'numeric', month: 'long', day: 'numeric'
//     });
//     this.showToast(`Showing reminders for ${dateStr}`, 'info');
//   },

//   clearDateFilter() {
//     this.selectedDate = null;
//     this.renderCalendar();
//     this.renderAlerts();
//   },

//   // ---------- events ----------
//   setupEventListeners() {
//     // New form
//     const form = document.getElementById('new-alert-form');
//     if (form) {
//       form.addEventListener('submit', (e) => {
//         e.preventDefault();
//         this.createNewAlert(new FormData(form));
//       });
//     }

//     // Edit form
//     const editForm = document.getElementById('edit-alert-form');
//     if (editForm) {
//       editForm.addEventListener('submit', (e) => {
//         e.preventDefault();
//         this.submitEditForm(new FormData(editForm));
//       });
//     }

//     // modal close buttons
//     const modalCloseButtons = document.querySelectorAll('[data-modal-close]');
//     modalCloseButtons.forEach(btn => {
//       btn.addEventListener('click', () => {
//         const modal = btn.closest('.modal-overlay');
//         if (modal) modal.classList.remove('active');
//       });
//     });
//   },

//   // ---------- helpers ----------
//   getCSRFToken() {
//     const el = document.querySelector('[name=csrfmiddlewaretoken]');
//     return el ? el.value : '';
//   },

//   fillTemplate(template, id) {
//     // replace '/0/' style placeholders
//     return template.replace('/0/', `/${id}/`).replace(/0(?=\/|$)/, id);
//   },

//   showToast(message, type = 'info') {
//     // same toast used previously
//     const toast = document.createElement('div');
//     toast.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; color: white; font-weight: 500; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: opacity 0.3s;`;
//     toast.textContent = message;
//     if (type === 'info') toast.style.backgroundColor = '#3b82f6';
//     else if (type === 'error') toast.style.backgroundColor = '#ef4444';
//     else if (type === 'success') toast.style.backgroundColor = '#10b981';
//     document.body.appendChild(toast);
//     setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
//   },

//   // ---------- CRUD (toggle/delete/create/edit) ----------
//   async toggleAlert(id) {
//     if (this.isServerMode()) {
//       // server-backed toggle
//       try {
//         const url = this.fillTemplate(window.ALERTS_URLS.toggle_template, id);
//         const res = await fetch(url, {
//           method: 'POST',
//           headers: { 'X-CSRFToken': this.getCSRFToken(), 'X-Requested-With': 'XMLHttpRequest' }
//         });
//         const text = await res.text();
//         let data;
//         try { data = JSON.parse(text); } catch (e) { console.error('Non-JSON response:', text); this.showToast('Server error', 'error'); return; }
//         if (res.ok && data.success) {
//           const idx = this.alerts.findIndex(a => a.id === id);
//           if (idx >= 0) this.alerts[idx] = this.mapServerReminder(data.reminder);
//           this.renderAlerts();
//           this.renderCalendar();
//           this.showToast(`Reminder ${data.enabled ? 'enabled' : 'disabled'}`, 'info');
//         } else {
//           this.showToast(data.error || 'Failed to toggle', 'error');
//         }
//       } catch (err) {
//         console.error(err);
//         this.showToast('Network error', 'error');
//       }
//     } else {
//       // client-only
//       const alert = this.alerts.find(a => a.id === id);
//       if (alert) {
//         alert.enabled = !alert.enabled;
//         this.renderAlerts();
//         this.renderCalendar();
//         this.showToast(`Alert ${alert.enabled ? 'enabled' : 'disabled'}`, 'info');
//       }
//     }
//   },

//   async deleteAlert(id) {
//     if (!confirm('Are you sure you want to delete this alert?')) return;
//     if (this.isServerMode()) {
//       try {
//         const url = this.fillTemplate(window.ALERTS_URLS.delete_template, id);
//         const res = await fetch(url, {
//           method: 'POST',
//           headers: { 'X-CSRFToken': this.getCSRFToken(), 'X-Requested-With': 'XMLHttpRequest' }
//         });
//         const text = await res.text();
//         let data;
//         try { data = JSON.parse(text); } catch (e) { console.error('Non-JSON response:', text); this.showToast('Server error', 'error'); return; }
//         if (res.ok && data.success) {
//           this.alerts = this.alerts.filter(a => a.id !== id);
//           this.renderAlerts();
//           this.renderCalendar();
//           this.showToast('Reminder deleted', 'info');
//         } else this.showToast(data.error || 'Failed to delete', 'error');
//       } catch (err) {
//         console.error(err);
//         this.showToast('Network error', 'error');
//       }
//     } else {
//       this.alerts = this.alerts.filter(a => a.id !== id);
//       this.renderAlerts();
//       this.renderCalendar();
//       this.showToast('Alert deleted', 'info');
//     }
//   },

//   async createNewAlert(formData) {
//     // client-side normalized fields
//     const typeValue = formData.get('type');
//     const frequencyValue = formData.get('frequency');
//     const timeValue = formData.get('time') || '';

//     if (this.isServerMode()) {
//       try {
//         const res = await fetch(window.ALERTS_URLS.create, {
//           method: 'POST',
//           headers: { 'X-CSRFToken': this.getCSRFToken(), 'X-Requested-With': 'XMLHttpRequest' },
//           body: formData
//         });
//         const text = await res.text();
//         let data;
//         try { data = JSON.parse(text); } catch (e) { console.error('Non-JSON response on create:', text); this.showToast('Server error', 'error'); return; }
//         if (res.ok && data.success) {
//           this.alerts.push(this.mapServerReminder(data.reminder));
//           this.renderAlerts();
//           this.renderCalendar();
//           document.getElementById('new-alert-form').reset();
//           const modal = document.getElementById('new-alert-modal'); if (modal) modal.classList.remove('active');
//           this.showToast('Reminder created', 'success');
//         } else this.showToast(data.error || 'Failed to create', 'error');
//       } catch (err) {
//         console.error(err); this.showToast('Network error', 'error');
//       }
//       return;
//     }

//     // client-only fallback (existing behavior with some fixes)
//     const id = this.alerts.length ? Math.max(...this.alerts.map(a => a.id)) + 1 : 1;
//     const formatTime = (time24) => {
//       if (!time24) return '';
//       const parts = time24.split(':');
//       let hours = parseInt(parts[0], 10);
//       const minutes = parts[1] || '00';
//       const ampm = hours >= 12 ? 'PM' : 'AM';
//       hours = hours % 12 || 12;
//       return `${hours}:${minutes} ${ampm}`;
//     };
//     const typeDisplayMap = { 'medication': 'Medication', 'monitoring': 'Health Monitoring', 'appointment': 'Appointment' };
//     const frequencyDisplayMap = { 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly', 'once': 'One-time' };
//     const newAlert = {
//       id,
//       title: formData.get('title'),
//       type: typeDisplayMap[typeValue] || typeValue,
//       time: formatTime(timeValue),
//       frequency: frequencyDisplayMap[frequencyValue] || frequencyValue,
//       enabled: true,
//       nextDue: new Date().toISOString().split('T')[0],
//       icon: typeValue === 'medication' ? 'pill' : (typeValue === 'monitoring' ? 'heart' : 'calendar'),
//       color: typeValue === 'medication' ? 'green' : (typeValue === 'monitoring' ? 'blue' : 'purple')
//     };
//     this.alerts.push(newAlert);
//     this.renderAlerts();
//     this.renderCalendar();
//     document.getElementById('new-alert-form').reset();
//     const modal = document.getElementById('new-alert-modal'); if (modal) modal.classList.remove('active');
//     this.showToast('Alert created successfully', 'info');
//   },

//   // ---------- edit flow ----------
//   openEditModal(id) {
//     const alert = this.alerts.find(a => a.id === id);
//     if (!alert) return;
//     // populate fields
//     document.getElementById('edit-alert-id').value = id;
//     document.getElementById('edit-title').value = alert.title || '';
//     // determine type value key (support server string or display)
//     const typeKey = (alert.type || '').toString().toLowerCase().includes('med') ? 'medication' :
//                     (alert.type || '').toString().toLowerCase().includes('monitor') ? 'monitoring' : 'appointment';
//     document.getElementById('edit-type').value = typeKey;
//     // set time in HH:MM for <input type="time"> if possible
//     const timeInput = document.getElementById('edit-time');
//     if (timeInput) {
//       // try parse "HH:MM" or "H:MM AM/PM"
//       let t = alert.time || alert.time_display || '';
//       if (t && t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) {
//         // convert to 24h "HH:MM"
//         const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
//         if (m) {
//           let hh = parseInt(m[1], 10);
//           const mm = m[2];
//           const ap = m[3].toLowerCase();
//           if (ap === 'pm' && hh !== 12) hh += 12;
//           if (ap === 'am' && hh === 12) hh = 0;
//           timeInput.value = `${String(hh).padStart(2,'0')}:${mm}`;
//         } else {
//           timeInput.value = '';
//         }
//       } else if (t && t.indexOf(':') >= 0) {
//         // assume HH:MM or HH:MM:SS
//         const parts = t.split(':');
//         timeInput.value = `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
//       } else {
//         timeInput.value = '';
//       }
//     }
//     const freqKey = (alert.frequency || '').toString().toLowerCase().startsWith('d') ? 'daily' :
//                     (alert.frequency || '').toString().toLowerCase().startsWith('w') ? 'weekly' :
//                     (alert.frequency || '').toString().toLowerCase().startsWith('m') ? 'monthly' : 'once';
//     document.getElementById('edit-frequency').value = freqKey;
//     const d = document.getElementById('edit-date');
//     if (d) d.value = alert.nextDue || alert.next_due || '';

//     // show modal
//     const modal = document.getElementById('edit-alert-modal');
//     if (modal) modal.classList.add('active');
//   },

//   async submitEditForm(formData) {
//     const id = parseInt(formData.get('id'), 10);
//     if (this.isServerMode()) {
//       try {
//         const url = this.fillTemplate(window.ALERTS_URLS.edit_template, id);
//         const res = await fetch(url, {
//           method: 'POST',
//           headers: { 'X-CSRFToken': this.getCSRFToken(), 'X-Requested-With': 'XMLHttpRequest' },
//           body: formData
//         });
//         const text = await res.text();
//         let data;
//         try { data = JSON.parse(text); } catch (e) { console.error('Non-JSON response on edit:', text); this.showToast('Server error', 'error'); return; }
//         if (res.ok && data.success) {
//           const idx = this.alerts.findIndex(a => a.id === id);
//           if (idx >= 0) this.alerts[idx] = this.mapServerReminder(data.reminder);
//           this.renderAlerts();
//           this.renderCalendar();
//           document.getElementById('edit-alert-form').reset();
//           const modal = document.getElementById('edit-alert-modal'); if (modal) modal.classList.remove('active');
//           this.showToast('Reminder updated', 'success');
//         } else this.showToast(data.error || 'Failed to update', 'error');
//       } catch (err) { console.error(err); this.showToast('Network error', 'error'); }
//     } else {
//       // client-only update
//       const idx = this.alerts.findIndex(a => a.id === id);
//       if (idx < 0) return;
//       const typeValue = formData.get('type');
//       const frequencyValue = formData.get('frequency');
//       const timeValue = formData.get('time') || '';
//       const formatTime = (time24) => {
//         if (!time24) return '';
//         const parts = time24.split(':');
//         let hours = parseInt(parts[0], 10);
//         const minutes = parts[1] || '00';
//         const ampm = hours >= 12 ? 'PM' : 'AM';
//         hours = hours % 12 || 12;
//         return `${hours}:${minutes} ${ampm}`;
//       };
//       this.alerts[idx].title = formData.get('title');
//       this.alerts[idx].type = typeValue === 'medication' ? 'Medication' : (typeValue === 'monitoring' ? 'Health Monitoring' : 'Appointment');
//       this.alerts[idx].time = formatTime(timeValue);
//       this.alerts[idx].frequency = frequencyValue === 'once' ? 'One-time' : frequencyValue.charAt(0).toUpperCase() + frequencyValue.slice(1);
//       this.alerts[idx].nextDue = formData.get('date') || this.alerts[idx].nextDue;
//       this.renderAlerts();
//       this.renderCalendar();
//       document.getElementById('edit-alert-form').reset();
//       const modal = document.getElementById('edit-alert-modal'); if (modal) modal.classList.remove('active');
//       this.showToast('Reminder updated', 'info');
//     }
//   },

//   // map server reminder object to client shape
//   mapServerReminder(rem) {
//     // server returns fields like id, title, type, time (HH:MM), frequency, enabled, next_due
//     const typeDisplay = rem.type_display || rem.type || '';
//     const freqDisplay = rem.frequency_display || (rem.frequency ? (rem.frequency === 'once' ? 'One-time' : rem.frequency.charAt(0).toUpperCase() + rem.frequency.slice(1)) : '');
//     return {
//       id: rem.id,
//       title: rem.title,
//       type: typeDisplay,
//       time: rem.time || (rem.time_str || ''),
//       frequency: freqDisplay,
//       frequency_display: freqDisplay,
//       enabled: !!rem.enabled,
//       nextDue: rem.next_due || rem.nextDue || '',
//       next_due: rem.next_due || rem.nextDue || '',
//       icon: rem.icon || (rem.type === 'medication' ? 'pill' : rem.type === 'monitoring' ? 'heart' : 'calendar'),
//       color: rem.color || (rem.type === 'medication' ? 'green' : rem.type === 'monitoring' ? 'blue' : 'purple')
//     };
//   }
// };
