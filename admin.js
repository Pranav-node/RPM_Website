/* =============================================
   RPM Motor Works — admin.js
   Admin panel: auth, dashboard, bookings CRUD
   ============================================= */

(function () {
    'use strict';

    // ─── INIT ──────────────────────────────────
    let db = null;
    let allBookings = [];
    let filteredBookings = [];
    let currentPage = 1;
    const PAGE_SIZE = 15;
    let refreshTimer = null;

    // Check config is present
    if (typeof RPM_CONFIG === 'undefined') {
        document.body.innerHTML = `
      <div style="font-family:sans-serif;padding:40px;color:#f0ece4;background:#080808;min-height:100vh;display:flex;align-items:center;justify-content:center;">
        <div style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:20px">⚠️</div>
          <h2 style="color:#c9a84c;margin-bottom:12px">config.js not found or not loaded</h2>
          <p style="color:#a8a09a;max-width:400px;">Please make sure <code>config.js</code> exists in the same folder and contains your Supabase credentials.</p>
        </div>
      </div>`;
        return;
    }

    // Init Supabase
    if (typeof window.supabase !== 'undefined') {
        db = window.supabase.createClient(RPM_CONFIG.supabase.url, RPM_CONFIG.supabase.anonKey);
    }

    // ─── DOM REFS ──────────────────────────────
    const authPage = document.getElementById('auth-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const adminEmailEl = document.getElementById('adminEmailDisplay');
    const tbody = document.getElementById('bookingsTbody');
    const searchBox = document.getElementById('searchBox');
    const statusFilter = document.getElementById('statusFilter');
    const paginationEl = document.getElementById('pagination');
    const pageButtons = document.getElementById('pageButtons');
    const paginationInfo = document.getElementById('paginationInfo');
    const toast = document.getElementById('adminToast');

    // ─── TOAST ─────────────────────────────────
    function showToast(msg, ok = true) {
        document.getElementById('toastIcon').textContent = ok ? '✅' : '❌';
        document.getElementById('toastMsg').textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // ─── SHOW / HIDE PAGES ─────────────────────
    function showAuth() {
        authPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        clearInterval(refreshTimer);
    }

    function showDashboard(email) {
        authPage.style.display = 'none';
        dashboardPage.style.display = 'flex';
        if (adminEmailEl) adminEmailEl.textContent = email || '—';
        loadBookings();
        // Auto-refresh every 60 seconds
        clearInterval(refreshTimer);
        refreshTimer = setInterval(loadBookings, 60000);
    }



    // ─── CHECK EXISTING SESSION ────────────────
    async function checkSession() {
        if (!db) { showAuth(); return; }
        try {
            const { data: { session } } = await db.auth.getSession();
            if (session) {
                showDashboard(session.user.email);
            } else {
                showAuth();
            }
        } catch {
            showAuth();
        }
    }

    // ─── LOGIN ─────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;

            if (!email || !password) {
                loginError.textContent = 'Please enter your email and password.';
                loginError.style.display = 'block';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in…';
            loginError.style.display = 'none';

            // Demo mode (no Supabase configured)
            if (!db || RPM_CONFIG.supabase.url === 'YOUR_SUPABASE_PROJECT_URL') {
                await delay(800);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In to Dashboard';
                showDashboard(email);
                return;
            }

            try {
                const { data, error } = await db.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showDashboard(data.user.email);
            } catch (err) {
                loginError.textContent = err.message || 'Login failed. Check your credentials.';
                loginError.style.display = 'block';
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In to Dashboard';
            }
        });
    }

    // ─── LOGOUT ────────────────────────────────
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (db && RPM_CONFIG.supabase.url !== 'YOUR_SUPABASE_PROJECT_URL') {
                    await db.auth.signOut();
                }
            } catch { /* ignore */ }
            showAuth();
        });
    }

    // ─── REFRESH ───────────────────────────────
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadBookings();
            showToast('Refreshed!');
        });
    }

    // ─── LOAD BOOKINGS ─────────────────────────
    async function loadBookings() {
        renderLoading();

        if (RPM_CONFIG.supabase.url === 'YOUR_SUPABASE_PROJECT_URL') {
            tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><span class="empty-icon">⚠️</span>Supabase not configured. Update config.js with your keys.</div></td></tr>`;
            return;
        }

        try {
            // Fetch via our Proxy, appending select and order params
            const queryParams = new URLSearchParams({
                select: '*',
                order: 'created_at.desc',
                // Fallbacks for local dev before env vars are set
                supabaseUrl: RPM_CONFIG.supabase.url,
                supabaseKey: RPM_CONFIG.supabase.anonKey
            });

            const response = await fetch(`/api/proxy?${queryParams.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch bookings');
            }

            const data = await response.json();
            allBookings = data || [];
            applyFilters();
            updateStats();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><span class="empty-icon">⚠️</span>${esc(err.message)}</div></td></tr>`;
        }
    }

    // ─── FILTERS ───────────────────────────────
    if (searchBox) searchBox.addEventListener('input', debounce(() => { currentPage = 1; applyFilters(); }, 300));
    if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });

    function applyFilters() {
        const q = (searchBox?.value || '').toLowerCase().trim();
        const status = statusFilter?.value || '';

        filteredBookings = allBookings.filter(b => {
            const matchSearch = !q || [b.name, b.phone, b.brand, b.model, b.service]
                .some(v => (v || '').toLowerCase().includes(q));
            const matchStatus = !status || b.status === status;
            return matchSearch && matchStatus;
        });

        currentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE)));
        renderTable();
        renderPagination();
    }

    // ─── RENDER TABLE ──────────────────────────
    function renderLoading() {
        tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><span class="spinner"></span> Loading…</div></td></tr>`;
    }

    function renderTable() {
        if (!filteredBookings.length) {
            tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><span class="empty-icon">📭</span>No bookings found.</div></td></tr>`;
            return;
        }

        const start = (currentPage - 1) * PAGE_SIZE;
        const page = filteredBookings.slice(start, start + PAGE_SIZE);

        tbody.innerHTML = page.map((b, i) => {
            const rowNum = start + i + 1;
            const created = b.created_at ? formatDate(b.created_at) : '—';
            const carLabel = [b.brand, b.model].filter(Boolean).join(' ');
            const badge = statusBadge(b.status);
            const selOpts = ['pending', 'confirmed', 'completed', 'cancelled']
                .map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${cap(s)}</option>`)
                .join('');

            return `
        <tr data-id="${b.id}">
          <td style="color:var(--text3)">${rowNum}</td>
          <td class="name-cell">${esc(b.name)}</td>
          <td class="phone-cell"><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></td>
          <td>${esc(carLabel) || '—'}</td>
          <td>${esc(b.service)}</td>
          <td>${b.date || '—'}</td>
          <td>${b.time || '—'}</td>
          <td style="white-space:nowrap">${created}</td>
          <td>
            <select class="status-select" data-id="${b.id}" title="Change status">
              ${selOpts}
            </select>
          </td>
        </tr>`;
        }).join('');

        // Attach status change listeners
        tbody.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', () => updateStatus(sel.dataset.id, sel.value));
        });
    }

    // ─── UPDATE STATUS ─────────────────────────
    async function updateStatus(id, newStatus) {
        // Optimistic UI update
        const booking = allBookings.find(b => b.id === id);
        if (booking) booking.status = newStatus;
        updateStats();

        if (RPM_CONFIG.supabase.url === 'YOUR_SUPABASE_PROJECT_URL') {
            showToast(`Status → ${cap(newStatus)}`);
            return;
        }

        try {
            // Update via Proxy
            const queryParams = new URLSearchParams({
                id: `eq.${id}`, // PostgREST syntax for filtering
                supabaseUrl: RPM_CONFIG.supabase.url,
                supabaseKey: RPM_CONFIG.supabase.anonKey
            });

            const response = await fetch(`/api/proxy?${queryParams.toString()}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Update failed');
            }
            showToast(`Status updated to ${cap(newStatus)}`);
        } catch (err) {
            showToast('Update failed: ' + err.message, false);
        }
    }

    // ─── STATS ─────────────────────────────────
    function updateStats() {
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('stat-total').textContent = allBookings.length;
        document.getElementById('stat-pending').textContent = allBookings.filter(b => b.status === 'pending').length;
        document.getElementById('stat-confirmed').textContent = allBookings.filter(b => b.status === 'confirmed').length;
        document.getElementById('stat-today').textContent = allBookings.filter(b => (b.created_at || '').startsWith(today)).length;
    }

    // ─── PAGINATION ────────────────────────────
    function renderPagination() {
        const total = filteredBookings.length;
        const pages = Math.ceil(total / PAGE_SIZE);
        const start = Math.min((currentPage - 1) * PAGE_SIZE + 1, total);
        const end = Math.min(currentPage * PAGE_SIZE, total);

        paginationInfo.textContent = total ? `Showing ${start}–${end} of ${total}` : 'No results';

        // Build page buttons (max 7 shown)
        let html = '';
        const range = pagRange(currentPage, pages);
        range.forEach(p => {
            if (p === '…') {
                html += `<span style="color:var(--text3);padding:5px 4px">…</span>`;
            } else {
                html += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
            }
        });
        pageButtons.innerHTML = html;
        pageButtons.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => { currentPage = +btn.dataset.page; renderTable(); renderPagination(); });
        });
    }

    function pagRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
        if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
        return [1, '…', current - 1, current, current + 1, '…', total];
    }

    // ─── DEMO DATA (when Supabase not configured) ──
    function getDemoBookings() {
        return [
            { id: '1', name: 'Rahul Mehta', phone: '+91 98000 11111', brand: 'Audi', model: 'A6', service: 'Engine Servicing & Maintenance', date: '2026-03-05', time: '10:00 AM', status: 'confirmed', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: '2', name: 'Sneha Kulkarni', phone: '+91 90000 22222', brand: 'Mercedes-Benz', model: 'C-Class', service: 'Ceramic Coating', date: '2026-03-06', time: '11:00 AM', status: 'pending', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
            { id: '3', name: 'Amit Deshmukh', phone: '+91 87000 33333', brand: 'Porsche', model: 'Cayenne', service: 'Suspension & Steering', date: '2026-03-07', time: '2:00 PM', status: 'pending', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
            { id: '4', name: 'Priya Sharma', phone: '+91 77000 44444', brand: 'BMW', model: '5 Series', service: 'Denting & Painting', date: '2026-03-04', time: '12:00 PM', status: 'completed', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
            { id: '5', name: 'Vikram Joshi', phone: '+91 99000 55555', brand: 'Volkswagen', model: 'Tiguan', service: 'AC Service & Repair', date: '2026-03-08', time: '3:00 PM', status: 'confirmed', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: '6', name: 'Ananya Patil', phone: '+91 88000 66666', brand: 'Land Rover', model: 'Defender', service: 'PPF — Paint Protection Film', date: '2026-03-10', time: '10:00 AM', status: 'pending', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
            { id: '7', name: 'Rohan Kapoor', phone: '+91 91000 77777', brand: 'Audi', model: 'Q7', service: 'Wheel Alignment & Balancing', date: '2026-03-03', time: '4:00 PM', status: 'completed', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: '8', name: 'Meera Iyer', phone: '+91 96000 88888', brand: 'Lexus', model: 'LX', service: 'Detailing & Valeting', date: '2026-03-09', time: '1:00 PM', status: 'pending', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: '9', name: 'Tushar Gaikwad', phone: '+91 82000 99999', brand: 'Mini Cooper', model: 'Countryman', service: 'Insurance Claim Repair', date: '2026-03-11', time: '11:00 AM', status: 'cancelled', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
        ];
    }

    // ─── HELPERS ───────────────────────────────
    function statusBadge(s) {
        const map = { pending: '⏳ Pending', confirmed: '✅ Confirmed', completed: '🏁 Completed', cancelled: '❌ Cancelled' };
        return `<span class="status-badge status-${s || 'pending'}">${map[s] || s}</span>`;
    }

    function formatDate(iso) {
        try { return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    }

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function debounce(fn, ms) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // ─── BOOT ──────────────────────────────────
    checkSession();

})();
