// ── Contact utilities ─────────────────────────────────

// Detects contact type from stored value string
function detectContactType(value) {
  if (!value) return 'email';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'email';
  if (/^[\d\s\+\-\(\)]{7,}$/.test(value.trim())) return 'phone';
  return 'other';
}

// Returns an SVG string for the given contact type
function contactIconSVG(type, size = 14) {
  const s = size;
  if (type === 'email')
    return `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 6l7 4 7-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  if (type === 'phone')
    return `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 2h3l1.5 3.5-2 1.2A9 9 0 009.3 10.5l1.2-2L14 10v3a1 1 0 01-1 1A12 12 0 012 3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

// Returns a mailto: or tel: href, or null
function contactHref(type, value) {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value.replace(/\s/g, '')}`;
  return null;
}

function parseContacts(str) {
  if (!str || !str.trim()) return [];
  return str.split('||').map(v => v.trim()).filter(Boolean).map(v => ({ type: detectContactType(v), value: v }));
}

function encodeContacts() {
  return [
    document.getElementById('form-contact-email')?.value.trim() || '',
    document.getElementById('form-contact-phone')?.value.trim() || '',
    document.getElementById('form-contact-other')?.value.trim() || '',
  ].filter(Boolean).join('||');
}

const CATEGORY_LABELS = {
  'ders-notu':     'Ders Notu',
  'etkinlik':      'Etkinlik',
  'staj':          'Staj',
  'ikinci-el':     'İkinci El',
  'kayip-bulundu': 'Kayıp/Bulundu',
  'genel':         'Genel',
};

const FACULTY_LABELS = {
  'muhendislik':    'Mühendislik',
  'tip':            'Tıp',
  'hukuk':          'Hukuk',
  'iktisat':        'İktisat',
  'egitim':         'Eğitim',
  'fen-edebiyat':   'Fen-Edebiyat',
  'guzel-sanatlar': 'Güzel Sanatlar',
  'iletisim':       'İletişim',
  'diger':          'Diğer',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = Math.ceil((new Date(expiresAt) - new Date()) / 86400000);
  return diff;
}

function formatDateForInput(value) {
  if (!value) return '';
  const iso = String(value).slice(0, 10);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function normalizeDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
}

const _ICON_CAL = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const _ICON_CLK = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function expiryBadgeHTML(l) {
  if (l.status !== 'aktif' || !l.expires_at) return '';
  const days = daysLeft(l.expires_at);
  if (days === null) return '';

  let mod, icon, text;
  if (days < 0) {
    mod = 'card-expiry--muted';  icon = _ICON_CLK; text = 'Süresi doldu';
  } else if (days === 0) {
    mod = 'card-expiry--urgent'; icon = _ICON_CLK; text = 'Bugün son gün';
  } else if (days <= 3) {
    mod = 'card-expiry--urgent'; icon = _ICON_CLK; text = `Son ${days} gün`;
  } else if (days <= 7) {
    mod = 'card-expiry--warn';   icon = _ICON_CAL; text = `${days} gün kaldı`;
  } else {
    mod = 'card-expiry--ok';     icon = _ICON_CAL; text = `${formatDate(l.expires_at)}'e kadar`;
  }

  return `<div class="card-expiry ${mod}">${icon}${text}</div>`;
}


