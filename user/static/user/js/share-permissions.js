// Share & Permissions – FULL BACKEND VERSION
window.SharePermissionsManager = (function () {

  let providers = [];
  let emergencyContacts = []; // renamed from contacts

  // ======================
  // Helpers
  // ======================

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
      document.cookie.split(";").forEach(cookie => {
        cookie = cookie.trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.split("=")[1]);
        }
      });
    }
    return cookieValue;
  }

  async function apiGet(url) {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });
    return res.json();
  }

  async function apiPost(url, data) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json"
      },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  function toast(msg) {
    if (window.MedRecordApp && MedRecordApp.showToast) {
      MedRecordApp.showToast(msg, "info");
    } else {
      try { alert(msg); } catch (e) { console.log(msg); }
    }
  }

  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ======================
  // Providers
  // ======================

  async function loadProviders() {
    try {
      const data = await apiGet("/api/my-sharing-requests/");
      providers = (data.requests || []).map(r => ({
        id: r.id,
        email: r.to_provider_email,
        status: r.status,
        data_scope: r.data_scope
      }));
      renderProviders();
    } catch (err) {
      console.error("Error loading providers", err);
      renderProviders();
    }
  }

  function renderProviders() {
    const container = document.getElementById("providers-list");
    if (!container) return;

    container.innerHTML = providers.map(p => `
      <div class="flex items-center justify-between p-4 bg-white border rounded-xl" data-id="${p.id || ''}">
        <div>
          <h4 class="font-medium text-slate-900 text-sm">${escapeHtml(p.email)}</h4>
          <span class="badge text-xs" style="background:#e0e7ff;color:#3730a3;">
            ${p.status ? p.status.toUpperCase() : 'PENDING'}
          </span>
        </div>
        <button class="btn btn-ghost text-red-600" onclick="SharePermissionsManager.removeProvider('${p.id || ''}', '${p.email}')">
          Remove
        </button>
      </div>
    `).join("");
  }

  function providerAlreadyExists(email) {
  return providers.some(
    p => p.email.toLowerCase() === email.toLowerCase()
  );
}


  async function addProvider(form) {
  const emailInput = form.querySelector("input[name='provider_email']");
  if (!emailInput) return toast("Provider email input not found");

  const email = emailInput.value.trim().toLowerCase();
  if (!email) return toast("Email is required");

  // ✅ BLOCK duplicates
  if (providerAlreadyExists(email)) {
    toast("This provider has already been added.");
    return; // ❌ stop here
  }

  const messageInput = form.querySelector("input[name='message_to_provider']");
  if (!messageInput) return toast("Provider message input not found");

  const message = messageInput.value.trim();
  if (!message) return toast("Message is required");

  const permNodes = Array.from(
    form.querySelectorAll("input[name='permissions']:checked")
  );
  const permissions = permNodes.map(n => n.value);


    // TEMP add to UI with temporary id
    const tmpId = 'tmp-' + Date.now();
    providers.unshift({ id: tmpId, email, status: "pending", data_scope: "full",permissions });
    renderProviders();

    try {
      const res = await apiPost("/api/share/request/", { provider_email: email, data_scope: "full", message:message,permissions: permissions });
      toast("Share request sent");
      await loadProviders(); // refresh with backend data
    } catch (err) {
      toast("Error sending request");
      providers = providers.filter(p => p.id !== tmpId); // rollback
      renderProviders();
    }

    const modal = document.getElementById("add-provider-modal");
    if (modal) modal.classList.remove("active");
    form.reset();
  }

  async function removeProvider(id, email) {
    if (!id || String(id).startsWith('tmp-')) {
      if (!confirm(`Remove local request for ${email}?`)) return;
      providers = providers.filter(p => p.email !== email);
      renderProviders();
      toast("Local share request removed");
      return;
    }
    if (!confirm("Remove access for this provider?")) return;
    try {
      const res = await fetch(`/sharing-requests/${id}/delete/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCookie("csrftoken"), "Accept": "application/json" },
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.status === "deleted") {
        providers = providers.filter(p => String(p.id) !== String(id));
        renderProviders();
        toast("Provider removed and access revoked");
      } else {
        console.error("Delete failed", result);
        toast(result.error || "Failed to delete from backend");
      }
    } catch (error) {
      console.error("Error deleting provider", error);
      toast("Error deleting provider");
    }
  }

  // ======================
  // Emergency Contacts
  // ======================

  async function loadContacts() {
    try {
      const data = await apiGet("/api/emergency-contacts/");
      emergencyContacts = data.contacts || [];
      renderContacts();
    } catch (e) {
      console.error("Error loading contacts", e);
    }
  }

  function renderContacts() {
    const container = document.getElementById("contacts-list");
    if (!container) return;
    if (!emergencyContacts.length) {
      container.innerHTML = `<div class="p-4 text-sm text-gray-600">No emergency contacts yet.</div>`;
      return;
    }

    container.innerHTML = emergencyContacts.map(c => `
      <div class="p-4 bg-white border rounded-xl flex justify-between items-start" data-id="${c.id}">
        <div>
          <h4 class="font-semibold">${escapeHtml(c.name)}</h4>
          <p class="text-sm">Phone: ${escapeHtml(c.phone_number)}</p>
          ${c.email ? `<p class="text-sm">Email: ${escapeHtml(c.email)}</p>` : ""}
          <p class="text-sm text-gray-600">Relation: ${escapeHtml(c.relationship)}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button class="btn btn-ghost text-blue-600" onclick="SharePermissionsManager.editContact(${c.id})">Edit</button>
          <button class="btn btn-ghost text-red-600" onclick="SharePermissionsManager.deleteContact(${c.id})">Delete</button>
        </div>
      </div>
    `).join("");
  }

  async function addContact(form) {
    if (!form) return toast("Form not found");
    const name = form.querySelector("[name='name']");
    const phone = form.querySelector("[name='phone_number']");
    const email = form.querySelector("[name='email']");
    const rel = form.querySelector("[name='relationship']");

    if (!name || !phone || !rel) return toast("Form fields missing");

    const data = {
      name: name.value.trim(),
      phone_number: phone.value.trim(),
      email: email ? email.value.trim() : "",
      relationship: rel.value.trim()
    };

    if (!data.name || !data.phone_number) return toast("Name and phone number are required");

    try {
      await apiPost("/api/emergency-contacts/add/", data);
      toast("Contact added");
      await loadContacts();
    } catch (e) {
      console.error("Error adding contact", e);
      toast("Error adding contact");
    }

    const modal = document.getElementById("add-contact-modal");
    if (modal) modal.classList.remove("active");
    form.reset();
  }

  async function deleteContact(id) {
    if (!confirm("Delete this contact?")) return;
    try {
      const res = await fetch(`/api/emergency-contacts/${id}/delete/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCookie("csrftoken"), "Accept": "application/json" },
        credentials: "include"
      });
      const result = await res.json();
      if (res.ok && result.status === "deleted") {
        emergencyContacts = emergencyContacts.filter(c => c.id !== id);
        renderContacts();
        toast("Contact deleted");
      } else {
        console.error("Delete contact failed", result);
        toast(result.error || "Failed to delete contact");
      }
    } catch (e) {
      console.error("Error deleting contact", e);
      toast("Error deleting contact");
    }
  }

  function editContact(id) {
    const c = emergencyContacts.find(x => x.id === id);
    if (!c) return toast("Contact not found");

    const modal = document.getElementById("edit-contact-modal");
    if (!modal) return toast("Edit modal not found");

    modal.querySelector("[name='name']").value = c.name || "";
    modal.querySelector("[name='phone_number']").value = c.phone_number || "";
    modal.querySelector("[name='email']").value = c.email || "";
    modal.querySelector("[name='relationship']").value = c.relationship || "";
    modal.querySelector("form").dataset.id = id;

    modal.classList.add("active");
  }

  async function saveEditedContact(form) {
    const id = form.dataset.id;
    if (!id) return toast("No contact id");

    const name = form.querySelector("[name='name']");
    const phone = form.querySelector("[name='phone_number']");
    const email = form.querySelector("[name='email']");
    const rel = form.querySelector("[name='relationship']");

    const data = {
      name: name.value.trim(),
      phone_number: phone.value.trim(),
      email: email ? email.value.trim() : "",
      relationship: rel.value.trim()
    };

    try {
      await apiPost(`/api/emergency-contacts/${id}/update/`, data);
      toast("Contact updated");
      await loadContacts();
    } catch (e) {
      console.error("Error updating contact", e);
      toast("Error updating contact");
    }

    const modal = document.getElementById("edit-contact-modal");
    if (modal) modal.classList.remove("active");
  }

  // ======================
  // Init + Listeners
  // ======================

  function setupListeners() {
    const providerForm = document.getElementById("add-provider-form");
 if (providerForm) {
    providerForm.addEventListener("submit", e => {
      e.preventDefault();

      const checked = providerForm.querySelectorAll(
        'input[name="permissions"]:checked'
      );

      if (checked.length === 0) {
        alert("Please select at least one permission.");
        return; // ❌ stop submit
      }

      addProvider(providerForm); // ✅ continue
    });
  }
    const addContactForm = document.getElementById("add-contact-form");
    if (addContactForm) addContactForm.addEventListener("submit", e => { e.preventDefault(); addContact(addContactForm); });

    const editContactForm = document.getElementById("edit-contact-form");
    if (editContactForm) editContactForm.addEventListener("submit", e => { e.preventDefault(); saveEditedContact(editContactForm); });

    document.querySelectorAll("[data-modal-close]").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal");
        if (modal) modal.classList.remove("active");
      });
    });
  }

  


  async function init() {
    renderProviders();
    renderContacts();
    setupListeners();
    await loadProviders();
    await loadContacts();
  }

  return {
    init,
    removeProvider,
    addProvider,
    editContact,
    deleteContact,
    addContact,
    saveEditedContact
  };

})();
