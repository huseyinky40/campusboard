// Redirect to login if not authenticated
if (!sessionStorage.getItem('cb_token')) {
  window.location.href = '/login';
}

// ── Form custom select helpers ─────────────────────────
const FSEL_LABELS = {
  category: { '': 'Seçin...', 'ders-notu': 'Ders Notu', 'etkinlik': 'Etkinlik', 'staj': 'Staj', 'ikinci-el': 'İkinci El', 'kayip-bulundu': 'Kayıp/Bulundu', 'genel': 'Genel' },
  faculty:  { '': 'Seçin...', 'muhendislik': 'Mühendislik', 'tip': 'Tıp', 'hukuk': 'Hukuk', 'iktisat': 'İktisat', 'egitim': 'Eğitim', 'fen-edebiyat': 'Fen-Edebiyat', 'guzel-sanatlar': 'Güzel Sanatlar', 'iletisim': 'İletişim', 'diger': 'Diğer' },
};

function setFsel(name, val) {
  const nativeSelect = document.getElementById(`form-${name}`);
  if (nativeSelect) nativeSelect.value = val;
  const valEl = document.getElementById(`fsel-${name}-val`);
  if (valEl) {
    valEl.textContent = (FSEL_LABELS[name] && FSEL_LABELS[name][val]) || val || 'Seçin...';
    valEl.classList.toggle('fsel-value--placeholder', !val);
  }
  const dd = document.getElementById(`fsel-${name}-dd`);
  if (dd) dd.querySelectorAll('.fsel-option').forEach(opt => {
    const selected = opt.dataset.value === val;
    opt.classList.toggle('selected', selected);
    opt.setAttribute('aria-selected', String(selected));
  });
}

