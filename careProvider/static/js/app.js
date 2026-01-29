
// Application state
        let currentSection = 'provider-dashboard';

        // Navigation functionality
        function showSection(sectionId) {
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('hidden');
            });

            // Remove active class from all nav buttons
            document.querySelectorAll('.btn-nav').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show target section
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                currentSection = sectionId;
            }

            // Add active class to current nav button
            const navButton = document.querySelector(`[data-section="${sectionId}"]`);
            if (navButton && navButton.classList.contains('btn-nav')) {
                navButton.classList.add('active');
            }

            console.log(`Navigated to: ${sectionId}`);
        }

        // Mock notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                padding: 1rem;
                border-radius: var(--radius);
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                z-index: 50;
                max-width: 20rem;
                ${type === 'success' ? 'background-color: #22c55e; color: white;' :
                  type === 'error' ? 'background-color: #ef4444; color: white;' :
                  'background-color: var(--primary); color: var(--primary-foreground);'}
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Mock functionality for various actions
        // function handleRequest(action) {
        //     switch(action) {
        //         case 'accept':
        //             showNotification('Request accepted! Patient will be notified.', 'success');
        //             break;
        //         case 'decline':
        //             showNotification('Request declined. Patient will be notified.', 'info');
        //             break;
        //         case 'ask-more':
        //             showNotification('Additional information requested from patient.', 'info');
        //             break;
        //     }
        // }

        function viewDocument(docId) {
            showNotification(`Document viewer would open for: ${docId}`, 'info');
        }

        function downloadDocument(docId) {
            showNotification(`Document download started: ${docId}`, 'success');
        }

        function generateReport() {
            showNotification('Report generation started...', 'info');
        }



        function editConsent() {
            showNotification('Consent editing functionality coming soon!', 'info');
        }

        // Event listeners
        document.addEventListener('DOMContentLoaded', function() {
            // Navigation buttons
            document.querySelectorAll('[data-section]').forEach(button => {
                button.addEventListener('click', function() {
                    const section = this.getAttribute('data-section');
                    showSection(section);
                });
            });

            // Initialize with provider dashboard
            showSection('provider-dashboard');

            // Click tracking for audit
            document.addEventListener('click', function(e) {
                if (e.target.matches('button') || e.target.closest('button')) {
                    const button = e.target.matches('button') ? e.target : e.target.closest('button');
                    console.log(`[AUDIT] Button clicked: ${button.textContent.trim()} in section: ${currentSection}`);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        showSection('provider-dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        showSection('provider-pending-requests');
                        break;
                    case '3':
                        e.preventDefault();
                        showSection('provider-patients');
                        break;
                    case '4':
                        e.preventDefault();
                        showSection('provider-patient-detail');
                        break;
                    case '5':
                        e.preventDefault();
                        showSection('provider-reports');
                        break;
                    case '6':
                        e.preventDefault();
                        showSection('consent');
                        break;
                }
            }
        });

        console.log('MediTrack Complete Care Provider Portal loaded successfully!');
        
/////////////serch
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("request-search");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const query = this.value.toLowerCase().trim();
            const cards = document.querySelectorAll("[id^='request-card-']");

            cards.forEach(card => {
                const name = card.querySelector("h3")?.textContent.toLowerCase() || "";
                const email = card.querySelector(".patient-email")?.textContent.toLowerCase() || "";
                const message = card.querySelector("p")?.textContent.toLowerCase() || "";

                // إذا كان النص المكتوب موجود في الاسم أو الإيميل أو الرسالة → يظهر
                if (
                    name.includes(query) ||
                    email.includes(query) ||
                    message.includes(query)
                ) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    }
});





