/* Admin Panel — uygulama içi overlay modülü */
(() => {
  'use strict';

  const API_BASE = '/api';

  function getToken() { return localStorage.getItem('cb_token'); }

  // ── Overlay aç/kapat ──────────────────────────────────────────────────────
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return; // admin HTML yüklü değilse çık

  function openPanel() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadStats();
    loadUsers();
    // aktif tab'ı dashboard'a sıfırla
    setActiveTab('dashboard');
  }

  function closePanel() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  document.getElementById('admin-close')?.addEventListener('click', closePanel);
  document.getElementById('btn-admin')?.addEventListener('click', () => {
    // dropdown'ı kapat
    document.getElementById('user-dropdown')?.classList.remove('open');
    openPanel();
  });

  // ── API helper ────────────────────────────────────────────────────────────
  async function apiFetch(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { window.location.href = '/login'; return null; }
    return res.json();
  }

  // ── DOM helpers (XSS-safe: textContent only) ──────────────────────────────
  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  }

  function td(text, className) {
    const el = document.createElement('td');
    if (className) el.className = className;
    el.textContent = String(text ?? '');
    return el;
  }

  function chip(text, mod) {
    const el = document.createElement('span');
    el.className = `admin-chip admin-chip--${mod}`;
    el.textContent = text;
    return el;
  }

  function actionBtn(label, mod, dataAttrs) {
    const btn = document.createElement('button');
    btn.className = `admin-btn admin-btn--sm admin-btn--${mod}`;
    btn.textContent = label;
    Object.entries(dataAttrs).forEach(([k, v]) => (btn.dataset[k] = v));
    return btn;
  }

  // ── Confirm modal ─────────────────────────────────────────────────────────
  let confirmResolve = null;
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmMsg     = document.getElementById('confirm-message');

  document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    confirmResolve?.(false);
  });
  document.getElementById('confirm-ok')?.addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    confirmResolve?.(true);
  });

  function confirmDialog(msg) {
    confirmMsg.textContent = msg;
    confirmOverlay.classList.remove('hidden');
    return new Promise(r => { confirmResolve = r; });
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  const navItems = overlay.querySelectorAll('.admin-nav-item');
  const tabs     = overlay.querySelectorAll('.admin-tab');

  function setActiveTab(name) {
    navItems.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    tabs.forEach(t => t.classList.toggle('active', t.id === `tab-${name}`));
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
      if (tab === 'users')    loadUsers();
      if (tab === 'listings') loadListings();
      if (tab === 'comments') loadComments();
    });
  });

  // ── Event delegation — tüm action butonları ───────────────────────────────
  overlay.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id, name } = btn.dataset;

    if (action === 'ban') {
      if (!await confirmDialog(`"${name}" kullanıcısını banlamak istediğinize emin misiniz?`)) return;
      await apiFetch('PATCH', `/admin/users/${id}/ban`);
      loadUsers(usersPage); loadStats();
    }
    if (action === 'unban') {
      await apiFetch('PATCH', `/admin/users/${id}/unban`);
      loadUsers(usersPage); loadStats();
    }
    if (action === 'delete-user') {
      if (!await confirmDialog(`"${name}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
      await apiFetch('DELETE', `/admin/users/${id}`);
      loadUsers(usersPage); loadStats();
    }
    if (action === 'delete-listing') {
      if (!await confirmDialog(`"${name}" ilanını kalıcı olarak silmek istediğinize emin misiniz?`)) return;
      await apiFetch('DELETE', `/admin/listings/${id}`);
      loadListings(listingsPage); loadStats();
    }
    if (action === 'delete-comment') {
      if (!await confirmDialog('Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?')) return;
      await apiFetch('DELETE', `/admin/comments/${id}`);
      loadComments(commentsPage); loadStats();
    }
  });

  // ── Dashboard stats ───────────────────────────────────────────────────────
  async function loadStats() {
    const data = await apiFetch('GET', '/admin/stats');
    if (!data) return;
    document.getElementById('stat-users').textContent    = data.total_users;
    document.getElementById('stat-listings').textContent = data.total_listings;
    document.getElementById('stat-active').textContent   = data.active_listings;
    document.getElementById('stat-comments').textContent = data.total_comments;
    document.getElementById('stat-banned').textContent   = data.banned_users;
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  let usersPage = 1;

  async function loadUsers(page = 1) {
    usersPage = page;
    const search = document.getElementById('users-search')?.value.trim() ?? '';
    const data = await apiFetch('GET', `/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;
    const tbody = document.getElementById('users-tbody');
    tbody.replaceChildren();

    if (!data.users.length) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 7; cell.className = 'admin-table-empty';
      cell.textContent = 'Kullanıcı bulunamadı';
      document.getElementById('users-pagination').replaceChildren();
      return;
    }

    data.users.forEach(u => {
      const row = tbody.insertRow();
      if (u.is_banned) row.classList.add('admin-row--banned');

      const nameTd = document.createElement('td');
      nameTd.textContent = u.name;
      if (u.is_admin) nameTd.appendChild(chip('Admin', 'admin'));

      const statusTd = document.createElement('td');
      statusTd.appendChild(u.is_banned ? chip('Banlı', 'banned') : chip('Aktif', 'ok'));

      const actionsTd = document.createElement('td');
      actionsTd.className = 'admin-td-actions';
      if (!u.is_admin) {
        actionsTd.appendChild(
          u.is_banned
            ? actionBtn('Banı Kaldır', 'ghost', { action: 'unban', id: u.id })
            : actionBtn('Banla', 'warn', { action: 'ban', id: u.id, name: u.name }),
        );
        actionsTd.appendChild(actionBtn('Sil', 'danger', { action: 'delete-user', id: u.id, name: u.name }));
      } else {
        const prot = document.createElement('span');
        prot.className = 'admin-td-protected';
        prot.textContent = '—';
        actionsTd.appendChild(prot);
      }

      row.append(
        td(u.id, 'admin-td-id'),
        nameTd,
        td(u.email, 'admin-td-email'),
        td(u.faculty || '—'),
        td(timeAgo(u.created_at)),
        statusTd,
        actionsTd,
      );
    });

    renderPagination('users-pagination', page, data.total, 30, loadUsers);
  }

  let usersSearchTimer;
  document.getElementById('users-search')?.addEventListener('input', () => {
    clearTimeout(usersSearchTimer);
    usersSearchTimer = setTimeout(() => loadUsers(1), 350);
  });

  // ── Listings ──────────────────────────────────────────────────────────────
  let listingsPage = 1;

  async function loadListings(page = 1) {
    listingsPage = page;
    const search   = document.getElementById('listings-search')?.value.trim() ?? '';
    const category = document.getElementById('listings-category')?.value ?? '';
    const status   = document.getElementById('listings-status')?.value ?? '';
    const params   = new URLSearchParams({ search, category, status, page, limit: 30 });
    const data = await apiFetch('GET', `/admin/listings?${params}`);
    if (!data) return;
    const tbody = document.getElementById('listings-tbody');
    tbody.replaceChildren();

    if (!data.listings.length) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 7; cell.className = 'admin-table-empty';
      cell.textContent = 'İlan bulunamadı';
      document.getElementById('listings-pagination').replaceChildren();
      return;
    }

    data.listings.forEach(l => {
      const row = tbody.insertRow();
      const catTd = document.createElement('td');
      catTd.appendChild(chip(l.category, 'cat'));
      const statusTd = document.createElement('td');
      statusTd.appendChild(chip(l.status, l.status === 'aktif' ? 'ok' : 'off'));
      const actionsTd = document.createElement('td');
      actionsTd.className = 'admin-td-actions';
      actionsTd.appendChild(actionBtn('Sil', 'danger', { action: 'delete-listing', id: l.id, name: l.title }));

      row.append(
        td(l.id, 'admin-td-id'),
        td(l.title, 'admin-td-title'),
        catTd,
        td(l.author_name),
        statusTd,
        td(timeAgo(l.created_at)),
        actionsTd,
      );
    });

    renderPagination('listings-pagination', page, data.total, 30, loadListings);
  }

  let listingsSearchTimer;
  document.getElementById('listings-search')?.addEventListener('input', () => {
    clearTimeout(listingsSearchTimer);
    listingsSearchTimer = setTimeout(() => loadListings(1), 350);
  });
  document.getElementById('listings-category')?.addEventListener('change', () => loadListings(1));
  document.getElementById('listings-status')?.addEventListener('change',   () => loadListings(1));

  // ── Comments ──────────────────────────────────────────────────────────────
  let commentsPage = 1;

  async function loadComments(page = 1) {
    commentsPage = page;
    const search = document.getElementById('comments-search')?.value.trim() ?? '';
    const data = await apiFetch('GET', `/admin/comments?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;
    const tbody = document.getElementById('comments-tbody');
    tbody.replaceChildren();

    if (!data.comments.length) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6; cell.className = 'admin-table-empty';
      cell.textContent = 'Yorum bulunamadı';
      document.getElementById('comments-pagination').replaceChildren();
      return;
    }

    data.comments.forEach(c => {
      const row = tbody.insertRow();
      const actionsTd = document.createElement('td');
      actionsTd.className = 'admin-td-actions';
      actionsTd.appendChild(actionBtn('Sil', 'danger', { action: 'delete-comment', id: c.id }));

      row.append(
        td(c.id, 'admin-td-id'),
        td(c.content, 'admin-td-content'),
        td(c.author_name),
        td(c.listing_title, 'admin-td-title'),
        td(timeAgo(c.created_at)),
        actionsTd,
      );
    });

    renderPagination('comments-pagination', page, data.total, 30, loadComments);
  }

  let commentsSearchTimer;
  document.getElementById('comments-search')?.addEventListener('input', () => {
    clearTimeout(commentsSearchTimer);
    commentsSearchTimer = setTimeout(() => loadComments(1), 350);
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  function renderPagination(containerId, currentPage, total, limit, onPage) {
    const totalPages = Math.ceil(total / limit);
    const el = document.getElementById(containerId);
    el.replaceChildren();
    if (totalPages <= 1) return;

    if (currentPage > 1) {
      const prev = document.createElement('button');
      prev.className = 'admin-page-btn';
      prev.textContent = '‹ Önceki';
      prev.addEventListener('click', () => onPage(currentPage - 1));
      el.appendChild(prev);
    }
    const info = document.createElement('span');
    info.className = 'admin-page-info';
    info.textContent = `${currentPage} / ${totalPages}`;
    el.appendChild(info);

    if (currentPage < totalPages) {
      const next = document.createElement('button');
      next.className = 'admin-page-btn';
      next.textContent = 'Sonraki ›';
      next.addEventListener('click', () => onPage(currentPage + 1));
      el.appendChild(next);
    }
  }
})();