const _ICON_PERSON = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const _ICON_CAL2  = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const _ICON_CLK2  = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const _ICON_TAG   = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>`;
const _ICON_UNI   = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0"><path d="M8 1l7 4-7 4-7-4 7-4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M3 7v4c0 1.105 2.239 2 5 2s5-.895 5-2V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

function detailMetaHTML(listing) {
  const days = listing.expires_at ? daysLeft(listing.expires_at) : null;
  let remainMod = '', remainText = '';
  if (days !== null) {
    if      (days < 0)   { remainMod = 'muted';  remainText = 'Süresi doldu'; }
    else if (days === 0) { remainMod = 'urgent'; remainText = 'Bugün son gün'; }
    else if (days <= 3)  { remainMod = 'urgent'; remainText = `Son ${days} gün`; }
    else if (days <= 7)  { remainMod = 'warn';   remainText = `${days} gün kaldı`; }
    else                 { remainMod = 'ok';      remainText = `${days} gün kaldı`; }
  }

  const statusAktif = listing.status === 'aktif';
  const statusVal = `<span class="dmeta-status-dot dmeta-dot--${listing.status}"></span>${statusAktif ? 'Aktif' : 'Kapandı'}`;

  // Durum + Bitiş on same row if expires_at exists, otherwise Durum spans full width
  const statusRow = listing.expires_at
    ? `<div class="dmeta-item">
        <span class="dmeta-label">Durum</span>
        <span class="dmeta-value dmeta-status--${listing.status}">${statusVal}</span>
      </div>
      <div class="dmeta-item">
        <span class="dmeta-label">${_ICON_CAL2}Bitiş</span>
        <span class="dmeta-value">${formatDate(listing.expires_at)}</span>
      </div>`
    : `<div class="dmeta-item dmeta-item--full">
        <span class="dmeta-label">Durum</span>
        <span class="dmeta-value dmeta-status--${listing.status}">${statusVal}</span>
      </div>`;

  const remainRow = (listing.expires_at && remainText)
    ? `<div class="dmeta-item dmeta-item--full">
        <span class="dmeta-label">${_ICON_CLK2}Kalan Süre</span>
        <span class="dmeta-value dmeta-remaining--${remainMod}">${remainText}</span>
      </div>`
    : '';

  return `
    <div class="dmeta-grid">
      <div class="dmeta-item">
        <span class="dmeta-label">${_ICON_PERSON}İlan Sahibi</span>
        <span class="dmeta-value">${escHtml(listing.author_name || '—')}</span>
      </div>
      <div class="dmeta-item">
        <span class="dmeta-label">${_ICON_CAL2}Yayın Tarihi</span>
        <span class="dmeta-value">${formatDate(listing.created_at)}</span>
      </div>
      <div class="dmeta-item">
        <span class="dmeta-label">${_ICON_UNI}Fakülte</span>
        <span class="dmeta-value">${FACULTY_LABELS[listing.faculty] || listing.faculty || '—'}</span>
      </div>
      <div class="dmeta-item">
        <span class="dmeta-label">${_ICON_TAG}Kategori</span>
        <span class="dmeta-value">${CATEGORY_LABELS[listing.category] || listing.category || '—'}</span>
      </div>
      ${statusRow}
      ${remainRow}
    </div>
    <div class="dmeta-views-row">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
      <span class="dmeta-views-val">${listing.view_count || 0} görüntülenme</span>
    </div>`;
}

function avatarHTML(name, src, size = 24) {
  if (src) {
    return `<img src="${src}" class="avatar" width="${size}" height="${size}" alt="${escHtml(name)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`;
  }
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `<span class="avatar avatar-initials" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px;background:hsl(${hue},55%,55%);" aria-hidden="true">${initials}</span>`;
}

