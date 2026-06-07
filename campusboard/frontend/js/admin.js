/* CampusBoard Admin Panel — integrated overlay module */
(() => {
  'use strict';

  const TOKEN_KEY = 'cb_token';
  const getToken  = () => localStorage.getItem(TOKEN_KEY);

  // ── Guard: only init if overlay exists ───────────────────────────────────
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;

  // ── API ──────────────────────────────────────────────────────────────────
  async function api(method, path, body) {
    try {
      const res = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) { window.location.href = '/login'; return null; }
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Bir hata oluştu', 'err'); return null; }
      return data;
    } catch {
      showToast('Bağlantı hatası', 'err');
      return null;
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'ok') {
    document.querySelectorAll('.admin-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `admin-toast admin-toast--${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmMsg     = document.getElementById('confirm-message');
  let   pendingResolve = null;

  function confirmDialog(msg) {
    confirmMsg.textContent = msg;
    confirmOverlay.classList.remove('hidden');
    return new Promise(resolve => { pendingResolve = resolve; });
  }

  // Use direct onclick to avoid bubbling issues
  document.getElementById('confirm-cancel').onclick = () => {
    confirmOverlay.classList.add('hidden');
    pendingResolve?.(false);
    pendingResolve = null;
  };
  document.getElementById('confirm-ok').onclick = () => {
    confirmOverlay.classList.add('hidden');
    pendingResolve?.(true);
    pendingResolve = null;
  };

  // ── Overlay open/close ────────────────────────────────────────────────────
  function openPanel() {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTab('dashboard');
    loadStats();
    loadUsers(1);
  }

  function closePanel() {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  document.getElementById('admin-close').onclick = closePanel;

  // btn-admin click — set up after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-admin')?.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('user-dropdown')?.classList.remove('open');
      openPanel();
    });
  });
  // Also try immediately in case DOM is already ready
  const btnAdmin = document.getElementById('btn-admin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('user-dropdown')?.classList.remove('open');
      openPanel();
    });
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  function setTab(name) {
    overlay.querySelectorAll('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    overlay.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.id === `tab-${name}`));
  }

  overlay.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      setTab(tab);
      if (tab === 'users')    loadUsers(1);
      if (tab === 'listings') { initUserPicker(); loadListings(1); }
      if (tab === 'comments') loadComments(1);
    });
  });

  // ── User Picker Dropdown ──────────────────────────────────────────────────
  let allUsers = [];           // cache
  let selectedAuthorId  = ''; // '' = all
  let userPickerLoaded  = false;

  const pickerBtn    = document.getElementById('user-picker-btn');
  const pickerPanel  = document.getElementById('user-picker-panel');
  const pickerLabel  = document.getElementById('user-picker-label');
  const pickerSearch = document.getElementById('user-picker-search');
  const pickerList   = document.getElementById('user-picker-list');
  const pickerAll    = document.getElementById('user-picker-all');

  function openUserPicker() {
    pickerBtn?.classList.add('open');
    pickerPanel?.classList.add('open');
    pickerBtn?.setAttribute('aria-expanded', 'true');
    pickerSearch?.focus();
  }
  function closeUserPicker() {
    pickerBtn?.classList.remove('open');
    pickerPanel?.classList.remove('open');
    pickerBtn?.setAttribute('aria-expanded', 'false');
  }

  pickerBtn?.addEventListener('click', e => {
    e.stopPropagation();
    pickerPanel?.classList.contains('open') ? closeUserPicker() : openUserPicker();
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!document.getElementById('admin-user-picker')?.contains(e.target)) closeUserPicker();
  });

  pickerAll?.addEventListener('click', () => {
    selectedAuthorId = '';
    pickerLabel.textContent = 'Tüm kullanıcılar';
    pickerList?.querySelectorAll('.admin-user-picker-item').forEach(i => i.classList.remove('selected'));
    pickerAll.classList.add('selected');
    closeUserPicker();
    loadListings(1);
  });

  function renderUserList(filterText = '') {
    if (!pickerList) return;
    pickerList.replaceChildren();
    const q = filterText.toLowerCase();
    const filtered = allUsers.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'admin-user-picker-empty';
      empty.textContent = 'Kullanıcı bulunamadı';
      pickerList.appendChild(empty);
      return;
    }
    filtered.forEach(u => {
      const item = document.createElement('div');
      item.className = `admin-user-picker-item${String(selectedAuthorId) === String(u.id) ? ' selected' : ''}`;
      item.setAttribute('role', 'option');
      const name = document.createElement('span');
      name.className = 'admin-user-picker-item-name';
      name.textContent = u.name;
      const email = document.createElement('span');
      email.className = 'admin-user-picker-item-email';
      email.textContent = u.email;
      item.append(name, email);
      item.addEventListener('click', () => {
        selectedAuthorId = u.id;
        pickerLabel.textContent = u.name;
        pickerAll.classList.remove('selected');
        pickerList.querySelectorAll('.admin-user-picker-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        closeUserPicker();
        loadListings(1);
      });
      pickerList.appendChild(item);
    });
  }

  pickerSearch?.addEventListener('input', () => renderUserList(pickerSearch.value));

  async function initUserPicker() {
    if (userPickerLoaded) return;
    const data = await api('GET', '/admin/users/list');
    if (!data) return;
    allUsers = data.users;
    userPickerLoaded = true;
    renderUserList();
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function td(text, cls) {
    const el = document.createElement('td');
    if (cls) el.className = cls;
    el.textContent = String(text ?? '—');
    return el;
  }

  function chip(text, mod) {
    const el = document.createElement('span');
    el.className = `admin-chip admin-chip--${mod}`;
    el.textContent = text;
    return el;
  }

  function mkBtn(label, mod, attrs = {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-btn admin-btn--sm admin-btn--${mod}`;
    btn.textContent = label;
    btn.style.cursor = 'pointer';
    Object.entries(attrs).forEach(([k, v]) => (btn.dataset[k] = v));
    return btn;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)    return 'az önce';
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'2-digit' });
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' });
  }

  function emptyRow(cols, msg) {
    const row = document.createElement('tr');
    const cell = row.insertCell();
    cell.colSpan = cols;
    cell.className = 'admin-table-empty';
    cell.textContent = msg || 'Veri bulunamadı';
    return row;
  }

  // ── Action helper (loading state + toast) ─────────────────────────────────
  async function runAction(btn, fn) {
    btn.classList.add('loading');
    btn.disabled = true;
    try {
      await fn();
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function renderPagination(containerId, currentPage, total, limit, onPage) {
    const pages = Math.ceil(total / limit);
    const el = document.getElementById(containerId);
    el.replaceChildren();
    if (pages <= 1) return;

    if (currentPage > 1) {
      const b = document.createElement('button');
      b.className = 'admin-page-btn'; b.textContent = '‹ Önceki';
      b.onclick = () => onPage(currentPage - 1);
      el.appendChild(b);
    }
    const info = document.createElement('span');
    info.className = 'admin-page-info';
    info.textContent = `${currentPage} / ${pages}  (${total} kayıt)`;
    el.appendChild(info);

    if (currentPage < pages) {
      const b = document.createElement('button');
      b.className = 'admin-page-btn'; b.textContent = 'Sonraki ›';
      b.onclick = () => onPage(currentPage + 1);
      el.appendChild(b);
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async function loadStats() {
    const data = await api('GET', '/admin/stats');
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
    const search = (document.getElementById('users-search')?.value ?? '').trim();
    const data = await api('GET', `/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;

    const tbody = document.getElementById('users-tbody');
    tbody.replaceChildren();

    if (!data.users.length) {
      tbody.appendChild(emptyRow(7, 'Kullanıcı bulunamadı'));
      document.getElementById('users-pagination').replaceChildren();
      return;
    }

    data.users.forEach(u => {
      const row = tbody.insertRow();
      if (u.is_banned) row.classList.add('admin-row--banned');

      // Name
      const nameTd = document.createElement('td');
      nameTd.className = 'admin-td-name';
      nameTd.textContent = u.name;
      if (u.is_admin) { nameTd.appendChild(document.createTextNode(' ')); nameTd.appendChild(chip('Admin', 'admin')); }

      // Status
      const statusTd = document.createElement('td');
      statusTd.appendChild(u.is_banned ? chip('Banlı', 'banned') : chip('Aktif', 'ok'));

      // Actions
      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';

      if (!u.is_admin) {
        const banBtn = u.is_banned
          ? mkBtn('Banı Kaldır', 'ok')
          : mkBtn('Banla', 'warn');

        banBtn.onclick = async () => {
          const action = u.is_banned ? 'banını kaldırmak' : 'banlamak';
          if (!await confirmDialog(`"${u.name}" kullanıcısını ${action} istediğinize emin misiniz?`)) return;
          await runAction(banBtn, async () => {
            const result = await api('PATCH', `/admin/users/${u.id}/${u.is_banned ? 'unban' : 'ban'}`);
            if (result) { showToast(u.is_banned ? 'Ban kaldırıldı' : 'Kullanıcı banlandı'); loadUsers(usersPage); loadStats(); }
          });
        };

        const delBtn = mkBtn('Sil', 'danger');
        delBtn.onclick = async () => {
          if (!await confirmDialog(`"${u.name}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
          await runAction(delBtn, async () => {
            const result = await api('DELETE', `/admin/users/${u.id}`);
            if (result) { showToast('Kullanıcı silindi', 'ok'); loadUsers(usersPage); loadStats(); }
          });
        };

        actTd.append(banBtn, delBtn);
      } else {
        const prot = document.createElement('span');
        prot.className = 'admin-td-protected';
        prot.textContent = '—';
        actTd.appendChild(prot);
      }

      row.append(
        td(u.id, 'admin-td-id'),
        nameTd,
        td(u.email, 'admin-td-email'),
        td(u.faculty || '—'),
        td(timeAgo(u.created_at)),
        statusTd,
        actTd,
      );
    });

    renderPagination('users-pagination', page, data.total, 30, loadUsers);
  }

  let usersTimer;
  document.getElementById('users-search')?.addEventListener('input', () => {
    clearTimeout(usersTimer);
    usersTimer = setTimeout(() => loadUsers(1), 350);
  });

  // ── Listings ──────────────────────────────────────────────────────────────
  let listingsPage = 1;
  const expandedRows = new Set(); // track which listing IDs are expanded

  async function loadListings(page = 1) {
    listingsPage = page;
    expandedRows.clear();
    const search   = (document.getElementById('listings-search')?.value ?? '').trim();
    const category = document.getElementById('listings-category')?.value ?? '';
    const status   = document.getElementById('listings-status')?.value ?? '';
    const params   = new URLSearchParams({ search, authorId: selectedAuthorId, category, status, page, limit: 30 });
    const data = await api('GET', `/admin/listings?${params}`);
    if (!data) return;

    const tbody = document.getElementById('listings-tbody');
    tbody.replaceChildren();

    if (!data.listings.length) {
      tbody.appendChild(emptyRow(10, 'İlan bulunamadı'));
      document.getElementById('listings-pagination').replaceChildren();
      return;
    }

    data.listings.forEach(l => {
      // Main row
      const row = tbody.insertRow();
      row.dataset.listingId = l.id;

      const catTd = document.createElement('td');
      catTd.appendChild(chip(l.category, 'cat'));

      const statusTd = document.createElement('td');
      statusTd.appendChild(chip(l.status, l.status === 'aktif' ? 'ok' : 'off'));

      // Delete button
      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';
      const delBtn = mkBtn('Sil', 'danger');
      delBtn.onclick = async () => {
        if (!await confirmDialog(`"${l.title}" ilanını kalıcı olarak silmek istediğinize emin misiniz?`)) return;
        await runAction(delBtn, async () => {
          const result = await api('DELETE', `/admin/listings/${l.id}`);
          if (result) { showToast('İlan silindi', 'ok'); loadListings(listingsPage); loadStats(); }
        });
      };
      actTd.appendChild(delBtn);

      // Expand toggle
      const expandTd = document.createElement('td');
      expandTd.className = 'admin-td-expand';
      expandTd.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4" stroke-linecap="round"/></svg>`;

      row.append(
        td(l.id, 'admin-td-id'),
        td(l.title, 'admin-td-title'),
        catTd,
        td(l.author_name),
        statusTd,
        td(fmtDate(l.created_at)),
        td(l.expires_at ? fmtDate(l.expires_at) : '—'),
        td(l.view_count ?? 0),
        actTd,
        expandTd,
      );

      // Detail row (hidden)
      const detailRow = document.createElement('tr');
      detailRow.className = 'admin-detail-row';
      detailRow.style.display = 'none';
      const detailCell = document.createElement('td');
      detailCell.colSpan = 10;

      const inner = document.createElement('div');
      inner.className = 'admin-detail-inner';

      function detailField(label, value, cls) {
        const wrap = document.createElement('div');
        wrap.className = `admin-detail-field${cls ? ' ' + cls : ''}`;
        const lbl = document.createElement('span');
        lbl.className = 'admin-detail-label';
        lbl.textContent = label;
        const val = document.createElement('span');
        val.className = 'admin-detail-val';
        val.textContent = value || '—';
        wrap.append(lbl, val);
        return wrap;
      }

      inner.append(
        detailField('Açıklama', l.description, 'admin-detail-desc'),
        detailField('İletişim', l.contact),
        detailField('Yazar E-posta', l.author_email),
        detailField('Yayın Tarihi', fmtDate(l.created_at)),
        detailField('Bitiş Tarihi', l.expires_at ? fmtDate(l.expires_at) : 'Belirtilmemiş'),
        detailField('Görüntülenme', String(l.view_count ?? 0)),
      );

      detailCell.appendChild(inner);
      detailRow.appendChild(detailCell);
      tbody.appendChild(detailRow);

      // Toggle expand on row/expand cell click
      const toggleExpand = () => {
        const isOpen = detailRow.style.display !== 'none';
        detailRow.style.display = isOpen ? 'none' : '';
        row.classList.toggle('admin-tr-expanded', !isOpen);
      };
      row.style.cursor = 'pointer';
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return; // don't expand when clicking action buttons
        toggleExpand();
      });
    });

    renderPagination('listings-pagination', page, data.total, 30, loadListings);
  }

  let listingsTimer;
  document.getElementById('listings-search')?.addEventListener('input', () => {
    clearTimeout(listingsTimer);
    listingsTimer = setTimeout(() => loadListings(1), 350);
  });
  document.getElementById('listings-category')?.addEventListener('change', () => loadListings(1));
  document.getElementById('listings-status')?.addEventListener('change',   () => loadListings(1));

  // ── Comments ──────────────────────────────────────────────────────────────
  let commentsPage = 1;

  async function loadComments(page = 1) {
    commentsPage = page;
    const search = (document.getElementById('comments-search')?.value ?? '').trim();
    const data = await api('GET', `/admin/comments?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;

    const tbody = document.getElementById('comments-tbody');
    tbody.replaceChildren();

    if (!data.comments.length) {
      tbody.appendChild(emptyRow(6, 'Yorum bulunamadı'));
      document.getElementById('comments-pagination').replaceChildren();
      return;
    }

    data.comments.forEach(c => {
      const row = tbody.insertRow();
      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';
      const delBtn = mkBtn('Sil', 'danger');
      delBtn.onclick = async () => {
        if (!await confirmDialog('Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?')) return;
        await runAction(delBtn, async () => {
          const result = await api('DELETE', `/admin/comments/${c.id}`);
          if (result) { showToast('Yorum silindi', 'ok'); loadComments(commentsPage); loadStats(); }
        });
      };
      actTd.appendChild(delBtn);

      row.append(
        td(c.id, 'admin-td-id'),
        td(c.content, 'admin-td-content'),
        td(c.author_name),
        td(c.listing_title, 'admin-td-title'),
        td(timeAgo(c.created_at)),
        actTd,
      );
    });

    renderPagination('comments-pagination', page, data.total, 30, loadComments);
  }

  let commentsTimer;
  document.getElementById('comments-search')?.addEventListener('input', () => {
    clearTimeout(commentsTimer);
    commentsTimer = setTimeout(() => loadComments(1), 350);
  });
})();
