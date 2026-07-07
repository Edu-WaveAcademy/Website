document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwmqgtWR4VwFdgz9IWUmk21zFK3oBcSYPbGtdXKgcmmcTKwXZH9HVUheScyQJylU0z_/exec';
    const DEMO_MODE = API_BASE_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL';
    const SESSION_STORAGE_KEY = 'eduwavePortalSession';

    const body = document.body;
    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = mobileMenu ? mobileMenu.querySelectorAll('a, button') : [];
    const revealElements = document.querySelectorAll('.reveal');
    const modalOpeners = document.querySelectorAll('[data-open-modal]');
    const modals = document.querySelectorAll('.modal-overlay');
    const portalLoginView = document.getElementById('portal-login-view');
    const portalDashboardView = document.getElementById('portal-dashboard-view');
    const portalLoginForm = document.getElementById('portal-login-form');
    const portalLoginStatus = document.getElementById('portal-login-status');
    const portalLoginSubmit = document.getElementById('portal-login-submit');
    const trialForm = document.getElementById('trial-form');
    const trialFormStatus = document.getElementById('trial-form-status');
    const dashboardStudentName = document.getElementById('dashboard-student-name');
    const dashboardSummary = document.getElementById('dashboard-summary');
    const dashboardResourceList = document.getElementById('dashboard-resource-list');
    const dashboardFeeCard = document.getElementById('dashboard-fee-card');
    const paymentNoteForm = document.getElementById('payment-note-form');
    const paymentNoteStatus = document.getElementById('payment-note-status');
    const portalLogoutBtn = document.getElementById('portal-logout-btn');
    const heroVideoOne = document.getElementById('hero-video-1');
    const heroVideoTwo = document.getElementById('hero-video-2');
    const heroMuteButton = document.getElementById('hero-video-mute-btn');
    const programsSlider = document.getElementById('programs-slider');
    const programsPrev = document.getElementById('prog-prev');
    const programsNext = document.getElementById('prog-next');

    const demoStudentSession = {
        token: 'demo-session-token',
        studentId: 'STU-101',
        name: 'Rudra Bhardwaj',
        classLevel: 'Class 6',
        summary: '2 assigned resources, fee due on 12 July 2026, last login protected by single-session policy.',
        fee: {
            month: 'July 2026',
            amount: 'Rs. 3,500',
            dueDate: '12 July 2026',
            status: 'Pending verification',
            note: 'Pay via UPI and submit reference here. Admin marks payment received after review.'
        },
        resources: [
            {
                title: 'Mathematics practice sheet',
                type: 'Google Sheet preview',
                subject: 'Mathematics',
                description: 'Read-only worksheet rendered through the portal instead of direct file sharing.'
            },
            {
                title: 'Science revision PDF',
                type: 'PDF preview',
                subject: 'Science',
                description: 'Assigned revision material from the legacy Drive library.'
            }
        ]
    };

    let activeModal = null;
    let lastFocusedElement = null;
    let currentSession = loadStoredSession();

    setupMobileMenu();
    setupScrollState();
    setupRevealObserver();
    setupHeroVideoRotation();
    setupProgramsSlider();
    setupModals();
    setupTrialForm();
    setupPortalLogin();
    setupPaymentNote();
    setupAdminPortal();
    restoreSession();

    function setupMobileMenu() {
        if (!mobileMenuBtn || !mobileMenu) return;
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
            mobileMenu.setAttribute('aria-hidden', String(!isOpen));
            body.classList.toggle('modal-open', isOpen || Boolean(activeModal));
        });
        mobileMenuLinks.forEach((link) => link.addEventListener('click', closeMobileMenu));
    }

    function closeMobileMenu() {
        if (!mobileMenu || !mobileMenuBtn) return;
        mobileMenu.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        body.classList.toggle('modal-open', Boolean(activeModal));
    }

    function setupScrollState() {
        updateNavbarState();
        window.addEventListener('scroll', updateNavbarState);
    }

    function updateNavbarState() {
        if (!navbar) return;
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }

    function setupRevealObserver() {
        if (!('IntersectionObserver' in window)) {
            revealElements.forEach((el) => el.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
        revealElements.forEach((el) => observer.observe(el));
    }

    function setupHeroVideoRotation() {
        if (!heroVideoOne || !heroVideoTwo || !heroMuteButton) return;
        const videoSources = [
            'Eduwave_Academy_Dream_Video_Generated.mp4',
            'EduWave_Academy_Brand_Film_Generated.mp4',
            'Smooth_Video_Editing_Request.mp4'
        ];
        let activeVideo = heroVideoOne;
        let nextVideo = heroVideoTwo;
        let currentVideoIndex = 0;
        let isMuted = true;
        const mutedLabel = heroMuteButton.querySelector('.icon-muted');
        const unmutedLabel = heroMuteButton.querySelector('.icon-unmuted');
        const setupNextVideo = () => {
            const nextIndex = (currentVideoIndex + 1) % videoSources.length;
            nextVideo.src = videoSources[nextIndex];
            nextVideo.load();
        };
        const onEnded = () => {
            nextVideo.muted = isMuted;
            nextVideo.play().catch(() => {});
            nextVideo.classList.add('active');
            activeVideo.classList.remove('active');
            currentVideoIndex = (currentVideoIndex + 1) % videoSources.length;
            const temp = activeVideo;
            activeVideo = nextVideo;
            nextVideo = temp;
            window.setTimeout(setupNextVideo, 1400);
        };
        heroVideoOne.addEventListener('ended', onEnded);
        heroVideoTwo.addEventListener('ended', onEnded);
        setupNextVideo();
        heroVideoOne.play().catch(() => {});
        heroMuteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            heroVideoOne.muted = isMuted;
            heroVideoTwo.muted = isMuted;
            mutedLabel.classList.toggle('hidden', !isMuted);
            unmutedLabel.classList.toggle('hidden', isMuted);
        });
    }

    function setupProgramsSlider() {
        if (!programsSlider || !programsPrev || !programsNext) return;
        const getCardWidth = () => {
            const card = programsSlider.querySelector('.program-card');
            const gap = parseFloat(getComputedStyle(programsSlider).gap) || 24;
            return card ? card.offsetWidth + gap : 0;
        };
        programsPrev.addEventListener('click', () => {
            const width = getCardWidth();
            if (!width) return;
            if (programsSlider.scrollLeft <= 5) {
                const lastCard = programsSlider.lastElementChild;
                programsSlider.style.scrollBehavior = 'auto';
                programsSlider.style.scrollSnapType = 'none';
                programsSlider.prepend(lastCard);
                programsSlider.scrollLeft += width;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        programsSlider.style.scrollBehavior = '';
                        programsSlider.style.scrollSnapType = '';
                        programsSlider.scrollBy({ left: -width, behavior: 'smooth' });
                    });
                });
                return;
            }
            programsSlider.scrollBy({ left: -width, behavior: 'smooth' });
        });
        programsNext.addEventListener('click', () => {
            const width = getCardWidth();
            if (!width) return;
            const maxScroll = programsSlider.scrollWidth - programsSlider.clientWidth;
            if (Math.ceil(programsSlider.scrollLeft) >= maxScroll - 5) {
                const firstCard = programsSlider.firstElementChild;
                programsSlider.style.scrollBehavior = 'auto';
                programsSlider.style.scrollSnapType = 'none';
                programsSlider.appendChild(firstCard);
                programsSlider.scrollLeft -= width;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        programsSlider.style.scrollBehavior = '';
                        programsSlider.style.scrollSnapType = '';
                        programsSlider.scrollBy({ left: width, behavior: 'smooth' });
                    });
                });
                return;
            }
            programsSlider.scrollBy({ left: width, behavior: 'smooth' });
        });
    }
    function setupModals() {
        modalOpeners.forEach((button) => button.addEventListener('click', () => {
            closeMobileMenu();
            openModal(button.getAttribute('data-open-modal'));
        }));
        modals.forEach((modal) => {
            modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); });
            const closeButton = modal.querySelector('.close-modal-btn');
            if (closeButton) closeButton.addEventListener('click', () => closeModal(modal));
        });
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && activeModal) closeModal(activeModal); });
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        lastFocusedElement = document.activeElement;
        activeModal = modal;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        body.classList.add('modal-open');
        const focusTarget = modal.querySelector('input, button, textarea, [href]');
        if (focusTarget) focusTarget.focus();
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (activeModal === modal) activeModal = null;
        body.classList.toggle('modal-open', mobileMenu && mobileMenu.classList.contains('active'));
        if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    }

    function setupTrialForm() {
        if (!trialForm || !trialFormStatus) return;
        trialForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(trialForm);
            const payload = {
                action: 'submitTrial',
                childName: String(formData.get('childName') || '').trim(),
                studentClass: String(formData.get('studentClass') || '').trim(),
                parentName: String(formData.get('parentName') || '').trim(),
                phone: String(formData.get('phone') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                subjectNeed: String(formData.get('subjectNeed') || '').trim(),
                preferredSlot: String(formData.get('preferredSlot') || '').trim(),
                notes: String(formData.get('notes') || '').trim()
            };
            if (!payload.childName || !payload.studentClass || !payload.parentName || !payload.phone || !payload.email || !payload.subjectNeed || !payload.preferredSlot) {
                showFormStatus(trialFormStatus, 'Please fill in all required trial request fields.', 'error');
                return;
            }
            try {
                if (DEMO_MODE) {
                    await fakeDelay();
                    showFormStatus(trialFormStatus, 'Trial request captured in demo mode. Once Apps Script is connected, this will be added to the Trials sheet for admin approval.', 'success');
                    trialForm.reset();
                    return;
                }
                await postToBackend(payload);
                showFormStatus(trialFormStatus, 'Trial request sent successfully. The academy can review and confirm the slot from the admin sheet.', 'success');
                trialForm.reset();
            } catch (error) {
                showFormStatus(trialFormStatus, error.message || 'Trial request failed. Please check the Apps Script setup.', 'error');
            }
        });
    }

    function setupPortalLogin() {
        if (!portalLoginForm || !portalLoginStatus || !portalLoginSubmit) return;
        portalLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = String(document.getElementById('portal-username').value || '').trim();
            const password = String(document.getElementById('portal-password').value || '').trim();
            if (!username || !password) {
                showFormStatus(portalLoginStatus, 'Enter both username and password.', 'error');
                return;
            }
            setButtonLoading(portalLoginSubmit, true);
            showFormStatus(portalLoginStatus, '', '');
            try {
                let session;
                if (DEMO_MODE) {
                    await fakeDelay();
                    session = { ...demoStudentSession };
                } else {
                    session = await postToBackend({ action: 'login', username, password, deviceId: getDeviceFingerprint() });
                }
                currentSession = session;
                persistSession(currentSession);
                renderDashboard(session);
                portalLoginForm.reset();
            } catch (error) {
                showFormStatus(portalLoginStatus, error.message || 'Login failed. Please verify the portal setup.', 'error');
            } finally {
                setButtonLoading(portalLoginSubmit, false);
            }
        });
        if (portalLogoutBtn) {
            portalLogoutBtn.addEventListener('click', async () => {
                if (!currentSession) return;
                try { if (!DEMO_MODE) await postToBackend({ action: 'logout', token: currentSession.token }); } catch (error) { console.warn('Logout call failed', error); }
                clearSession();
            });
        }
    }

    function setupPaymentNote() {
        if (!paymentNoteForm || !paymentNoteStatus) return;
        paymentNoteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentSession) {
                showFormStatus(paymentNoteStatus, 'Please log in again before submitting a payment note.', 'error');
                return;
            }
            const formData = new FormData(paymentNoteForm);
            const reference = String(formData.get('reference') || '').trim();
            const note = String(formData.get('note') || '').trim();
            if (!reference) {
                showFormStatus(paymentNoteStatus, 'Enter the payment reference or a short payment note.', 'error');
                return;
            }
            try {
                if (DEMO_MODE) {
                    await fakeDelay();
                    showFormStatus(paymentNoteStatus, 'Payment note captured in demo mode. In production it will be logged to the Fees and Reminders sheets for admin verification.', 'success');
                    paymentNoteForm.reset();
                    return;
                }
                await postToBackend({ action: 'submitPaymentNote', token: currentSession.token, studentId: currentSession.studentId, reference, note });
                showFormStatus(paymentNoteStatus, 'Payment note submitted. The academy can verify it and update your fee status.', 'success');
                paymentNoteForm.reset();
            } catch (error) {
                showFormStatus(paymentNoteStatus, error.message || 'Could not submit the payment note.', 'error');
            }
        });
    }

    async function restoreSession() {
        if (!currentSession) {
            clearDashboard();
            return;
        }
        // First render from cache to avoid layout shift
        renderDashboard(currentSession);
        
        if (DEMO_MODE) return;
        
        try {
            const freshSession = await postToBackend({
                action: 'getDashboard',
                token: currentSession.token,
                studentId: currentSession.studentId
            });
            currentSession = freshSession;
            persistSession(currentSession);
            renderDashboard(currentSession);
        } catch (error) {
            console.error('Session auto-refresh failed:', error);
            // If session is expired, clean up
            if (error.message && error.message.includes('expired')) {
                clearSession();
            }
        }
    }

    function renderDashboard(session) {
        portalLoginView.classList.add('hidden');
        portalDashboardView.classList.remove('hidden');
        dashboardStudentName.textContent = session.name || 'Student';
        dashboardSummary.textContent = session.summary || 'Portal access active.';
        dashboardResourceList.innerHTML = '';
        (session.resources || []).forEach((resource) => {
            const item = document.createElement('article');
            item.className = 'resource-item clickable-resource';
            item.setAttribute('data-resource-id', resource.resourceId || '');
            item.innerHTML = `<strong>${escapeHtml(resource.title || 'Resource')}</strong><div class="resource-meta">${escapeHtml(resource.subject || '')}${resource.subject ? '   ' : ''}${escapeHtml(resource.type || 'Resource preview')}</div><p class="resource-meta">${escapeHtml(resource.description || 'Assigned from the academy library.')}</p>`;
            
            // Wire up click handler to load preview securely
            item.addEventListener('click', () => loadResourcePreview(resource.resourceId));
            
            dashboardResourceList.appendChild(item);
        });
        if (!dashboardResourceList.children.length) dashboardResourceList.innerHTML = '<div class="resource-item"><strong>No resources assigned yet</strong><div class="resource-meta">Admin can assign materials from the Resources and Assignments sheets.</div></div>';
        const fee = session.fee || {};
        dashboardFeeCard.innerHTML = `<strong>${escapeHtml(fee.month || 'Current month')}</strong><div class="resource-meta">${escapeHtml(fee.amount || 'Amount pending')}   Due ${escapeHtml(fee.dueDate || 'TBD')}</div><p class="status-note">Status: ${escapeHtml(fee.status || 'Pending')}</p><p class="status-note">${escapeHtml(fee.note || '')}</p>`;
    }

    async function loadResourcePreview(resourceId) {
        const previewPanel = document.getElementById('dashboard-preview-panel');
        const iframeWrapper = document.getElementById('preview-iframe-wrapper');
        if (!previewPanel || !iframeWrapper) return;

        previewPanel.classList.remove('hidden');
        iframeWrapper.innerHTML = '<div class="preview-placeholder"><span class="loading-spinner"></span><br><br>Requesting secure access...</div>';

        // Scroll to preview panel on mobile
        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        try {
            let previewData;
            if (DEMO_MODE) {
                await fakeDelay();
                // Demo dummy preview link
                previewData = {
                    previewUrl: 'https://docs.google.com/viewer?embedded=true&url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    title: 'Demo Preview'
                };
            } else {
                previewData = await postToBackend({
                    action: 'getResourcePreview',
                    token: currentSession.token,
                    studentId: currentSession.studentId,
                    resourceId: resourceId
                });
            }

            iframeWrapper.innerHTML = `<iframe src="${previewData.previewUrl}" allow="autoplay" referrerpolicy="no-referrer"></iframe>`;
        } catch (error) {
            iframeWrapper.innerHTML = `<div class="preview-placeholder" style="color: var(--accent); font-weight: 500;">Failed to load resource: ${escapeHtml(error.message || 'Service unavailable')}</div>`;
        }
    }

    function setupAdminPortal() {
        const adminModal = document.getElementById('admin-modal');
        if (!adminModal) return;

        // Tab Switching Logic
        const tabButtons = adminModal.querySelectorAll('.admin-tab-btn');
        const tabPanels = adminModal.querySelectorAll('.admin-tab-panel');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-tab');
                
                // Toggle buttons active class
                tabButtons.forEach(b => b.classList.toggle('active', b === btn));
                
                // Toggle panels visibility
                tabPanels.forEach(panel => {
                    panel.classList.toggle('hidden', panel.id !== targetTabId);
                });
            });
        });

        // Reminder Type field visibility toggle
        const reminderTypeSelect = document.getElementById('admin-reminder-type');
        const customMessageField = document.getElementById('custom-message-field');
        if (reminderTypeSelect && customMessageField) {
            reminderTypeSelect.addEventListener('change', () => {
                customMessageField.classList.toggle('hidden', reminderTypeSelect.value !== 'custom');
            });
        }

        // Helper to check for admin key
        const getAdminKey = () => {
            return String(document.getElementById('admin-secret-key').value || '').trim();
        };

        // Create Student Submit
        const createForm = document.getElementById('admin-create-student-form');
        const createStatus = document.getElementById('admin-create-status');
        const createSubmit = document.getElementById('admin-create-submit');
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const adminKey = getAdminKey();
                if (!adminKey) {
                    showFormStatus(createStatus, 'Admin Secret Key is required to perform admin actions.', 'error');
                    return;
                }

                const formData = new FormData(createForm);
                const payload = {
                    action: 'adminCreateStudent',
                    adminKey,
                    name: String(formData.get('name') || '').trim(),
                    classLevel: String(formData.get('classLevel') || '').trim(),
                    parentName: String(formData.get('parentName') || '').trim(),
                    parentPhone: String(formData.get('parentPhone') || '').trim(),
                    parentEmail: String(formData.get('parentEmail') || '').trim(),
                    username: String(formData.get('username') || '').trim(),
                    password: String(formData.get('password') || '').trim()
                };

                setButtonLoading(createSubmit, true);
                showFormStatus(createStatus, '', '');

                try {
                    if (DEMO_MODE) {
                        await fakeDelay();
                        showFormStatus(createStatus, 'Success! (Demo Mode) Student created with ID: STU-DEMO102', 'success');
                    } else {
                        const res = await postToBackend(payload);
                        showFormStatus(createStatus, `Success! Student created with ID: ${res.studentId}`, 'success');
                    }
                    createForm.reset();
                } catch (err) {
                    showFormStatus(createStatus, err.message || 'Creation failed.', 'error');
                } finally {
                    setButtonLoading(createSubmit, false);
                }
            });
        }

        // Reset Password Submit
        const resetForm = document.getElementById('admin-reset-password-form');
        const resetStatus = document.getElementById('admin-reset-status');
        const resetSubmit = document.getElementById('admin-reset-submit');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const adminKey = getAdminKey();
                if (!adminKey) {
                    showFormStatus(resetStatus, 'Admin Secret Key is required.', 'error');
                    return;
                }

                const formData = new FormData(resetForm);
                const payload = {
                    action: 'adminResetPassword',
                    adminKey,
                    studentId: String(formData.get('identifier') || '').trim(),
                    newPassword: String(formData.get('newPassword') || '').trim()
                };

                setButtonLoading(resetSubmit, true);
                showFormStatus(resetStatus, '', '');

                try {
                    if (DEMO_MODE) {
                        await fakeDelay();
                        showFormStatus(resetStatus, 'Success! (Demo Mode) Password has been reset.', 'success');
                    } else {
                        await postToBackend(payload);
                        showFormStatus(resetStatus, 'Success! Password has been reset.', 'success');
                    }
                    resetForm.reset();
                } catch (err) {
                    showFormStatus(resetStatus, err.message || 'Reset failed.', 'error');
                } finally {
                    setButtonLoading(resetSubmit, false);
                }
            });
        }

        // Mark Fee Paid Submit
        const feeForm = document.getElementById('admin-mark-fee-form');
        const feeStatus = document.getElementById('admin-fee-status');
        const feeSubmit = document.getElementById('admin-fee-submit');
        if (feeForm) {
            feeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const adminKey = getAdminKey();
                if (!adminKey) {
                    showFormStatus(feeStatus, 'Admin Secret Key is required.', 'error');
                    return;
                }

                const formData = new FormData(feeForm);
                const payload = {
                    action: 'adminMarkFeePaid',
                    adminKey,
                    studentId: String(formData.get('studentId') || '').trim(),
                    month: String(formData.get('month') || '').trim(),
                    amount: String(formData.get('amount') || '').trim(),
                    dueDate: String(formData.get('dueDate') || '').trim(),
                    reference: String(formData.get('reference') || '').trim(),
                    note: String(formData.get('note') || '').trim()
                };

                setButtonLoading(feeSubmit, true);
                showFormStatus(feeStatus, '', '');

                try {
                    if (DEMO_MODE) {
                        await fakeDelay();
                        showFormStatus(feeStatus, 'Success! (Demo Mode) Fee marked paid.', 'success');
                    } else {
                        await postToBackend(payload);
                        showFormStatus(feeStatus, 'Success! Fee marked paid in database.', 'success');
                    }
                    feeForm.reset();
                } catch (err) {
                    showFormStatus(feeStatus, err.message || 'Action failed.', 'error');
                } finally {
                    setButtonLoading(feeSubmit, false);
                }
            });
        }

        // Generate Reminders Submit
        const remindersForm = document.getElementById('admin-reminders-form');
        const remindersStatus = document.getElementById('admin-reminders-status');
        const remindersSubmit = document.getElementById('admin-reminders-submit');
        const waLinkContainer = document.getElementById('wa-link-container');
        const waSendBtn = document.getElementById('wa-send-btn');
        if (remindersForm) {
            remindersForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const adminKey = getAdminKey();
                if (!adminKey) {
                    showFormStatus(remindersStatus, 'Admin Secret Key is required.', 'error');
                    return;
                }

                const formData = new FormData(remindersForm);
                const payload = {
                    action: 'adminGenerateReminder',
                    adminKey,
                    studentId: String(formData.get('studentId') || '').trim(),
                    type: String(formData.get('type') || '').trim(),
                    message: String(formData.get('message') || '').trim()
                };

                setButtonLoading(remindersSubmit, true);
                showFormStatus(remindersStatus, '', '');
                if (waLinkContainer) waLinkContainer.classList.add('hidden');

                try {
                    let res;
                    if (DEMO_MODE) {
                        await fakeDelay();
                        res = {
                            message: 'Hi Parent, this is a fee due reminder from Eduwave Academy.',
                            whatsappLink: 'https://wa.me/919999999999?text=Hi%20Parent%2C%20this%20is%20a%20fee%20due%20reminder%20from%20Eduwave%20Academy.'
                        };
                        showFormStatus(remindersStatus, 'Success! (Demo Mode) WhatsApp reminder link generated below.', 'success');
                    } else {
                        res = await postToBackend(payload);
                        showFormStatus(remindersStatus, 'Success! Reminder logged and WhatsApp link generated below.', 'success');
                    }
                    
                    if (waLinkContainer && waSendBtn) {
                        waSendBtn.href = res.whatsappLink;
                        waLinkContainer.classList.remove('hidden');
                    }
                    remindersForm.reset();
                } catch (err) {
                    showFormStatus(remindersStatus, err.message || 'Action failed.', 'error');
                } finally {
                    setButtonLoading(remindersSubmit, false);
                }
            });
        }
    }

    function clearDashboard() {
        if (!portalLoginView || !portalDashboardView) return;
        portalLoginView.classList.remove('hidden');
        portalDashboardView.classList.add('hidden');
        if (dashboardResourceList) dashboardResourceList.innerHTML = '';
        if (dashboardFeeCard) dashboardFeeCard.innerHTML = '';
        if (paymentNoteForm) paymentNoteForm.reset();
        showFormStatus(paymentNoteStatus, '', '');
        
        // Hide preview panel on logout
        const previewPanel = document.getElementById('dashboard-preview-panel');
        if (previewPanel) previewPanel.classList.add('hidden');
    }

    function clearSession() { currentSession = null; window.sessionStorage.removeItem(SESSION_STORAGE_KEY); clearDashboard(); }
    function persistSession(session) { window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); }
    function loadStoredSession() { try { const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY); return stored ? JSON.parse(stored) : null; } catch (error) { return null; } }

    async function postToBackend(payload) {
        const response = await fetch(API_BASE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        let data;
        try { data = await response.json(); } catch (error) { throw new Error('Backend did not return valid JSON.'); }
        if (!response.ok || data.ok === false) throw new Error(data.message || 'Backend request failed.');
        return data.data || data;
    }

    function showFormStatus(element, message, type) {
        if (!element) return;
        if (!message) { element.textContent = ''; element.className = 'form-status hidden'; return; }
        element.textContent = message;
        element.className = `form-status ${type}`;
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.loading-spinner');
        button.disabled = isLoading;
        if (text) text.classList.toggle('hidden', isLoading);
        if (spinner) spinner.classList.toggle('hidden', !isLoading);
    }

    function getDeviceFingerprint() {
        const seed = [navigator.userAgent, navigator.language, window.screen.width, window.screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
        let hash = 0;
        for (let index = 0; index < seed.length; index += 1) { hash = ((hash << 5) - hash) + seed.charCodeAt(index); hash |= 0; }
        return `device-${Math.abs(hash)}`;
    }

    function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }

    function fakeDelay() { return new Promise((resolve) => { window.setTimeout(resolve, 450); }); }
});