const UI = {
  // ── Grid ──────────────────────────────────────────
  renderPagination(page, totalPages, total) {
    const bar     = document.getElementById('pagination-bar');
    const info    = document.getElementById('pagination-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (totalPages <= 1) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    info.textContent  = `${page} / ${totalPages} sayfa · ${total} ilan`;
    btnPrev.disabled  = page <= 1;
    btnNext.disabled  = page >= totalPages;
  },

  renderOverview(listings, summary = {}) {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('stat-total', summary.total ?? listings.length);
    setText('stat-shown', listings.length);
    setText('stat-soon', summary.endingSoon ?? 0);
    setText('stat-closed', summary.closed ?? 0);
  },

  renderGrid(listings) {
    const grid  = document.getElementById('listings-grid');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('results-count');
    const context = document.getElementById('results-context');

    if (count) count.textContent = `${listings.length} ilan`;
    if (context) context.textContent = listings.length ? 'Mevcut sayfada gösteriliyor' : 'Filtreleri değiştirerek tekrar dene';

    if (listings.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = listings.map(l => this.cardHTML(l)).join('');

    grid.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => App.openDetail(Number(card.dataset.id)));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          App.openDetail(Number(card.dataset.id));
        }
      });
    });

    grid.querySelectorAll('.card-fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        App.toggleFavorite(Number(btn.dataset.favId), btn);
      });
    });
  },

  cardHTML(l) {
    const favActive = l.is_favorited ? 'card-fav-btn--active' : '';
    const favTitle  = l.is_favorited ? 'Favorilerden çıkar' : 'Favorilere ekle';
    return `
      <div class="card ${l.status}${l.image ? ' card--has-img' : ''}" data-id="${l.id}" tabindex="0" role="button" aria-label="${escHtml(l.title)}">
        ${l.image ? `<div class="card-img"><img src="${escHtml(l.image)}" alt="" loading="lazy" decoding="async"></div>` : ''}
        <div class="card-top">
          <div class="card-badges">
            <span class="badge badge-${l.category}">${CATEGORY_LABELS[l.category] || l.category}</span>
            <span class="badge badge-faculty">${FACULTY_LABELS[l.faculty] || l.faculty}</span>
          </div>
          <div class="card-top-right">
            <button class="card-fav-btn ${favActive}" data-fav-id="${l.id}" aria-label="${favTitle}" title="${favTitle}" aria-pressed="${!!l.is_favorited}">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="${l.is_favorited ? 'currentColor' : 'none'}" aria-hidden="true">
                <path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3.17 3.5 3.5 0 0114 5.5c0 4-6 8-6 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </button>
            <span class="status-dot status-dot--${l.status}" title="${l.status === 'aktif' ? 'Aktif' : 'Kapandı'}"></span>
          </div>
        </div>
        <div class="card-title">${escHtml(l.title)}</div>
        <div class="card-desc">${escHtml(l.description)}</div>
        ${expiryBadgeHTML(l)}
        <div class="card-footer">
          <span class="card-author">
            <span class="card-author-avatar">${avatarHTML(l.author_name, l.author_avatar, 20)}</span>
            <span class="card-author-name">${escHtml(l.author_name || '')}</span>
          </span>
          <span class="card-date">
            <svg class="card-date-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            ${formatDate(l.created_at)}
          </span>
          <span class="card-views" title="Görüntülenme sayısı">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.4"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/>
            </svg>
            ${l.view_count || 0}
          </span>
        </div>
      </div>`;
  },

  // ── Detail Modal ───────────────────────────────────
  showDetail(listing) {
    document.getElementById('detail-badges').innerHTML = '';

    const overlineParts = [
      CATEGORY_LABELS[listing.category] || '',
      FACULTY_LABELS[listing.faculty]   || '',
    ].filter(Boolean);
    document.getElementById('detail-overline').textContent = overlineParts.join(' · ');

    document.getElementById('detail-title').textContent = listing.title;
    document.getElementById('detail-meta').innerHTML = detailMetaHTML(listing);

    const imgWrap = document.getElementById('detail-image-wrap');
    const imgEl   = document.getElementById('detail-image');
    if (listing.image) {
      imgEl.src = listing.image;
      imgWrap.classList.remove('hidden');
    } else {
      imgEl.src = '';
      imgWrap.classList.add('hidden');
    }

    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('cb_user') || sessionStorage.getItem('cb_user') || '{}'); }
      catch { return {}; }
    })();
    const isOwner     = listing.user_id === currentUser.id;

    // Deletion warning banner is only relevant to the listing owner.
    const warnEl = document.getElementById('detail-delete-warning');
    if (isOwner && listing.status === 'kapandi' && listing.closed_at) {
      const elapsed   = (Date.now() - new Date(listing.closed_at.replace(' ', 'T')).getTime()) / 86400000;
      const remaining = Math.max(0, Math.ceil(30 - elapsed));
      let mod, text;
      if      (remaining <= 0) { mod = 'urgent'; text = 'Bu ilan yakında kalıcı olarak silinecek.'; }
      else if (remaining <= 3) { mod = 'urgent'; text = `Bu ilan <strong>${remaining} gün</strong> içinde kalıcı olarak silinecek.`; }
      else if (remaining <= 7) { mod = 'warn';   text = `Bu ilan <strong>${remaining} gün</strong> sonra kalıcı olarak silinecek.`; }
      else                     { mod = 'info';   text = `Bu ilan <strong>${remaining} gün</strong> sonra silinecek. Devam etmek için yeniden açabilirsiniz.`; }
      warnEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0">
          <path d="M8 1.5L1.5 13.5h13L8 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M8 6.5v3M8 11.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>${text}</span>`;
      warnEl.className = `detail-delete-warning detail-delete-warning--${mod}`;
    } else {
      warnEl.className = 'detail-delete-warning hidden';
    }

    document.getElementById('detail-description').textContent = listing.description;

    const contactBox  = document.getElementById('detail-contact-box');

    const parsedContacts = parseContacts(listing.contact);
    const TYPE_LABEL  = { email: 'E-Posta', phone: 'Telefon', other: 'Diğer' };
    const copySVG  = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3a2 2 0 012-2h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const checkSVG = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    if (parsedContacts.length === 0) {
      contactBox.innerHTML = '';
      contactBox.classList.add('hidden');
    } else {
      contactBox.classList.remove('hidden');
      const rowsHTML = parsedContacts.map(({ type, value }) => {
        const href         = contactHref(type, value);
        const actionLabel  = type === 'email' ? 'Gönder' : type === 'phone' ? 'Ara' : null;
        const primaryBtn   = href && actionLabel
          ? `<a href="${href}" class="dc-action-btn dc-action-primary" target="_blank" rel="noopener" title="${actionLabel}">
               ${contactIconSVG(type, 12)} ${actionLabel}
             </a>`
          : '';
        return `
          <div class="dc-row">
            <div class="dc-row-icon">${contactIconSVG(type, 16)}</div>
            <div class="dc-row-body">
              <span class="dc-row-label">${TYPE_LABEL[type] || 'İletişim'}</span>
              <span class="dc-row-value">${escHtml(value)}</span>
            </div>
            <div class="dc-row-actions">
              ${primaryBtn}
              <button class="dc-action-btn dc-copy-btn" data-copy="${escHtml(value)}" title="Kopyala">
                ${copySVG} Kopyala
              </button>
            </div>
          </div>`;
      }).join('');

      contactBox.innerHTML = `
        <div class="dc-panel">
          <div class="dc-header">
            <div class="dc-header-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/>
                <path d="M2.5 13c0-2.485 2.462-4 5.5-4s5.5 1.515 5.5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="dc-heading">İletişim Bilgileri</span>
          </div>
          <div class="dc-rows">${rowsHTML}</div>
        </div>`;
    }

    // Favorite button in detail modal
    const detailFavBtn = document.getElementById('detail-fav-btn');
    if (detailFavBtn) {
      const isFav = !!listing.is_favorited;
      detailFavBtn.dataset.favId = listing.id;
      detailFavBtn.setAttribute('aria-pressed', String(isFav));
      detailFavBtn.setAttribute('title', isFav ? 'Favorilerden çıkar' : 'Favorilere ekle');
      detailFavBtn.className = `detail-fav-btn${isFav ? ' detail-fav-btn--active' : ''}`;
      detailFavBtn.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
      detailFavBtn.onclick = e => {
        e.stopPropagation();
        App.toggleFavorite(Number(detailFavBtn.dataset.favId), detailFavBtn, true);
      };
    }

    document.getElementById('modal-detail').classList.remove('hidden');

    contactBox.querySelectorAll('.dc-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy).then(() => {
          btn.classList.add('copied');
          btn.innerHTML = `${checkSVG} Kopyalandı`;
          setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = `${copySVG} Kopyala`; }, 2000);
        });
      });
    });
  },

  closeDetail() {
    document.getElementById('modal-detail').classList.add('hidden');
  },

  // ── Form Modal ─────────────────────────────────────
  openForm(listing = null) {
    const isEdit = !!listing;
    document.getElementById('modal-form-title').textContent    = isEdit ? 'İlanı Düzenle' : 'Yeni İlan';
    document.getElementById('modal-form-subtitle').textContent = isEdit
      ? 'Değişiklikler kaydedildikten sonra herkese görünür.'
      : 'İlan herkese görünür şekilde yayınlanacak.';
    document.getElementById('modal-form-icon').innerHTML = isEdit
      ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    document.getElementById('btn-form-submit').textContent     = isEdit ? 'Kaydet' : 'İlanı Yayınla';
    document.getElementById('form-id').value          = isEdit ? listing.id : '';
    document.getElementById('form-title').value       = isEdit ? listing.title : '';
    if (typeof setFsel === 'function') {
      setFsel('category', isEdit ? listing.category : '');
      setFsel('faculty',  isEdit ? listing.faculty  : '');
    } else {
      document.getElementById('form-category').value = isEdit ? listing.category : '';
      document.getElementById('form-faculty').value  = isEdit ? listing.faculty  : '';
    }
    document.getElementById('form-description').value = isEdit ? listing.description : '';

    // Contact — parse and distribute into the 3 fixed inputs
    document.getElementById('form-contact-email').value = '';
    document.getElementById('form-contact-phone').value = '';
    document.getElementById('form-contact-other').value = '';
    if (isEdit && listing.contact) {
      parseContacts(listing.contact).forEach(c => {
        if (c.type === 'email')      document.getElementById('form-contact-email').value = c.value;
        else if (c.type === 'phone') document.getElementById('form-contact-phone').value = c.value;
        else                         document.getElementById('form-contact-other').value = c.value;
      });
    }

    // expires_at: render as dd/mm/yyyy for the masked mobile-friendly field
    document.getElementById('form-expires-at').value  =
      isEdit && listing.expires_at ? formatDateForInput(listing.expires_at) : '';

    // Image preview
    const preview     = document.getElementById('img-upload-preview');
    const placeholder = document.getElementById('img-upload-placeholder');
    const previewImg  = document.getElementById('img-preview-src');
    const fileInput   = document.getElementById('form-image');
    if (fileInput) fileInput.value = '';
    if (isEdit && listing.image) {
      previewImg.src = listing.image;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    } else {
      previewImg.src = '';
      preview.classList.add('hidden');
      placeholder.classList.remove('hidden');
    }

    this.clearFormErrors();
    document.getElementById('modal-form').classList.remove('hidden');
  },

  closeForm() {
    document.getElementById('modal-form').classList.add('hidden');
  },

  clearFormErrors() {
    ['title', 'category', 'faculty', 'description', 'contact', 'expires-at'].forEach(f => {
      const err     = document.getElementById(`err-${f}`);
      const input   = document.getElementById(`form-${f}`);
      const trigger = document.getElementById(`fsel-${f}-btn`);
      if (err)     err.textContent = '';
      if (input)   input.classList.remove('error');
      if (trigger) trigger.classList.remove('error');
    });
  },

  showFormErrors(errors) {
    this.clearFormErrors();
    errors.forEach(msg => {
      if      (msg.includes('Başlık'))    this._setErr('title', msg);
      else if (msg.includes('kategori')) this._setErr('category', msg);
      else if (msg.includes('fakülte'))  this._setErr('faculty', msg);
      else if (msg.includes('Açıklama')) this._setErr('description', msg);
      else if (msg.includes('İletişim') || msg.includes('e-posta') || msg.includes('telefon')) this._setErr('contact', msg);
      else if (msg.includes('Bitiş')) this._setErr('expires-at', msg);
    });
  },

  _setErr(field, msg) {
    const err     = document.getElementById(`err-${field}`);
    const input   = document.getElementById(`form-${field}`);
    const trigger = document.getElementById(`fsel-${field}-btn`);
    if (err)     err.textContent = msg;
    if (input)   input.classList.add('error');
    if (trigger) trigger.classList.add('error');
  },

  getFormData() {
    const expiresRaw = document.getElementById('form-expires-at').value;
    const expiresAt = normalizeDateInput(expiresRaw);
    return {
      title:       document.getElementById('form-title').value.trim(),
      category:    document.getElementById('form-category').value,
      faculty:     document.getElementById('form-faculty').value,
      description: document.getElementById('form-description').value.trim(),
      contact:     encodeContacts(),
      expires_at:  expiresRaw ? expiresAt : null,
      _expiresRaw: expiresRaw,
    };
  },

  // ── Frontend validation ────────────────────────────
  validateForm(data) {
    const errors = [];
    if (!data.title || data.title.length < 3)
      errors.push('Başlık en az 3 karakter olmalıdır');
    if (data.title && data.title.length > 100)
      errors.push('Başlık en fazla 100 karakter olabilir');
    if (!data.description || data.description.length < 10)
      errors.push('Açıklama en az 10 karakter olmalıdır');
    if (!data.category)
      errors.push('Geçersiz kategori');
    if (!data.faculty)
      errors.push('Geçersiz fakülte');
    if (data._expiresRaw && !data.expires_at)
      errors.push('Bitiş tarihi gg/aa/yyyy formatında olmalıdır');
    const _email = document.getElementById('form-contact-email')?.value.trim() || '';
    const _phone = document.getElementById('form-contact-phone')?.value.trim() || '';
    const _other = document.getElementById('form-contact-other')?.value.trim() || '';
    if (!_email && !_phone && !_other) {
      errors.push('İletişim bilgisi gereklidir (en az birini doldurun)');
    } else {
      if (_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_email))
        errors.push('Geçerli bir e-posta adresi girin');
      if (_phone && !/^[\d\s\+\-\(\)]{7,}$/.test(_phone))
        errors.push('Geçerli bir telefon numarası girin');
    }
    return errors;
  },

  // ── Toast ──────────────────────────────────────────
  toast(msg, type = 'default') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  },
};

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
