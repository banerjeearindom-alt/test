/* Thin API client + auth-token/session store (localStorage). */
(function () {
  const TOKEN_KEY = 'acreo_token';
  const USER_KEY = 'acreo_user';

  const store = {
    get token() { return localStorage.getItem(TOKEN_KEY); },
    get user() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('auth-changed'));
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event('auth-changed'));
    },
  };

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (store.token) headers.Authorization = 'Bearer ' + store.token;
    const res = await fetch('/api' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) store.clear();
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json.data;
  }

  const qs = (obj) => {
    const p = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    const s = p.toString();
    return s ? '?' + s : '';
  };

  window.API = {
    store, qs,
    // auth
    register: (b) => request('POST', '/auth/register', b),
    login: (b) => request('POST', '/auth/login', b),
    me: () => request('GET', '/auth/me'),
    // properties
    listProperties: (f) => request('GET', '/properties' + qs(f)),
    getProperty: (id) => request('GET', '/properties/' + id),
    createProperty: (b) => request('POST', '/properties', b),
    updateProperty: (id, b) => request('PUT', '/properties/' + id, b),
    deleteProperty: (id) => request('DELETE', '/properties/' + id),
    myProperties: (f) => request('GET', '/properties/mine' + qs(f)),
    // search
    meta: () => request('GET', '/search/meta'),
    suggest: (q) => request('GET', '/search/suggest' + qs({ q })),
    // favorites
    favorites: () => request('GET', '/favorites'),
    addFavorite: (id) => request('POST', '/favorites/' + id),
    removeFavorite: (id) => request('DELETE', '/favorites/' + id),
    // leads
    createLead: (b) => request('POST', '/leads', b),
    receivedLeads: () => request('GET', '/leads/received'),
    updateLead: (id, b) => request('PATCH', '/leads/' + id, b),
    // admin
    adminStats: () => request('GET', '/admin/stats'),
    adminUsers: () => request('GET', '/admin/users'),
    adminModerate: (id, b) => request('PATCH', '/admin/properties/' + id, b),
  };
})();
