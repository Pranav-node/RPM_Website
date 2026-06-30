/* =============================================
   RPM Motor Works — main.js
   Interactivity + Supabase bookings + EmailJS
   ============================================= */

(function () {
    'use strict';

    // ─── THEME TOGGLE (dark ↔ light) ────────────
    const savedTheme = localStorage.getItem('rpm-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('rpm-theme', next);
        });
    }
    // ─── SUPABASE CLIENT (lazy-init) ───────────
    let _supabase = null;

    function getSupabase() {
        if (_supabase) return _supabase;
        if (typeof window.supabase === 'undefined' || typeof RPM_CONFIG === 'undefined') return null;
        _supabase = window.supabase.createClient(
            RPM_CONFIG.supabase.url,
            RPM_CONFIG.supabase.anonKey
        );
        return _supabase;
    }

    // ─── NAVBAR SCROLL BEHAVIOUR ───────────────
    const navbar = document.getElementById('navbar');

    const handleNavScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();

    // ─── HERO WORD CYCLING ANIMATION ────────────
    const heroWords = document.querySelectorAll('.hero-word');
    if (heroWords.length > 1) {
        let currentWordIdx = 0;
        setInterval(() => {
            const currentWord = heroWords[currentWordIdx];
            // Exit current word upward
            currentWord.classList.remove('active');
            currentWord.classList.add('exit-up');

            // Move to next word
            const nextIdx = (currentWordIdx + 1) % heroWords.length;
            const nextWord = heroWords[nextIdx];

            // Stage next word below
            nextWord.classList.remove('exit-up');
            nextWord.classList.add('enter-below');

            // Trigger reflow, then animate in
            void nextWord.offsetWidth;
            nextWord.classList.remove('enter-below');
            nextWord.classList.add('active');

            currentWordIdx = nextIdx;
        }, 2200);
    }

    // ─── ACTIVE NAV LINKS ──────────────────────
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id]');

    const updateActiveLink = () => {
        let current = '';
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    };
    window.addEventListener('scroll', updateActiveLink, { passive: true });

    // ─── MOBILE HAMBURGER ──────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
    });

    document.querySelectorAll('.mobile-link, .mobile-menu .btn-primary').forEach(el => {
        el.addEventListener('click', () => {
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
        }
    });

    // ─── SCROLL REVEAL ─────────────────────────
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));

    // ─── STATS COUNTER ─────────────────────────
    const counters = document.querySelectorAll('.counter');
    let countersStarted = false;

    const animateCounter = (el) => {
        const target = parseInt(el.dataset.target, 10);
        const start = performance.now();
        const update = (now) => {
            const p = Math.min((now - start) / 1800, 1);
            const val = Math.floor((1 - Math.pow(1 - p, 3)) * target);
            el.textContent = val + (p < 1 ? '' : '+');
            if (p < 1) requestAnimationFrame(update);
            else el.textContent = target + '+';
        };
        requestAnimationFrame(update);
    };

    const statsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !countersStarted) {
            countersStarted = true;
            counters.forEach(c => animateCounter(c));
            statsObserver.disconnect();
        }
    }, { threshold: 0.3 });

    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) statsObserver.observe(statsBar);

    // ─── TESTIMONIALS CAROUSEL ─────────────────
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let current = 0, autoTimer;

    const goTo = (idx) => {
        const oldSlide = slides[current];
        const newIdx = (idx + slides.length) % slides.length;
        const newSlide = slides[newIdx];

        // Exit old slide to the left
        oldSlide.classList.remove('active');
        oldSlide.classList.add('exit-left');
        dots[current].classList.remove('active');

        // Enter new slide from the right
        newSlide.classList.remove('exit-left');
        newSlide.classList.add('active');
        dots[newIdx].classList.add('active');

        // Clean up exit class after transition
        setTimeout(() => { oldSlide.classList.remove('exit-left'); }, 550);

        current = newIdx;
    };

    const resetAuto = () => { clearInterval(autoTimer); autoTimer = setInterval(() => goTo(current + 1), 6000); };

    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
    dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.idx); resetAuto(); }));
    resetAuto();

    // ─── GALLERY LIGHTBOX ──────────────────────
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            lightboxImg.src = item.dataset.src || item.querySelector('img').src;
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    });

    const closeLightbox = () => {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    };
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    // ─── TOAST ─────────────────────────────────
    const toast = document.getElementById('toast');

    const showToast = (type = 'success', title, msg) => {
        const icon = toast.querySelector('.toast-icon');
        const text = toast.querySelector('.toast-text');
        icon.textContent = type === 'success' ? '✅' : '❌';
        text.innerHTML = `<strong>${title}</strong>${msg}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5500);
    };

    // ─── HELPER: show/hide field errors ────────
    const showErr = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    };

    // ─── BOOKING FORM ──────────────────────────
    const bookingForm = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBtn');

    if (bookingForm) {

        // Clear errors on input/change
        ['f-name', 'f-phone', 'f-brand', 'f-service'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            ['input', 'change'].forEach(ev =>
                el.addEventListener(ev, () => showErr(id.replace('f-', 'err-'), false))
            );
        });

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('f-name').value.trim();
            const phone = document.getElementById('f-phone').value.trim();
            const brand = document.getElementById('f-brand').value;
            const model = document.getElementById('f-model').value.trim();
            const service = document.getElementById('f-service').value;
            const date = document.getElementById('f-date').value;
            const time = document.getElementById('f-time').value;

            // ── Validation ──
            let valid = true;
            if (name.length < 2) { showErr('err-name', true); valid = false; } else showErr('err-name', false);
            if (!/^[+]?[\d\s]{8,13}$/.test(phone.replace(/\s/g, ''))) { showErr('err-phone', true); valid = false; } else showErr('err-phone', false);
            if (!brand) { showErr('err-brand', true); valid = false; } else showErr('err-brand', false);
            if (!service) { showErr('err-service', true); valid = false; } else showErr('err-service', false);
            if (!valid) return;

            // ── Disable submit button ──
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Sending…';

            const booking = { name, phone, brand, model, service, date, time };

            // ── Always show success to customer immediately ──
            bookingForm.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = '✉️ Send Booking Request';
            showToast('success', 'Booking Request Sent!', ' We\'ll call you back within 2 hours to confirm.');

            // ── Try saving to Database via Proxy in background ──
            if (RPM_CONFIG.supabase.url !== 'YOUR_SUPABASE_PROJECT_URL') {
                fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...booking,
                        // Fallback: send creds if environment variables aren't set yet (during local dev test)
                        supabaseUrl: RPM_CONFIG.supabase.url,
                        supabaseKey: RPM_CONFIG.supabase.anonKey
                    })
                })
                    .then(async res => {
                        if (!res.ok) {
                            const errorData = await res.json();
                            throw new Error(errorData.error || 'Failed to save booking');
                        }
                        console.log('✅ Booking saved to database via proxy');
                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                            alert("✅ Developer info: Saved successfully via Vercel Proxy!");
                        }
                    })
                    .catch(err => {
                        console.warn('Proxy/Database Error:', err.message);
                        alert(`Submission Error: ${err.message}`);
                    });
            } else {
                console.info('[DEV] Booking data:', booking);
            }

            // ── Try sending email notification in background ──
            if (
                typeof emailjs !== 'undefined' &&
                RPM_CONFIG.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY'
            ) {
                emailjs.send(
                    RPM_CONFIG.emailjs.serviceId,
                    RPM_CONFIG.emailjs.templateId,
                    {
                        customer_name: name,
                        customer_phone: phone,
                        car_brand: brand,
                        car_model: model || 'Not specified',
                        service: service,
                        date: date || 'Flexible',
                        time: time || 'Flexible',
                        submitted_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    },
                    RPM_CONFIG.emailjs.publicKey
                ).then(() => console.log('✅ Email sent'))
                    .catch(err => console.warn('EmailJS:', err));
            }
        });
    }

    // ─── DATE: set min to today ─────────────────
    const dateField = document.getElementById('f-date');
    if (dateField) {
        const t = new Date();
        dateField.min = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }

    // ─── SMOOTH SCROLL ─────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 76;
                window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
            }
        });
    });

})();
