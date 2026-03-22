document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            // Toggle body scroll
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when a link is clicked
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // --- Sticky Navbar ---
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Scroll Reveal Animations ---
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once it's visible
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
    
    // Image loading fallbacks to show a nice color until image loads
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if(img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
    });

    // --- Parent Login Modal Logic ---
    const openLoginBtn = document.getElementById('open-login-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const loginForm = document.getElementById('parent-login-form');
    const loginError = document.getElementById('login-error');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginSpinner = document.getElementById('login-spinner');
    const loginFormContainer = document.getElementById('login-form-container');
    const loginSuccessContainer = document.getElementById('login-success-container');
    const folderLinkBtn = document.getElementById('folder-link-btn');

    // Apps Script Deployment URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGqjY8IbHBsYGYKd--IHUXVV7cZUeaSCB_efvE_2YlHstMz-xZp34AfUe-ixjBvGWd/exec';

    function openModal() {
        loginModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Reset states
        loginError.classList.add('hidden');
        loginFormContainer.classList.remove('hidden');
        loginSuccessContainer.classList.add('hidden');
    }

    function closeModal() {
        loginModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (openLoginBtn) openLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        // close mobile menu first
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
        openModal(); 
    });
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    // Close on outside click
    if (loginModal) loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal();
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('parent-email').value;
            const password = document.getElementById('parent-password').value;

            // Set loading state
            loginBtnText.classList.add('hidden');
            loginSpinner.classList.remove('hidden');
            loginError.classList.add('hidden');
            document.getElementById('login-submit-btn').disabled = true;

            try {
                // We use text/plain to avoid CORS preflight issues with standard JSON post to Apps Script web app
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8',
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.status === 200) {
                    // Success!
                    loginFormContainer.classList.add('hidden');
                    loginSuccessContainer.classList.remove('hidden');
                    folderLinkBtn.href = data.folderLink;
                } else {
                    // Show error from Apps Script
                    loginError.textContent = data.message || "Login failed. Please verify credentials.";
                    loginError.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Login error:", err);
                loginError.textContent = "Network error or script misconfiguration. Please try again.";
                loginError.classList.remove('hidden');
            } finally {
                // Remove loading state
                loginBtnText.classList.remove('hidden');
                loginSpinner.classList.add('hidden');
                document.getElementById('login-submit-btn').disabled = false;
            }
        });
    }
});