function initFsel(name, nativeId) {
  const trigger = document.getElementById(`fsel-${name}-btn`);
  const dropdown = document.getElementById(`fsel-${name}-dd`);
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    trigger.classList.toggle('open', isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  dropdown.addEventListener('click', e => {
    const opt = e.target.closest('.fsel-option');
    if (!opt) return;
    setFsel(name, opt.dataset.value);
    dropdown.classList.remove('open');
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', e => {
    if (!trigger.closest('.fsel-wrap').contains(e.target)) {
      dropdown.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  // init placeholder state
  setFsel(name, '');
}

// ── Custom confirm dialog ─────────────────────────────
function showConfirm({ title, message, okLabel = 'Onayla', variant = 'danger' }) {
  return new Promise(resolve => {
    const overlay  = document.getElementById('confirm-overlay');
    const titleEl  = document.getElementById('confirm-title');
    const msgEl    = document.getElementById('confirm-message');
    const okBtn    = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const iconWrap = document.getElementById('confirm-icon-wrap');
    const iconSvg  = document.getElementById('confirm-icon-svg');

    titleEl.textContent  = title;
    msgEl.textContent    = message;
    okBtn.textContent    = okLabel;

    iconWrap.className = `confirm-icon-wrap confirm-icon-wrap--${variant}`;
    const okExtra = variant === 'warning' ? ' confirm-btn--ok--warning'
                  : variant === 'success' ? ' confirm-btn--ok--success'
                  : '';
    okBtn.className = `confirm-btn confirm-btn--ok${okExtra}`;

    if (variant === 'danger') {
      iconSvg.innerHTML = '<path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (variant === 'warning') {
      iconSvg.innerHTML = '<path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>';
    } else {
      iconSvg.innerHTML = '<path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    overlay.classList.add('confirm-open');

    function finish(result) {
      overlay.classList.remove('confirm-open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    const onOk      = () => finish(true);
    const onCancel  = () => finish(false);
    const onOverlay = e => { if (e.target === overlay) finish(false); };
    const onKey     = e => { if (e.key === 'Escape') finish(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    setTimeout(() => okBtn.focus(), 50);
  });
}

const App = (() => {
  const state = {
    filters: { category: '', faculty: '', status: '', search: '' },
    page: 1,
    totalPages: 1,
    sort: 'default',
  };

  let _formReturnToMLD = false;

  function closeFormAndReturn() {
    UI.closeForm();
    if (_formReturnToMLD) {
      _formReturnToMLD = false;
      MLD.open();
    }
  }

  // ── Auth ──────────────────────────────────────────
  function initUser() {
    try {
      const raw = sessionStorage.getItem('cb_user') || '{}';
      const user = JSON.parse(raw);
      document.getElementById('user-name').textContent = user.name || '';
      const avatarEl = document.getElementById('header-avatar');
      if (avatarEl) avatarEl.innerHTML = avatarHTML(user.name, user.avatar, 28);
    } catch {}
  }

  function logout() {
    sessionStorage.removeItem('cb_token');
    sessionStorage.removeItem('cb_user');
    window.location.href = '/login';
  }

  // ── Load & render ─────────────────────────────────
  function sortListings(listings) {
    const rank = s => s === 'aktif' ? 0 : 1;
    const byStatus = (a, b) => rank(a.status) - rank(b.status);
    const getDeadline = l => l.expires_at ? new Date(l.expires_at).getTime() : Number.MAX_SAFE_INTEGER;

    return [...listings].sort((a, b) => {
      const statusOrder = byStatus(a, b);
      if (statusOrder !== 0) return statusOrder;

      if (state.sort === 'deadline') return getDeadline(a) - getDeadline(b);
      if (state.sort === 'popular') return (Number(b.view_count) || 0) - (Number(a.view_count) || 0);
      if (state.sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'tr');
      return b.id - a.id;
    });
  }

  async function loadListingsSummary(filters) {
    try {
      return await Api.getListingsSummary(filters);
    } catch {
      const all = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await Api.getListings({ ...filters, page, limit: 50 });
        if (!res) break;
        all.push(...(res.data || []));
        totalPages = res.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      return {
        total: all.length,
        endingSoon: all.filter(l => {
          if (l.status !== 'aktif' || !l.expires_at) return false;
          const expires = new Date(l.expires_at);
          expires.setHours(0, 0, 0, 0);
          return expires >= today && expires <= weekEnd;
        }).length,
        closed: all.filter(l => l.status === 'kapandi').length,
      };
    }
  }

  async function loadListings(resetPage = false) {
    if (resetPage) state.page = 1;
    const grid = document.getElementById('listings-grid');
    grid?.classList.add('listings-grid--transitioning');
    try {
      const [res, summary] = await Promise.all([
        Api.getListings({ ...state.filters, page: state.page }),
        loadListingsSummary(state.filters),
      ]);
      if (!res) {
        grid?.classList.remove('listings-grid--transitioning');
        return;
      }
      state.totalPages = res.totalPages || 1;

      const sorted = sortListings(res.data);
      UI.renderOverview(sorted, summary || { total: res.total });
      UI.renderGrid(sorted);
      UI.renderPagination(state.page, state.totalPages, res.total);
      setTimeout(() => {
        requestAnimationFrame(() => grid?.classList.remove('listings-grid--transitioning'));
      }, 120);
    } catch {
      grid?.classList.remove('listings-grid--transitioning');
      UI.toast('İlanlar yüklenemedi', 'error');
    }
  }

  // ── Detail ────────────────────────────────────────
  async function openDetail(id) {
    try {
      const res = await Api.getListing(id);
      if (!res) return;
      UI.showDetail(res.data);
    } catch {
      UI.toast('İlan yüklenemedi', 'error');
    }
  }

  // ── Form submit ───────────────────────────────────
  async function handleFormSubmit(e) {
    e.preventDefault();
    const data = UI.getFormData();
    const errors = UI.validateForm(data);
    if (errors.length > 0) { UI.showFormErrors(errors); return; }

    const id = document.getElementById('form-id').value;
    try {
      if (id) {
        await Api.updateListing(Number(id), data);
        UI.toast('İlan güncellendi', 'success');
      } else {
        await Api.createListing(data);
        UI.toast('İlan yayınlandı', 'success');
      }
      closeFormAndReturn();
      loadListings();
    } catch (err) {
      const errors = err?.data?.errors;
      if (errors) UI.showFormErrors(errors);
      else UI.toast('Bir hata oluştu', 'error');
    }
  }


  // ── Profile ───────────────────────────────────────
  let _pendingAvatar = undefined; // undefined = unchanged, null = remove, string = new base64

  async function openProfile() {
    try {
      const res = await Api.getProfile();
      if (!res) return;
      const p = res.data;
      _pendingAvatar = undefined;

      document.getElementById('profile-name').value       = p.name || '';
      document.getElementById('profile-email').value      = p.email || '';
      document.getElementById('profile-faculty').value    = p.faculty || '';
      if (window._syncPfacetFaculty) window._syncPfacetFaculty(p.faculty || '');
      document.getElementById('profile-department').value = p.department || '';
      document.getElementById('profile-student-no').value = p.student_no || '';
      document.getElementById('profile-phone').value      = p.phone || '';
      document.getElementById('err-profile-name').textContent = '';

      const preview = document.getElementById('profile-avatar-preview');
      preview.innerHTML = avatarHTML(p.name, p.avatar, 80);

      const displayName = document.getElementById('pmodal-display-name');
      if (displayName) displayName.textContent = p.name || '';

      document.getElementById('modal-profile').classList.remove('hidden');
    } catch {
      UI.toast('Profil yüklenemedi', 'error');
    }
  }

  function closeProfile() {
    document.getElementById('modal-profile').classList.add('hidden');
    _pendingAvatar = undefined;
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    document.getElementById('err-profile-name').textContent = '';
    if (name.length < 2) {
      document.getElementById('err-profile-name').textContent = 'İsim en az 2 karakter olmalıdır';
      return;
    }

    const btn = document.getElementById('btn-profile-submit');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';

    const payload = {
      name,
      faculty:    document.getElementById('profile-faculty').value,
      department: document.getElementById('profile-department').value.trim(),
      student_no: document.getElementById('profile-student-no').value.trim(),
      phone:      document.getElementById('profile-phone').value.trim(),
    };
    if (_pendingAvatar !== undefined) payload.avatar = _pendingAvatar;

    try {
      const res = await Api.updateProfile(payload);
      const updated = res.data;
      sessionStorage.setItem('cb_user', JSON.stringify(updated));
      initUser();
      closeProfile();
      UI.toast('Profil güncellendi', 'success');
    } catch (err) {
      const errors = err?.data?.errors;
      if (errors) document.getElementById('err-profile-name').textContent = errors[0];
      else UI.toast('Güncelleme başarısız', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Kaydet';
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  // ── Favorite toggle ───────────────────────────────
  async function toggleFavorite(listingId, btn, isDetailBtn = false) {
    try {
      const res = await Api.toggleFavorite(listingId);
      const isFav = res.favorited;

      // Update all card heart buttons for this listing
      document.querySelectorAll(`.card-fav-btn[data-fav-id="${listingId}"]`).forEach(b => {
        b.classList.toggle('card-fav-btn--active', isFav);
        b.setAttribute('aria-pressed', String(isFav));
        b.setAttribute('title', isFav ? 'Favorilerden çıkar' : 'Favorilere ekle');
        b.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
      });

      // Update detail modal button if open
      const detailFavBtn = document.getElementById('detail-fav-btn');
      if (detailFavBtn && Number(detailFavBtn.dataset.favId) === listingId) {
        detailFavBtn.className = `detail-fav-btn${isFav ? ' detail-fav-btn--active' : ''}`;
        detailFavBtn.setAttribute('aria-pressed', String(isFav));
        detailFavBtn.setAttribute('title', isFav ? 'Favorilerden çıkar' : 'Favorilere ekle');
        detailFavBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
      }

      UI.toast(isFav ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', isFav ? 'success' : 'error');
    } catch {
      UI.toast('İşlem başarısız', 'error');
    }
  }

  // ── Favorites Drawer ──────────────────────────────
  const FAV = (() => {
    let _allFavorites = [];
    let _searchVal    = '';

    const CATEGORY_LABELS_FAV = {
      'ders-notu':'Ders Notu','etkinlik':'Etkinlik','staj':'Staj',
      'ikinci-el':'İkinci El','kayip-bulundu':'Kayıp/Bulundu','genel':'Genel',
    };

    function _filtered() {
      if (!_searchVal) return _allFavorites;
      return _allFavorites.filter(l =>
        l.title.toLowerCase().includes(_searchVal) ||
        (l.description || '').toLowerCase().includes(_searchVal)
      );
    }

    function _renderList() {
      const list    = document.getElementById('fav-list');
      const empty   = document.getElementById('fav-empty');
      const loading = document.getElementById('fav-loading');
      const countEl = document.getElementById('fav-count');
      const items   = _filtered();

      loading.classList.add('hidden');
      list.innerHTML = '';

      if (items.length === 0) {
        empty.classList.remove('hidden');
        countEl.textContent = '0 favori';
        return;
      }
      empty.classList.add('hidden');
      countEl.textContent = `${items.length} favori`;

      items.forEach(l => {
        const catLabel = CATEGORY_LABELS_FAV[l.category] || l.category;
        const dateStr  = new Date(l.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'short', year: 'numeric',
        });

        const el = document.createElement('div');
        el.className  = `mld-item mld-item--${l.status}`;
        el.dataset.id = l.id;
        el.innerHTML  = `
          <div class="mld-item-indicator mld-item-indicator--${l.status}"></div>
          <div class="mld-item-body">
            <span class="mld-item-title" title="${escHtml(l.title)}">${escHtml(l.title)}</span>
            <div class="mld-item-meta">
              <span class="mld-item-cat">${escHtml(catLabel)}</span>
              <span class="mld-item-sep">·</span>
              <span class="mld-item-date">${escHtml(dateStr)}</span>
            </div>
          </div>
          <div class="mld-item-actions">
            <button class="mld-action-btn" data-action="view" title="Görüntüle" aria-label="Görüntüle">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
            <button class="mld-action-btn mld-action-btn--danger" data-action="remove" title="Favorilerden çıkar" aria-label="Favorilerden çıkar">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3.17 3.5 3.5 0 0114 5.5c0 4-6 8-6 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="1" y1="15" x2="15" y2="1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>`;

        el.querySelectorAll('.mld-action-btn').forEach(btn => {
          btn.addEventListener('click', async e => {
            e.stopPropagation();
            if (btn.dataset.action === 'view') {
              close();
              await App.openDetail(l.id);
            } else if (btn.dataset.action === 'remove') {
              try {
                await Api.toggleFavorite(l.id);
                UI.toast('Favorilerden çıkarıldı', 'error');
                // Update card heart if visible
                document.querySelectorAll(`.card-fav-btn[data-fav-id="${l.id}"]`).forEach(b => {
                  b.classList.remove('card-fav-btn--active');
                  b.setAttribute('aria-pressed', 'false');
                  b.setAttribute('title', 'Favorilere ekle');
                  b.querySelector('svg').setAttribute('fill', 'none');
                });
                await _load();
              } catch { UI.toast('İşlem başarısız', 'error'); }
            }
          });
        });

        list.appendChild(el);
      });
    }

    async function _load() {
      const loading = document.getElementById('fav-loading');
      const list    = document.getElementById('fav-list');
      const empty   = document.getElementById('fav-empty');
      loading.classList.remove('hidden');
      list.innerHTML = '';
      empty.classList.add('hidden');
      try {
        const res = await Api.getFavorites();
        if (!res) return;
        _allFavorites = res.data || [];
        document.getElementById('fav-count').textContent = `${_allFavorites.length} favori`;
        _renderList();
      } catch {
        loading.classList.add('hidden');
        UI.toast('Favoriler yüklenemedi', 'error');
      }
    }

    function open() {
      document.getElementById('modal-favorites').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      _searchVal = '';
      document.getElementById('fav-search').value = '';
      _load();
    }

    function close() {
      document.getElementById('modal-favorites').classList.add('hidden');
      document.body.style.overflow = '';
    }

    function init() {
      document.getElementById('fav-close').addEventListener('click', close);
      document.getElementById('modal-favorites').addEventListener('click', e => {
        if (e.target.id === 'modal-favorites') close();
      });
      document.getElementById('fav-search').addEventListener('input', debounce(e => {
        _searchVal = e.target.value.toLowerCase();
        _renderList();
      }, 200));
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !document.getElementById('modal-favorites').classList.contains('hidden')) {
          close();
        }
      });
    }

    return { open, close, init };
  })();

  // ── My Listings Drawer ────────────────────────────
  const MLD = (() => {
    let _allListings = [];
    let _searchVal   = '';
    let _statusVal   = '';

    function _setMldFilter(val) {
      _statusVal = val;
      const labels = { '': 'Tümü', 'aktif': 'Aktif', 'kapandi': 'Kapandı' };
      const valueEl = document.getElementById('mld-filter-value');
      if (valueEl) valueEl.textContent = labels[val] || 'Tümü';
      const dropdown = document.getElementById('mld-filter-dropdown');
      if (dropdown) dropdown.querySelectorAll('.mld-filter-option').forEach(opt => {
        const isSelected = opt.dataset.value === val;
        opt.classList.toggle('selected', isSelected);
        opt.setAttribute('aria-selected', String(isSelected));
      });
      const trigger = document.getElementById('mld-filter-trigger');
      if (trigger) { trigger.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
      if (dropdown) dropdown.classList.remove('open');
    }

    function _daysUntilDeletion(closedAt) {
      if (!closedAt) return null;
      const elapsed = (Date.now() - new Date(closedAt.replace(' ', 'T')).getTime()) / 86400000;
      return Math.max(0, Math.ceil(30 - elapsed));
    }

    const CATEGORY_LABELS = {
      'ders-notu':'Ders Notu','etkinlik':'Etkinlik','staj':'Staj',
      'ikinci-el':'İkinci El','kayip-bulundu':'Kayıp/Bulundu','genel':'Genel',
    };

    function _filtered() {
      return _allListings.filter(l => {
        const matchSearch = !_searchVal ||
          l.title.toLowerCase().includes(_searchVal) ||
          (l.description || '').toLowerCase().includes(_searchVal);
        const matchStatus = !_statusVal || l.status === _statusVal;
        return matchSearch && matchStatus;
      });
    }

    function _renderList() {
      const list    = document.getElementById('mld-list');
      const empty   = document.getElementById('mld-empty');
      const loading = document.getElementById('mld-loading');
      const countEl = document.getElementById('mld-count');
      const items   = _filtered();

      loading.classList.add('hidden');
      list.innerHTML = '';

      if (items.length === 0) {
        empty.classList.remove('hidden');
        countEl.textContent = '0 ilan';
        return;
      }
      empty.classList.add('hidden');
      countEl.textContent = `${items.length} ilan`;

      items.forEach(l => {
        const isAktif   = l.status === 'aktif';
        const catLabel  = CATEGORY_LABELS[l.category] || l.category;
        const dateStr   = new Date(l.created_at).toLocaleDateString('tr-TR', {
          day:'numeric', month:'short', year:'numeric'
        });

        let deleteCdInline = '';
        if (!isAktif) {
          const days = _daysUntilDeletion(l.closed_at);
          if (days !== null) {
            let mod, text;
            if      (days <= 0) { mod = 'urgent'; text = 'Yakında silinecek'; }
            else if (days <= 3) { mod = 'urgent'; text = `Son ${days} gün`; }
            else if (days <= 7) { mod = 'warn';   text = `${days} gün sonra silinecek`; }
            else                { mod = 'muted';  text = `${days} gün sonra silinecek`; }
            deleteCdInline = `
              <span class="mld-item-sep">·</span>
              <span class="mld-delete-cd mld-delete-cd--${mod}">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                ${text}
              </span>`;
          }
        }

        const parsedC = parseContacts(l.contact || '').filter(c => c.value);
        const contactsHTML = parsedC.map(c =>
          `<span class="mld-contact-entry">${contactIconSVG(c.type, 12)}<span>${escHtml(c.value)}</span></span>`
        ).join('');

        const el = document.createElement('div');
        el.className  = `mld-item mld-item--${l.status}`;
        el.dataset.id = l.id;
        el.innerHTML  = `
          <div class="mld-item-indicator mld-item-indicator--${l.status}"></div>
          <div class="mld-item-body">
            <span class="mld-item-title" title="${escHtml(l.title)}">${escHtml(l.title)}</span>
            <div class="mld-item-meta">
              <span class="mld-item-cat">${escHtml(catLabel)}</span>
              <span class="mld-item-sep">·</span>
              <span class="mld-item-date">${escHtml(dateStr)}</span>
              ${deleteCdInline}
            </div>
            <div class="mld-item-contact mld-contact--closed">
              ${contactsHTML}
            </div>
          </div>
          <div class="mld-item-actions">
            <button class="mld-action-btn" data-action="edit" title="Düzenle" aria-label="Düzenle">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
            </button>
            <button class="mld-action-btn ${isAktif ? 'mld-action-btn--close' : 'mld-action-btn--reopen'}"
              data-action="toggle" title="${isAktif ? 'İlanı Kapat' : 'Yeniden Aç'}" aria-label="${isAktif ? 'İlanı Kapat' : 'Yeniden Aç'}">
              ${isAktif
                ? '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3" y="6" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 6V4a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
                : '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
              }
            </button>
            <button class="mld-action-btn mld-action-btn--danger" data-action="delete" title="Sil" aria-label="Sil">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 4l1 10h8l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>`;

        // Action delegation
        el.querySelectorAll('.mld-action-btn').forEach(btn => {
          btn.addEventListener('click', async e => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id     = l.id;

            if (action === 'edit') {
              try {
                const res = await Api.getListing(id);
                if (!res) return;
                _formReturnToMLD = true;
                close();
                UI.openForm(res.data);
              } catch { UI.toast('İlan yüklenemedi', 'error'); }

            } else if (action === 'toggle') {
              const next = l.status === 'aktif' ? 'kapandi' : 'aktif';
              if (next === 'kapandi') {
                const ok = await showConfirm({
                  title: 'İlanı Yayından Kaldır',
                  message: 'Kapatılan ilanlar 30 gün boyunca "Kapandı" listesinde görünür ve bu süre içinde tekrar açılabilir. 30 gün sonra kalıcı olarak silinir.',
                  okLabel: 'Yayından Kaldır',
                  variant: 'warning',
                });
                if (!ok) return;
              } else {
                const ok = await showConfirm({
                  title: 'İlanı Yeniden Yayınla',
                  message: 'İlan tekrar aktif duruma geçecek ve tüm kullanıcılara görünür hale gelecek.',
                  okLabel: 'Yayınla',
                  variant: 'success',
                });
                if (!ok) return;
              }
              try {
                await Api.updateStatus(id, next);
                UI.toast(next === 'kapandi' ? 'İlan yayından kaldırıldı' : 'İlan yeniden açıldı', next === 'kapandi' ? 'error' : 'success');
                loadListings();
                await _load();
              } catch { UI.toast('Durum güncellenemedi', 'error'); }

            } else if (action === 'delete') {
              const ok = await showConfirm({
                title: 'İlanı Sil',
                message: 'Bu ilanı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                okLabel: 'Sil',
                variant: 'danger',
              });
              if (!ok) return;
              try {
                await Api.deleteListing(id);
                UI.toast('İlan silindi', 'error');
                loadListings();
                await _load();
              } catch { UI.toast('Silme işlemi başarısız', 'error'); }
            }
          });
        });

        // Toggle contact on body click
        el.querySelector('.mld-item-body').addEventListener('click', () => {
          el.querySelector('.mld-item-contact').classList.toggle('mld-contact--closed');
        });

        list.appendChild(el);
      });
    }

    async function _load() {
      const loading = document.getElementById('mld-loading');
      const list    = document.getElementById('mld-list');
      const empty   = document.getElementById('mld-empty');
      loading.classList.remove('hidden');
      list.innerHTML = '';
      empty.classList.add('hidden');

      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await Api.getListings({ mine: true, limit: 50, page });
          if (!res) return;
          all.push(...(res.data || []));
          totalPages = res.totalPages || 1;
          page += 1;
        } while (page <= totalPages);

        _allListings = all;
        document.getElementById('mld-count').textContent = `${_allListings.length} ilan`;
        _renderList();
      } catch {
        loading.classList.add('hidden');
        UI.toast('İlanlar yüklenemedi', 'error');
      }
    }

    function open() {
      const overlay = document.getElementById('modal-my-listings');
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      _searchVal = '';
      _statusVal = '';
      document.getElementById('mld-search').value = '';
      _setMldFilter('');
      _load();
    }

    function close() {
      document.getElementById('modal-my-listings').classList.add('hidden');
      document.body.style.overflow = '';
    }

    function init() {
      document.getElementById('mld-close').addEventListener('click', close);

      // Close on overlay background click
      document.getElementById('modal-my-listings').addEventListener('click', e => {
        if (e.target.id === 'modal-my-listings') close();
      });

      document.getElementById('mld-search').addEventListener('input', debounce(e => {
        _searchVal = e.target.value.toLowerCase();
        _renderList();
      }, 200));

      // Custom status filter dropdown
      const filterTrigger = document.getElementById('mld-filter-trigger');
      const filterDropdown = document.getElementById('mld-filter-dropdown');

      filterTrigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = filterDropdown.classList.toggle('open');
        filterTrigger.setAttribute('aria-expanded', isOpen);
        filterTrigger.classList.toggle('open', isOpen);
      });

      filterDropdown.addEventListener('click', e => {
        const opt = e.target.closest('.mld-filter-option');
        if (!opt) return;
        _setMldFilter(opt.dataset.value);
        filterDropdown.classList.remove('open');
        filterTrigger.setAttribute('aria-expanded', 'false');
        filterTrigger.classList.remove('open');
        _renderList();
      });

      document.addEventListener('click', e => {
        if (!document.getElementById('mld-filter-wrap').contains(e.target)) {
          filterDropdown.classList.remove('open');
          filterTrigger.setAttribute('aria-expanded', 'false');
          filterTrigger.classList.remove('open');
        }
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !document.getElementById('modal-my-listings').classList.contains('hidden')) {
          close();
        }
      });
    }

    return { open, close, init };
  })();

  // ── Init ──────────────────────────────────────────
  function init() {
    initUser();
    loadListings();
    FAV.init();
    MLD.init();

    // User menu dropdown
    const menuTrigger  = document.getElementById('user-menu-trigger');
    const userDropdown = document.getElementById('user-dropdown');
    menuTrigger.addEventListener('click', e => {
      e.stopPropagation();
      const open = userDropdown.classList.toggle('open');
      menuTrigger.classList.toggle('open', open);
      menuTrigger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', () => {
      userDropdown.classList.remove('open');
      menuTrigger.classList.remove('open');
      menuTrigger.setAttribute('aria-expanded', false);
    });

    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-new').addEventListener('click', () => UI.openForm());

    // Favorites drawer
    document.getElementById('btn-favorites').addEventListener('click', () => FAV.open());

    // My Listings drawer
    document.getElementById('btn-my-listings').addEventListener('click', () => {
      MLD.open();
    });

    // Profile modal
    document.getElementById('btn-profile').addEventListener('click', () => {
      userDropdown.classList.remove('open');
      menuTrigger.classList.remove('open');
      menuTrigger.setAttribute('aria-expanded', false);
      openProfile();
    });
    document.getElementById('modal-profile-close').addEventListener('click', closeProfile);
    document.getElementById('btn-profile-cancel').addEventListener('click', closeProfile);
    document.getElementById('modal-profile').addEventListener('click', e => {
      if (e.target.id === 'modal-profile') closeProfile();
    });
    document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);

    // Avatar upload
    document.getElementById('profile-avatar-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { UI.toast('Dosya 2 MB\'dan büyük olamaz', 'error'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        _pendingAvatar = ev.target.result;
        document.getElementById('profile-avatar-preview').innerHTML =
          `<img src="${_pendingAvatar}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;" />`;
      };
      reader.readAsDataURL(file);
    });
    // Phone mask: 5XX XXX XX XX
    document.getElementById('profile-phone').addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 10);
      if (v.length > 7)      v = v.slice(0,3)+' '+v.slice(3,6)+' '+v.slice(6,8)+' '+v.slice(8);
      else if (v.length > 6) v = v.slice(0,3)+' '+v.slice(3,6)+' '+v.slice(6);
      else if (v.length > 3) v = v.slice(0,3)+' '+v.slice(3);
      e.target.value = v;
    });

    document.getElementById('btn-remove-avatar').addEventListener('click', () => {
      _pendingAvatar = null;
      const user = JSON.parse(localStorage.getItem('cb_user') || '{}');
      document.getElementById('profile-avatar-preview').innerHTML = avatarHTML(user.name, null, 80);
      document.getElementById('profile-avatar-input').value = '';
    });

    document.getElementById('category-pills').addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filters.category = pill.dataset.category;
      loadListings(true);
    });

    document.getElementById('faculty-filter').addEventListener('change', e => {
      state.filters.faculty = e.target.value;
      loadListings(true);
    });

    document.getElementById('status-filter').addEventListener('change', e => {
      state.filters.status = e.target.value;
      loadListings(true);
    });

    document.getElementById('search-input').addEventListener('input', debounce(e => {
      state.filters.search = e.target.value;
      loadListings(true);
    }, 300));

    const sortSelect = document.getElementById('sort-select');
    const sortTrigger = document.getElementById('sort-trigger');
    const sortDropdown = document.getElementById('sort-dropdown');
    const sortValue = document.getElementById('sort-value');

    function setSort(value) {
      if (state.sort === value) {
        sortDropdown?.classList.remove('open');
        sortTrigger?.classList.remove('open');
        sortTrigger?.setAttribute('aria-expanded', 'false');
        return;
      }
      state.sort = value;
      if (sortSelect) sortSelect.value = value;
      sortDropdown?.querySelectorAll('.sort-option').forEach(opt => {
        const selected = opt.dataset.value === value;
        opt.classList.toggle('selected', selected);
        opt.setAttribute('aria-selected', String(selected));
        if (selected && sortValue) sortValue.textContent = opt.textContent;
      });
      sortDropdown?.classList.remove('open');
      sortTrigger?.classList.remove('open');
      sortTrigger?.setAttribute('aria-expanded', 'false');
      loadListings(false);
    }

    sortTrigger?.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = sortDropdown.classList.toggle('open');
      sortTrigger.classList.toggle('open', isOpen);
      sortTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    sortDropdown?.addEventListener('click', e => {
      const opt = e.target.closest('.sort-option');
      if (!opt) return;
      setSort(opt.dataset.value);
    });

    document.addEventListener('click', e => {
      if (!document.getElementById('sort-control')?.contains(e.target)) {
        sortDropdown?.classList.remove('open');
        sortTrigger?.classList.remove('open');
        sortTrigger?.setAttribute('aria-expanded', 'false');
      }
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (state.page > 1) { state.page--; loadListings(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (state.page < state.totalPages) { state.page++; loadListings(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    // Init form custom selects (fsel)
    initFsel('category', 'form-category');
    initFsel('faculty',  'form-faculty');

    document.getElementById('listing-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-form-cancel').addEventListener('click', closeFormAndReturn);
    document.getElementById('modal-form-close').addEventListener('click', closeFormAndReturn);
    document.getElementById('modal-detail-close').addEventListener('click', () => UI.closeDetail());

    document.getElementById('modal-form').addEventListener('click', e => {
      if (e.target.id === 'modal-form') closeFormAndReturn();
    });
    document.getElementById('modal-detail').addEventListener('click', e => {
      if (e.target.id === 'modal-detail') UI.closeDetail();
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      closeFormAndReturn();
      UI.closeDetail();
      closeProfile();
      MLD.close();
    });
  }

  return { init, openDetail, toggleFavorite, mld: MLD, fav: FAV };
})();

document.addEventListener('DOMContentLoaded', App.init);
