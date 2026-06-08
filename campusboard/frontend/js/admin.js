/* CampusBoard — Admin Panel (integrated overlay) */
(() => {
  'use strict';

  // ── Guard ──────────────────────────────────────────────────────────────────
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return; // admin HTML yoksa çık

  // ── API ───────────────────────────────────────────────────────────────────
  const getToken = () => localStorage.getItem('cb_token');

  async function api(method, path, body) {
    try {
      const res = await fetch(`/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) { window.location.href = '/login'; return null; }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast(json.error || 'Bir hata oluştu', 'err'); return null; }
      return json;
    } catch (err) {
      console.error('[Admin API]', err);
      toast('Bağlantı hatası', 'err');
      return null;
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type = 'ok') {
    document.querySelectorAll('.admin-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = `admin-toast admin-toast--${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const confirmOverlay = document.getElementById('admin-confirm-overlay');
  const confirmMsg     = document.getElementById('admin-confirm-message');
  let   pendingResolve = null;

  function confirmDialog(msg) {
    if (!confirmOverlay || !confirmMsg) return Promise.resolve(window.confirm(msg));
    confirmMsg.textContent = msg;
    confirmOverlay.classList.remove('hidden');
    return new Promise(res => { pendingResolve = res; });
  }

  const cancelBtn = document.getElementById('admin-confirm-cancel');
  const okBtn     = document.getElementById('admin-confirm-ok');

  if (cancelBtn) cancelBtn.onclick = () => {
    confirmOverlay?.classList.add('hidden');
    if (pendingResolve) { pendingResolve(false); pendingResolve = null; }
  };
  if (okBtn) okBtn.onclick = () => {
    confirmOverlay?.classList.add('hidden');
    if (pendingResolve) { pendingResolve(true); pendingResolve = null; }
  };

  // ── Open / Close panel ────────────────────────────────────────────────────
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

  const adminCloseBtn = document.getElementById('admin-close');
  if (adminCloseBtn) adminCloseBtn.onclick = closePanel;

  // btn-admin — tek listener, addEventListener ile
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
    overlay.querySelectorAll('.admin-nav-item')
      .forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    overlay.querySelectorAll('.admin-tab')
      .forEach(t => t.classList.toggle('active', t.id === `tab-${name}`));
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
  let allUsers = [], selectedAuthorId = '', userPickerLoaded = false;

  const pickerBtn    = document.getElementById('user-picker-btn');
  const pickerPanel  = document.getElementById('user-picker-panel');
  const pickerLabel  = document.getElementById('user-picker-label');
  const pickerSearch = document.getElementById('user-picker-search');
  const pickerList   = document.getElementById('user-picker-list');
  const pickerAll    = document.getElementById('user-picker-all');

  if (pickerBtn) {
    pickerBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = pickerPanel?.classList.contains('open');
      pickerPanel?.classList.toggle('open', !open);
      pickerBtn.classList.toggle('open', !open);
      pickerBtn.setAttribute('aria-expanded', String(!open));
      if (!open) pickerSearch?.focus();
    });
  }

  document.addEventListener('click', e => {
    if (!document.getElementById('admin-user-picker')?.contains(e.target)) {
      pickerPanel?.classList.remove('open');
      pickerBtn?.classList.remove('open');
    }
  });

  if (pickerAll) {
    pickerAll.addEventListener('click', () => {
      selectedAuthorId = '';
      if (pickerLabel) pickerLabel.textContent = 'Tüm kullanıcılar';
      pickerAll.classList.add('selected');
      pickerList?.querySelectorAll('.admin-user-picker-item')
        .forEach(i => i.classList.remove('selected'));
      pickerPanel?.classList.remove('open');
      pickerBtn?.classList.remove('open');
      loadListings(1);
    });
  }

  function renderUserList(q = '') {
    if (!pickerList) return;
    pickerList.replaceChildren();
    const lower = q.toLowerCase();
    const filtered = allUsers.filter(u =>
      u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)
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
      item.className = 'admin-user-picker-item';
      item.setAttribute('role', 'option');
      if (String(selectedAuthorId) === String(u.id)) item.classList.add('selected');

      const name  = document.createElement('span');
      name.className = 'admin-user-picker-item-name';
      name.textContent = u.name;
      const email = document.createElement('span');
      email.className = 'admin-user-picker-item-email';
      email.textContent = u.email;
      item.append(name, email);

      item.addEventListener('click', () => {
        selectedAuthorId = u.id;
        if (pickerLabel) pickerLabel.textContent = u.name;
        pickerAll?.classList.remove('selected');
        pickerList.querySelectorAll('.admin-user-picker-item')
          .forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        pickerPanel?.classList.remove('open');
        pickerBtn?.classList.remove('open');
        loadListings(1);
      });
      pickerList.appendChild(item);
    });
  }

  if (pickerSearch) {
    pickerSearch.addEventListener('input', () => renderUserList(pickerSearch.value));
  }

  async function initUserPicker() {
    if (userPickerLoaded) return;
    const data = await api('GET', '/admin/users/list');
    if (!data) return;
    allUsers = data.users ?? [];
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

  function mkBtn(label, mod) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `admin-btn admin-btn--sm admin-btn--${mod}`;
    btn.textContent = label;
    return btn;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const d = Date.now() - new Date(dateStr).getTime();
    const s = d / 1000;
    if (s < 60)    return 'az önce';
    if (s < 3600)  return `${Math.floor(s / 60)} dk önce`;
    if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function emptyRow(cols, msg) {
    const row = document.createElement('tr');
    const c = row.insertCell();
    c.colSpan = cols; c.className = 'admin-table-empty';
    c.textContent = msg || 'Veri bulunamadı';
    return row;
  }

  async function doAction(btn, fn) {
    btn.disabled = true;
    btn.classList.add('loading');
    try { await fn(); }
    catch (err) { console.error('[Admin Action]', err); toast('Bir hata oluştu', 'err'); }
    finally { btn.disabled = false; btn.classList.remove('loading'); }
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function renderPagination(id, page, total, limit, cb) {
    const pages = Math.ceil(total / limit);
    const el = document.getElementById(id);
    if (!el) return;
    el.replaceChildren();
    if (pages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'admin-page-btn'; prev.textContent = '‹ Önceki';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => cb(page - 1));
    el.appendChild(prev);

    const info = document.createElement('span');
    info.className = 'admin-page-info';
    info.textContent = `${page} / ${pages} · ${total} kayıt`;
    el.appendChild(info);

    const next = document.createElement('button');
    next.className = 'admin-page-btn'; next.textContent = 'Sonraki ›';
    next.disabled = page >= pages;
    next.addEventListener('click', () => cb(page + 1));
    el.appendChild(next);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async function loadStats() {
    const data = await api('GET', '/admin/stats');
    if (!data) return;
    ['users','listings','active','comments','banned'].forEach(k => {
      const el = document.getElementById(`stat-${k}`);
      if (el) el.textContent =
        data[k === 'active' ? 'active_listings' : k === 'comments' ? 'total_comments' : k === 'banned' ? 'banned_users' : `total_${k}`] ?? '—';
    });
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  let usersPage = 1;

  async function loadUsers(page = 1) {
    usersPage = page;
    const search = (document.getElementById('users-search')?.value ?? '').trim();
    const data = await api('GET', `/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;

    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!data.users?.length) {
      tbody.appendChild(emptyRow(7, 'Kullanıcı bulunamadı'));
      document.getElementById('users-pagination')?.replaceChildren();
      return;
    }

    data.users.forEach(u => {
      const row = tbody.insertRow();
      if (u.is_banned) row.classList.add('admin-row--banned');

      const nameTd = document.createElement('td');
      nameTd.className = 'admin-td-name';
      nameTd.textContent = u.name;
      if (u.is_admin) {
        nameTd.appendChild(document.createTextNode(' '));
        nameTd.appendChild(chip('Admin', 'admin'));
      }

      const statusTd = document.createElement('td');
      statusTd.appendChild(u.is_banned ? chip('Banlı', 'banned') : chip('Aktif', 'ok'));

      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';

      if (!u.is_admin) {
        const banBtn = mkBtn(u.is_banned ? 'Banı Kaldır' : 'Banla', u.is_banned ? 'ok' : 'warn');
        banBtn.addEventListener('click', async () => {
          const verb = u.is_banned ? 'banını kaldırmak' : 'banlamak';
          const ok = await confirmDialog(`"${u.name}" kullanıcısını ${verb} istediğinize emin misiniz?`);
          if (!ok) return;
          await doAction(banBtn, async () => {
            const res = await api('PATCH', `/admin/users/${u.id}/${u.is_banned ? 'unban' : 'ban'}`);
            if (res) { toast(u.is_banned ? 'Ban kaldırıldı ✓' : 'Kullanıcı banlandı ✓'); loadUsers(usersPage); loadStats(); }
          });
        });

        const delBtn = mkBtn('Sil', 'danger');
        delBtn.addEventListener('click', async () => {
          const ok = await confirmDialog(`"${u.name}" kullanıcısını kalıcı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`);
          if (!ok) return;
          await doAction(delBtn, async () => {
            const res = await api('DELETE', `/admin/users/${u.id}`);
            if (res) { toast('Kullanıcı silindi ✓'); loadUsers(usersPage); loadStats(); }
          });
        });

        actTd.append(banBtn, delBtn);
      } else {
        const p = document.createElement('span');
        p.className = 'admin-td-protected'; p.textContent = '—';
        actTd.appendChild(p);
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

  async function loadListings(page = 1) {
    listingsPage = page;
    const search   = (document.getElementById('listings-search')?.value ?? '').trim();
    const category = document.getElementById('listings-category')?.value ?? '';
    const status   = document.getElementById('listings-status')?.value ?? '';
    const params   = new URLSearchParams({ search, authorId: selectedAuthorId, category, status, page, limit: 30 });
    const data = await api('GET', `/admin/listings?${params}`);
    if (!data) return;

    const tbody = document.getElementById('listings-tbody');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!data.listings?.length) {
      tbody.appendChild(emptyRow(10, 'İlan bulunamadı'));
      document.getElementById('listings-pagination')?.replaceChildren();
      return;
    }

    data.listings.forEach(l => {
      const row = tbody.insertRow();
      row.style.cursor = 'pointer';

      const catTd = document.createElement('td');
      catTd.appendChild(chip(l.category, 'cat'));

      const statusTd = document.createElement('td');
      statusTd.appendChild(chip(l.status, l.status === 'aktif' ? 'ok' : 'off'));

      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';
      const delBtn = mkBtn('Sil', 'danger');
      delBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const ok = await confirmDialog(`"${l.title}" ilanını kalıcı silmek istediğinize emin misiniz?`);
        if (!ok) return;
        await doAction(delBtn, async () => {
          const res = await api('DELETE', `/admin/listings/${l.id}`);
          if (res) { toast('İlan silindi ✓'); loadListings(listingsPage); loadStats(); }
        });
      });
      actTd.appendChild(delBtn);

      // Chevron
      const chevTd = document.createElement('td');
      chevTd.className = 'admin-td-expand';
      const chevSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevSvg.setAttribute('viewBox','0 0 16 16'); chevSvg.setAttribute('width','14'); chevSvg.setAttribute('height','14');
      chevSvg.setAttribute('fill','none'); chevSvg.setAttribute('stroke','currentColor'); chevSvg.setAttribute('stroke-width','1.8');
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d','M4 6l4 4 4-4'); p.setAttribute('stroke-linecap','round');
      chevSvg.appendChild(p); chevTd.appendChild(chevSvg);

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
        chevTd,
      );

      // Detail expand row
      const detailRow = document.createElement('tr');
      detailRow.className = 'admin-detail-row';
      detailRow.style.display = 'none';
      const detailCell = document.createElement('td');
      detailCell.colSpan = 10;
      const inner = document.createElement('div');
      inner.className = 'admin-detail-inner';

      const fields = [
        ['Açıklama', l.description, 'admin-detail-desc'],
        ['İletişim', l.contact, null],
        ['Yazar E-posta', l.author_email, null],
        ['Yayın Tarihi', fmtDate(l.created_at), null],
        ['Bitiş Tarihi', l.expires_at ? fmtDate(l.expires_at) : 'Belirtilmemiş', null],
        ['Görüntülenme', String(l.view_count ?? 0), null],
      ];
      fields.forEach(([label, value, cls]) => {
        const wrap = document.createElement('div');
        wrap.className = `admin-detail-field${cls ? ' ' + cls : ''}`;
        const lbl = document.createElement('span');
        lbl.className = 'admin-detail-label'; lbl.textContent = label;
        const val = document.createElement('span');
        val.className = 'admin-detail-val'; val.textContent = value || '—';
        wrap.append(lbl, val); inner.appendChild(wrap);
      });

      detailCell.appendChild(inner);
      detailRow.appendChild(detailCell);
      tbody.appendChild(detailRow);

      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const open = detailRow.style.display !== 'none';
        detailRow.style.display = open ? 'none' : '';
        row.classList.toggle('admin-tr-expanded', !open);
      });
    });

    renderPagination('listings-pagination', page, data.total, 30, loadListings);
  }

  let listingsTimer;
  document.getElementById('listings-search')?.addEventListener('input', () => {
    clearTimeout(listingsTimer); listingsTimer = setTimeout(() => loadListings(1), 350);
  });
  document.getElementById('listings-category')?.addEventListener('change', () => loadListings(1));
  document.getElementById('listings-status')?.addEventListener('change',   () => loadListings(1));

  // ── Comments ──────────────────────────────────────────────────────────────
  let commentsPage = 1;

  const CAT_LABELS = {
    'ders-notu':'Ders Notu','staj':'Staj','yurt-kiralik-oda':'Yurt/Oda',
    'ikinci-el':'İkinci El','etkinlik':'Etkinlik','genel':'Genel',
  };

  async function loadComments(page = 1) {
    commentsPage = page;
    const search = (document.getElementById('comments-search')?.value ?? '').trim();
    const data = await api('GET', `/admin/comments?search=${encodeURIComponent(search)}&page=${page}&limit=30`);
    if (!data) return;

    const tbody = document.getElementById('comments-tbody');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!data.comments?.length) {
      tbody.appendChild(emptyRow(7, 'Yorum bulunamadı'));
      document.getElementById('comments-pagination')?.replaceChildren();
      return;
    }

    data.comments.forEach(c => {
      const row = tbody.insertRow();

      // Author cell — name + email
      const authorTd = document.createElement('td');
      const authorName = document.createElement('div');
      authorName.style.cssText = 'font-weight:700;color:#1e1b4b;font-size:.82rem;';
      authorName.textContent = c.author_name;
      const authorEmail = document.createElement('div');
      authorEmail.style.cssText = 'font-size:.72rem;color:#9ca3af;margin-top:.1rem;';
      authorEmail.textContent = c.author_email;
      authorTd.append(authorName, authorEmail);

      // Content cell — preview + expand
      const contentTd = document.createElement('td');
      contentTd.className = 'admin-td-content';
      contentTd.style.maxWidth = '220px';

      const preview = document.createElement('div');
      preview.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem;color:#374151;';
      preview.textContent = c.content;

      const full = document.createElement('div');
      full.style.cssText = 'display:none;white-space:pre-wrap;font-size:.8rem;color:#4b5563;line-height:1.5;padding:.375rem .5rem;background:#f5f3ff;border-radius:6px;margin-top:.375rem;max-height:120px;overflow-y:auto;';
      full.textContent = c.content;

      preview.style.cursor = 'pointer';
      preview.title = 'Tıkla: tam içeriği gör';
      preview.addEventListener('click', e => {
        e.stopPropagation();
        const showing = full.style.display !== 'none';
        full.style.display = showing ? 'none' : '';
        preview.style.whiteSpace = showing ? 'nowrap' : 'normal';
      });

      contentTd.append(preview, full);

      // Listing cell — title + category badge
      const listingTd = document.createElement('td');
      const listingTitle = document.createElement('div');
      listingTitle.style.cssText = 'font-size:.82rem;font-weight:600;color:#1e1b4b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;';
      listingTitle.textContent = c.listing_title;

      if (c.listing_category) {
        const catBadge = chip(CAT_LABELS[c.listing_category] || c.listing_category, 'cat');
        catBadge.style.marginTop = '.2rem';
        catBadge.style.display = 'block';
        catBadge.style.fontSize = '.65rem';
        listingTd.append(listingTitle, catBadge);
      } else {
        listingTd.appendChild(listingTitle);
      }

      // Reply indicator
      const replyTd = document.createElement('td');
      if (c.parent_id) {
        const badge = chip('Yanıt', 'warn');
        replyTd.appendChild(badge);
      } else {
        replyTd.textContent = '—';
        replyTd.style.color = '#d1d5db';
      }

      // Actions
      const actTd = document.createElement('td');
      actTd.className = 'admin-td-actions';
      const delBtn = mkBtn('Sil', 'danger');
      delBtn.addEventListener('click', async () => {
        const ok = await confirmDialog('Bu yorumu kalıcı silmek istediğinize emin misiniz?');
        if (!ok) return;
        await doAction(delBtn, async () => {
          const res = await api('DELETE', `/admin/comments/${c.id}`);
          if (res) { toast('Yorum silindi ✓'); loadComments(commentsPage); loadStats(); }
        });
      });
      actTd.appendChild(delBtn);

      row.append(
        td(c.id, 'admin-td-id'),
        contentTd,
        authorTd,
        listingTd,
        replyTd,
        td(timeAgo(c.created_at)),
        actTd,
      );
    });

    renderPagination('comments-pagination', page, data.total, 30, loadComments);
  }

  let commentsTimer;
  document.getElementById('comments-search')?.addEventListener('input', () => {
    clearTimeout(commentsTimer); commentsTimer = setTimeout(() => loadComments(1), 350);
  });
})();
