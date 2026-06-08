const API_BASE = window.CAMPUSBOARD_API_BASE || '/api';

const Api = {
  _token() {
    return localStorage.getItem('cb_token');
  },

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this._token();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);

    // Token expired or invalid — go to login
    if (res.status === 401) {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_user');
      window.location.href = '/login';
      return;
    }

    const data = await res.json();

    // Account banned — show full-screen ban notice
    if (res.status === 403 && data.error === 'Hesabınız askıya alınmıştır') {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_user');
      Api._showBanScreen();
      return;
    }

    if (!res.ok) throw { status: res.status, data };
    return data;
  },

  getListings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.faculty)  params.set('faculty',  filters.faculty);
    if (filters.status)   params.set('status',   filters.status);
    if (filters.search)   params.set('search',   filters.search);
    if (filters.mine)     params.set('mine',     'true');
    if (filters.page)     params.set('page',     filters.page);
    if (filters.limit)    params.set('limit',    filters.limit);
    const qs = params.toString();
    return this.request('GET', `/listings${qs ? '?' + qs : ''}`);
  },

  getListingsSummary(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.faculty)  params.set('faculty',  filters.faculty);
    if (filters.status)   params.set('status',   filters.status);
    if (filters.search)   params.set('search',   filters.search);
    if (filters.mine)     params.set('mine',     'true');
    const qs = params.toString();
    return this.request('GET', `/listings/summary${qs ? '?' + qs : ''}`);
  },

  getListing(id)          { return this.request('GET',    `/listings/${id}`); },
  createListing(data)     { return this.request('POST',   '/listings', data); },
  updateListing(id, data) { return this.request('PUT',    `/listings/${id}`, data); },
  updateStatus(id, status){ return this.request('PATCH',  `/listings/${id}/status`, { status }); },
  deleteListing(id)       { return this.request('DELETE', `/listings/${id}`); },

  getProfile()            { return this.request('GET',  '/auth/profile'); },
  updateProfile(data)     { return this.request('PUT',  '/auth/profile', data); },

  getFavorites()              { return this.request('GET',  '/favorites'); },
  toggleFavorite(listingId)   { return this.request('POST', `/favorites/${listingId}`); },

  getComments(listingId)                         { return this.request('GET',    `/listings/${listingId}/comments`); },
  createComment(listingId, content, parentId)    { return this.request('POST',   `/listings/${listingId}/comments`, { content, parent_id: parentId || null }); },
  deleteComment(listingId, commentId)            { return this.request('DELETE', `/listings/${listingId}/comments/${commentId}`); },

  _showBanScreen() {
    if (document.getElementById('cb-ban-screen')) return;

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '56'); svg.setAttribute('height', '56');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#ef4444'); svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '4.93'); line.setAttribute('y1', '4.93');
    line.setAttribute('x2', '19.07'); line.setAttribute('y2', '19.07');
    svg.append(circle, line);

    const title = document.createElement('h1');
    title.className = 'cb-ban-title';
    title.textContent = 'Hesabınız Askıya Alındı';

    const msg = document.createElement('p');
    msg.className = 'cb-ban-msg';
    msg.textContent = 'Platformumuzun kullanım koşullarını ihlal ettiğiniz için hesabınız askıya alınmıştır.';

    const sub = document.createElement('p');
    sub.className = 'cb-ban-sub';
    sub.textContent = 'Bu durumun hatalı olduğunu düşünüyorsanız üniversite yönetimine başvurun.';

    const box = document.createElement('div');
    box.className = 'cb-ban-box';
    box.append(svg, title, msg, sub);

    const el = document.createElement('div');
    el.id = 'cb-ban-screen';
    Object.assign(el.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: '#f8fafc', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    });
    el.appendChild(box);
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
  },
};
