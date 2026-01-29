// Put inside DOMContentLoaded or at end of body
(function() {
  // helper to read CSRF cookie (Django default name: csrftoken)
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

  // Generic function to remove UI elements (table row or mobile card)
  function removeItemFromDOM(button) {
    // prefer removing enclosing <tr>
    const tr = button.closest('tr');
    if (tr) { tr.remove(); return; }
    // otherwise remove mobile-card
    const card = button.closest('.mobile-card');
    if (card) { card.remove(); return; }
    // fallback: remove parent node
    if (button.parentNode) button.parentNode.remove();
  }

  // Extract an allergy id using either:
  // - data-delete-allergy attribute on the button, OR
  // - span id like trash-allergy-<id> or trash-allergy-table-<id>
  function extractAllergyIdFromElement(el) {
    // If button has data attribute
    const btn = el.closest('button');
    if (btn && btn.dataset && btn.dataset.deleteAllergy) {
      return btn.dataset.deleteAllergy;
    }

    // If the clicked element is a span with id like trash-allergy-1
    const span = el.closest('span[id^="trash-allergy"], span[id^="trash-allergy-table-"]');
    if (span && span.id) {
      const m = span.id.match(/trash-allergy(?:-table)?-(\d+)/);
      if (m) return m[1];
    }

    // Or the button itself might have id (rare)
    if (btn && btn.id) {
      const m2 = btn.id.match(/trash-allergy(?:-table)?-(\d+)/);
      if (m2) return m2[1];
    }

    return null;
  }

  // Event delegation: handle all delete clicks for allergies
  document.addEventListener('click', async function(e) {
    // Find closest element that *might* be a delete icon/button
    const maybeBtn = e.target.closest('button, span');
    if (!maybeBtn) return;

    // quick check: does it look like a delete for an allergy?
    const isDeleteAllergy = (
      maybeBtn.matches('button[data-delete-allergy]') ||
      (maybeBtn.querySelector && maybeBtn.querySelector('span[id^="trash-allergy"]')) ||
      (maybeBtn.matches('span[id^="trash-allergy"]')) ||
      (maybeBtn.matches('button') && maybeBtn.querySelector('span[id^="trash-allergy-table-"]')) ||
      (maybeBtn.matches('span[id^="trash-allergy-table-"]'))
    );
    if (!isDeleteAllergy) return;

    // get id
    const allergyId = extractAllergyIdFromElement(e.target);
    if (!allergyId) {
      console.warn('Delete allergy clicked but no id found.');
      return;
    }

    // confirm
    if (!confirm('Delete this allergy? This action cannot be undone.')) return;

    // optimistic UI removal option:
    // removeItemFromDOM(maybeBtn); // uncomment this line to remove immediately (optimistic)

    // send request to backend
    try {
      const resp = await fetch(`/api/allergies/${allergyId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Accept': 'application/json'
        },
        credentials: 'same-origin'
      });

      if (resp.ok) {
        // remove from UI
        removeItemFromDOM(maybeBtn);
        if (window.MedRecordApp && window.MedRecordApp.showToast) {
          window.MedRecordApp.showToast('Allergy deleted', 'success');
        } else {
          console.log('Allergy deleted:', allergyId);
        }
      } else {
        // Try to parse json error
        let errText = `Failed to delete (status ${resp.status})`;
        try {
          const j = await resp.json();
          if (j.detail) errText = j.detail;
          else if (j.error) errText = j.error;
        } catch (err) { /* ignore */ }
        alert(errText);
      }
    } catch (err) {
      console.error('Network or server error when deleting allergy:', err);
      alert('Network error — could not delete allergy. Try again.');
    }
  });

})();
