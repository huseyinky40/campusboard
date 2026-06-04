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
};
