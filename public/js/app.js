/* Acreo SPA — hash router + views. Depends on window.API and window.UI. */
(function () {
  const app = document.getElementById('app');
  const { esc, formatPrice, toast, openModal, closeModal, propertyCard, imgFallback, typeLabel } = UI;
  let META = null; // cached filter metadata

  // ---- Routing ---------------------------------------------------------------
  function parseRoute() {
    const raw = location.hash.slice(1) || '/';
    const [path, query] = raw.split('?');
    const params = Object.fromEntries(new URLSearchParams(query || ''));
    return { path, params };
  }
  const go = (hash) => { location.hash = hash; };

  async function router() {
    const { path, params } = parseRoute();
    window.scrollTo(0, 0);
    app.innerHTML = '<div class="spinner">Loading…</div>';
    try {
      if (path === '/' ) return viewHome();
      if (path === '/results') return viewResults(params);
      if (path.startsWith('/property/')) return viewProperty(path.split('/')[2]);
      if (path === '/post') return viewPostEdit(params.edit);
      if (path === '/dashboard') return viewDashboard(params.tab || 'listings');
      if (path.startsWith('/agent/')) return viewAgent(path.split('/')[2]);
      if (path === '/admin') return viewAdmin();
      app.innerHTML = `<div class="container section empty"><h2>Page not found</h2><a class="btn btn-primary" href="#/" data-link>Go home</a></div>`;
    } catch (e) {
      app.innerHTML = `<div class="container section empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p></div>`;
    }
  }

  // ---- Nav -------------------------------------------------------------------
  function renderNav() {
    const nav = document.getElementById('top-nav');
    const user = API.store.user;
    const common = `<a href="#/results?purpose=sale" data-link>Buy</a>
                    <a href="#/results?purpose=rent" data-link>Rent</a>`;
    if (user) {
      nav.innerHTML = `${common}
        <a href="#/post" data-link class="btn btn-outline btn-sm">＋ Post Property</a>
        <a href="#/dashboard" data-link>Dashboard</a>
        ${user.role === 'admin' ? '<a href="#/admin" data-link>Admin</a>' : ''}
        <a data-action="logout" style="cursor:pointer">Logout (${esc(user.name.split(' ')[0])})</a>`;
    } else {
      nav.innerHTML = `${common}
        <a href="#/post" data-link class="btn btn-outline btn-sm">＋ Post Property</a>
        <a data-action="login" style="cursor:pointer;font-weight:700">Login</a>`;
    }
  }

  async function ensureMeta() { if (!META) META = await API.meta(); return META; }

  // ---- Auth modal ------------------------------------------------------------
  function openAuth(mode = 'login', afterLogin) {
    const isLogin = mode === 'login';
    openModal(`
      <div class="modal">
        <span class="close-x" data-action="close-modal">&times;</span>
        <h3>${isLogin ? 'Login to Acreo' : 'Create your account'}</h3>
        <p class="muted" style="margin-top:0">${isLogin ? 'Welcome back.' : 'Post properties & shortlist homes.'}</p>
        <form id="auth-form">
          ${isLogin ? '' : `<div class="field"><label>Full name</label><input name="name" required></div>`}
          <div class="field"><label>Email</label><input name="email" type="email" required></div>
          ${isLogin ? '' : `<div class="field"><label>Phone</label><input name="phone"></div>
            <div class="field"><label>You are a</label><select name="user_type">
              <option value="owner">Owner</option><option value="dealer">Dealer / Agent</option><option value="builder">Builder</option>
            </select></div>`}
          <div class="field"><label>Password</label><input name="password" type="password" required minlength="6"></div>
          <button class="btn btn-primary btn-block" type="submit">${isLogin ? 'Login' : 'Sign up'}</button>
        </form>
        <div class="switch">${isLogin
          ? `New here? <a data-action="to-register">Create an account</a>`
          : `Have an account? <a data-action="to-login">Login</a>`}</div>
      </div>`);

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      try {
        const data = isLogin ? await API.login(body) : await API.register(body);
        API.store.setSession(data.token, data.user);
        closeModal();
        toast(`Welcome, ${data.user.name.split(' ')[0]}!`, 'ok');
        if (afterLogin) afterLogin(); else router();
      } catch (err) { toast(err.message, 'error'); }
    });
    app._authAfter = afterLogin;
    app._authMode = mode;
  }

  function requireLogin(after) {
    if (API.store.user) { after(); return; }
    toast('Please login to continue', 'error');
    openAuth('login', after);
  }

  // ---- Home ------------------------------------------------------------------
  async function viewHome() {
    await ensureMeta();
    const featured = await API.listProperties({ featured: true, limit: 6 });
    const recent = await API.listProperties({ limit: 6, sort: 'newest' });
    const cityCards = ['Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Delhi']
      .map((c) => `<a class="chip" href="#/results?city=${c}" data-link>${c}</a>`).join('');

    app.innerHTML = `
      <section class="hero">
        <div class="container">
          <h1>Find a home you'll love</h1>
          <p>Buy, rent or list properties across India — ${META.cities.length} cities and counting.</p>
          <div class="search-tabs" id="hero-tabs">
            <button data-purpose="sale" class="active">Buy</button>
            <button data-purpose="rent">Rent</button>
          </div>
          <form class="search-card" id="hero-search">
            <input type="hidden" name="purpose" value="sale">
            <input class="grow" name="q" placeholder="Search by city, locality or keyword…" autocomplete="off">
            <select name="property_type">
              <option value="">All types</option>
              ${META.property_types.map((t) => `<option value="${t}">${typeLabel[t] || t}</option>`).join('')}
            </select>
            <button class="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section class="section container">
        <div class="pill-row"><strong>Popular cities:</strong> ${cityCards}</div>
      </section>

      <section class="section container">
        <div class="section-head"><div><h2>Featured properties</h2><p class="sub">Hand-picked listings</p></div>
          <a class="btn btn-sm" href="#/results?featured=true" data-link>View all</a></div>
        <div class="grid">${featured.items.map(propertyCard).join('') || '<p class="empty">No featured listings yet.</p>'}</div>
      </section>

      <section class="section container">
        <div class="section-head"><div><h2>Recently added</h2><p class="sub">Fresh on the market</p></div>
          <a class="btn btn-sm" href="#/results" data-link>Browse all</a></div>
        <div class="grid">${recent.items.map(propertyCard).join('')}</div>
      </section>`;

    document.querySelectorAll('#hero-tabs button').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('#hero-tabs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelector('#hero-search [name=purpose]').value = b.dataset.purpose;
    }));
    document.getElementById('hero-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      go('/results' + API.qs(f));
    });
  }

  // ---- Results / search ------------------------------------------------------
  async function viewResults(params) {
    await ensureMeta();
    const data = await API.listProperties({ ...params, limit: 9 });
    const p = data.pagination;
    const sel = (name, opts, ph) => `
      <select name="${name}">
        <option value="">${ph}</option>
        ${opts.map((o) => `<option value="${o.v}" ${params[name] == o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
      </select>`;

    app.innerHTML = `
      <div class="container section">
        <div class="layout-2">
          <aside class="filter-panel">
            <form id="filter-form">
              <div class="filter-group"><h4>Keyword</h4>
                <input name="q" placeholder="locality, title…" value="${esc(params.q || '')}"></div>
              <div class="filter-group"><h4>Purpose</h4>
                ${sel('purpose', [{ v: 'sale', l: 'Buy' }, { v: 'rent', l: 'Rent' }], 'Any')}</div>
              <div class="filter-group"><h4>Type</h4>
                ${sel('property_type', META.property_types.map((t) => ({ v: t, l: typeLabel[t] || t })), 'All types')}</div>
              <div class="filter-group"><h4>City</h4>
                ${sel('city', META.cities.map((c) => ({ v: c, l: c })), 'All cities')}</div>
              <div class="filter-group"><h4>Bedrooms</h4>
                ${sel('bhk', META.bhk_options.map((b) => ({ v: b, l: b + ' BHK' })), 'Any')}</div>
              <div class="filter-group"><h4>Budget (₹)</h4>
                <div class="range-row">
                  <input name="min_price" type="number" placeholder="Min" value="${esc(params.min_price || '')}">
                  <input name="max_price" type="number" placeholder="Max" value="${esc(params.max_price || '')}">
                </div></div>
              <button class="btn btn-primary btn-block" type="submit">Apply filters</button>
              <button class="btn btn-ghost btn-block" type="button" data-action="clear-filters" style="margin-top:8px">Clear all</button>
            </form>
          </aside>
          <div>
            <div class="section-head" style="margin-bottom:18px">
              <div><h2 style="margin:0">${p.total} propert${p.total === 1 ? 'y' : 'ies'} found</h2>
                <p class="sub" style="margin:0">${params.city ? 'in ' + esc(params.city) : 'across India'}</p></div>
              ${sel('sort', [
                { v: 'newest', l: 'Newest' }, { v: 'price_asc', l: 'Price: Low to High' },
                { v: 'price_desc', l: 'Price: High to Low' }, { v: 'area_desc', l: 'Largest' }, { v: 'popular', l: 'Most viewed' },
              ], 'Sort by')}
            </div>
            <div class="grid" id="result-grid">
              ${data.items.map(propertyCard).join('') || '<div class="empty">No properties match your filters. <br><a class="btn btn-sm" href="#/results" data-link>Reset</a></div>'}
            </div>
            ${renderPagination(p, params)}
          </div>
        </div>
      </div>`;

    const form = document.getElementById('filter-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      go('/results' + API.qs({ ...f, sort: params.sort }));
    });
    // Sort select lives outside the form — wire it manually.
    app.querySelector('[name=sort]').addEventListener('change', (e) => {
      go('/results' + API.qs({ ...params, sort: e.target.value }));
    });
  }

  function renderPagination(p, params) {
    if (p.pages <= 1) return '';
    let out = '<div class="pagination">';
    for (let i = 1; i <= p.pages; i++) {
      out += `<button class="btn btn-sm ${i === p.page ? 'btn-primary' : ''}" data-page="${i}">${i}</button>`;
    }
    return out + '</div>';
  }

  // ---- Property detail -------------------------------------------------------
  async function viewProperty(id) {
    const { property: p } = await API.getProperty(id);
    const imgs = p.images.length ? p.images : [UI.PLACEHOLDER];
    const gallery = `
      <div class="gallery">
        <img class="main" src="${esc(imgs[0])}" ${imgFallback} alt="">
        ${imgs.slice(1, 3).map((u) => `<img src="${esc(u)}" ${imgFallback} alt="">`).join('')}
        ${imgs.length < 3 ? Array(3 - imgs.length).fill(`<img src="${UI.PLACEHOLDER}" alt="">`).join('') : ''}
      </div>`;
    const spec = (k, v) => v ? `<div class="spec"><div class="k">${k}</div><div class="v">${v}</div></div>` : '';

    app.innerHTML = `
      <div class="container section">
        <a class="muted" href="#/results?city=${encodeURIComponent(p.city)}" data-link>&larr; Back to ${esc(p.city)}</a>
        <h1 style="margin:12px 0 2px">${esc(p.title)}</h1>
        <p class="muted" style="margin:0 0 18px">${esc(p.locality)}, ${esc(p.city)} · ${esc(p.views)} views</p>
        ${gallery}
        <div class="detail-grid">
          <div>
            <div class="panel">
              <div class="spec-grid">
                ${spec('Price', formatPrice(p.price, p.purpose))}
                ${spec('Type', typeLabel[p.property_type] || p.property_type)}
                ${spec('Configuration', p.bhk ? p.bhk + ' BHK' : '—')}
                ${spec('Bathrooms', p.bathrooms || '—')}
                ${spec('Area', p.area_sqft ? p.area_sqft + ' sqft' : '—')}
                ${spec('Furnishing', p.furnishing || '—')}
                ${spec('Status', p.status)}
                ${spec('For', p.purpose === 'rent' ? 'Rent' : 'Sale')}
              </div>
              <h3>About this property</h3>
              <p>${esc(p.description || 'No description provided.')}</p>
              ${p.amenities.length ? `<h3>Amenities</h3><div class="amen-list">${p.amenities.map((a) => `<span>${esc(a)}</span>`).join('')}</div>` : ''}
            </div>
          </div>
          <aside>
            <div class="panel contact-card">
              <div class="price">${formatPrice(p.price, p.purpose)}</div>
              <p class="muted" style="margin:4px 0 16px">${p.area_sqft ? '₹' + Math.round(p.price / p.area_sqft).toLocaleString('en-IN') + ' / sqft' : ''}</p>
              <button class="btn btn-primary btn-block" data-action="contact" data-id="${p.id}">Contact ${esc(p.owner?.user_type || 'owner')}</button>
              <button class="btn btn-outline btn-block ${p.favorited ? 'on' : ''}" data-fav="${p.id}" style="margin-top:10px">♥ ${p.favorited ? 'Shortlisted' : 'Shortlist'}</button>
              <hr style="border:none;border-top:1px solid var(--line);margin:18px 0">
              <div class="muted" style="font-size:13px">Listed by</div>
              <a href="#/agent/${p.owner?.id}" data-link style="font-weight:700;font-size:16px">${esc(p.owner?.name || 'Owner')}</a>
              <div class="muted" style="font-size:13px;text-transform:capitalize">${esc(p.owner?.user_type || '')}</div>
            </div>
          </aside>
        </div>
      </div>`;

    app.querySelector('[data-action="contact"]').addEventListener('click', () => openLead(p));
  }

  function openLead(p) {
    const u = API.store.user;
    openModal(`
      <div class="modal">
        <span class="close-x" data-action="close-modal">&times;</span>
        <h3>Contact about</h3>
        <p class="muted" style="margin-top:0">${esc(p.title)}</p>
        <form id="lead-form">
          <div class="field"><label>Name</label><input name="name" required value="${esc(u?.name || '')}"></div>
          <div class="field"><label>Email</label><input name="email" type="email" required value="${esc(u?.email || '')}"></div>
          <div class="field"><label>Phone</label><input name="phone" required value="${esc(u?.phone || '')}"></div>
          <div class="field"><label>Message</label><textarea name="message" placeholder="I'm interested in this property…"></textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Send enquiry</button>
        </form>
      </div>`);
    document.getElementById('lead-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { property_id: p.id, ...Object.fromEntries(new FormData(e.target)) };
      try { await API.createLead(body); closeModal(); toast('Enquiry sent! The owner will reach out.', 'ok'); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  // ---- Post / edit property --------------------------------------------------
  async function viewPostEdit(editId) {
    if (!API.store.user) { requireLogin(() => go(editId ? '/post?edit=' + editId : '/post')); app.innerHTML = ''; return; }
    await ensureMeta();
    let p = {};
    if (editId) { p = (await API.getProperty(editId)).property; }
    const opt = (list, cur) => list.map((v) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${typeLabel[v] || v}</option>`).join('');

    app.innerHTML = `
      <div class="container section">
        <h1>${editId ? 'Edit' : 'Post'} your property</h1>
        <p class="sub">Fill in the details below. Fields marked * are required.</p>
        <form class="form-card" id="post-form">
          <div class="field"><label>Title *</label><input name="title" required value="${esc(p.title || '')}" placeholder="e.g. Spacious 3 BHK in Whitefield"></div>
          <div class="form-row">
            <div class="field"><label>Purpose *</label><select name="purpose">
              <option value="sale" ${p.purpose === 'sale' ? 'selected' : ''}>Sell</option>
              <option value="rent" ${p.purpose === 'rent' ? 'selected' : ''}>Rent</option></select></div>
            <div class="field"><label>Property type *</label><select name="property_type">${opt(META.property_types, p.property_type)}</select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Bedrooms (BHK)</label><input name="bhk" type="number" min="0" value="${esc(p.bhk ?? '')}"></div>
            <div class="field"><label>Bathrooms</label><input name="bathrooms" type="number" min="0" value="${esc(p.bathrooms ?? '')}"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Price (₹) *</label><input name="price" type="number" required value="${esc(p.price || '')}"></div>
            <div class="field"><label>Area (sqft)</label><input name="area_sqft" type="number" value="${esc(p.area_sqft ?? '')}"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>City *</label><input name="city" required value="${esc(p.city || '')}"></div>
            <div class="field"><label>Locality *</label><input name="locality" required value="${esc(p.locality || '')}"></div>
          </div>
          <div class="field"><label>Furnishing</label><select name="furnishing">
            <option value="">Not specified</option>
            ${['unfurnished', 'semi', 'furnished'].map((f) => `<option value="${f}" ${p.furnishing === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select></div>
          <div class="field"><label>Image URLs (comma separated)</label>
            <input name="images" value="${esc((p.images || []).join(', '))}" placeholder="https://…/1.jpg, https://…/2.jpg"></div>
          <div class="field"><label>Amenities (comma separated)</label>
            <input name="amenities" value="${esc((p.amenities || []).join(', '))}" placeholder="Lift, Gym, Parking"></div>
          <div class="field"><label>Description</label><textarea name="description">${esc(p.description || '')}</textarea></div>
          <button class="btn btn-primary" type="submit">${editId ? 'Save changes' : 'Publish listing'}</button>
        </form>
      </div>`;

    document.getElementById('post-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const csv = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
      const body = { ...f, images: csv(f.images), amenities: csv(f.amenities) };
      ['bhk', 'bathrooms', 'price', 'area_sqft'].forEach((k) => { body[k] = body[k] === '' ? null : Number(body[k]); });
      try {
        const res = editId ? await API.updateProperty(editId, body) : await API.createProperty(body);
        toast(editId ? 'Listing updated' : 'Listing published!', 'ok');
        go('/property/' + res.property.id);
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ---- Dashboard -------------------------------------------------------------
  async function viewDashboard(tab) {
    if (!API.store.user) { requireLogin(() => go('/dashboard')); app.innerHTML = ''; return; }
    const tabs = [['listings', 'My Listings'], ['favorites', 'Shortlist'], ['leads', 'Enquiries']];
    const nav = tabs.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('');
    let inner = '<div class="spinner">Loading…</div>';
    app.innerHTML = `<div class="container section"><h1>Dashboard</h1>
      <div class="tabs">${nav}</div><div id="dash-body">${inner}</div></div>`;
    app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => go('/dashboard?tab=' + b.dataset.tab)));
    const body = document.getElementById('dash-body');

    if (tab === 'listings') {
      const data = await API.myProperties();
      body.innerHTML = data.items.length ? `
        <table><thead><tr><th>Property</th><th>Price</th><th>Views</th><th>Status</th><th></th></tr></thead><tbody>
        ${data.items.map((p) => `<tr>
          <td><a href="#/property/${p.id}" data-link style="font-weight:700">${esc(p.title)}</a><br><span class="muted">${esc(p.locality)}, ${esc(p.city)}</span></td>
          <td>${formatPrice(p.price, p.purpose)}</td><td>${p.views}</td>
          <td><span class="status ${p.status}">${p.status}</span></td>
          <td><a class="btn btn-sm" href="#/post?edit=${p.id}" data-link>Edit</a>
              <button class="btn btn-sm" data-del="${p.id}">Delete</button></td></tr>`).join('')}
        </tbody></table>` : `<div class="empty">You haven't posted any properties yet.<br><a class="btn btn-primary" href="#/post" data-link style="margin-top:12px">Post your first property</a></div>`;
    } else if (tab === 'favorites') {
      const data = await API.favorites();
      body.innerHTML = data.items.length ? `<div class="grid">${data.items.map(propertyCard).join('')}</div>`
        : `<div class="empty">No shortlisted properties yet. <a href="#/results" data-link>Start browsing</a></div>`;
    } else if (tab === 'leads') {
      const data = await API.receivedLeads();
      body.innerHTML = data.items.length ? `
        <table><thead><tr><th>From</th><th>Property</th><th>Contact</th><th>Message</th><th>Status</th></tr></thead><tbody>
        ${data.items.map((l) => `<tr>
          <td>${esc(l.name)}</td><td>${esc(l.property_title)}</td>
          <td>${esc(l.email)}<br>${esc(l.phone)}</td><td>${esc(l.message || '—')}</td>
          <td><select data-lead="${l.id}" class="status ${l.status}">
            ${['new', 'contacted', 'closed'].map((s) => `<option ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td></tr>`).join('')}
        </tbody></table>` : `<div class="empty">No enquiries received yet.</div>`;
      body.querySelectorAll('[data-lead]').forEach((s) => s.addEventListener('change', async () => {
        try { await API.updateLead(s.dataset.lead, { status: s.value }); s.className = 'status ' + s.value; toast('Updated', 'ok'); }
        catch (e) { toast(e.message, 'error'); }
      }));
    }
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this listing?')) return;
      try { await API.deleteProperty(b.dataset.del); toast('Deleted', 'ok'); viewDashboard('listings'); }
      catch (e) { toast(e.message, 'error'); }
    }));
  }

  // ---- Public agent profile --------------------------------------------------
  async function viewAgent(id) {
    const data = await fetch('/api/users/' + id).then((r) => r.json()).then((j) => j.data);
    app.innerHTML = `<div class="container section">
      <div class="panel" style="margin-bottom:24px">
        <h1 style="margin:0">${esc(data.user.name)}</h1>
        <p class="muted" style="text-transform:capitalize;margin:4px 0 0">${esc(data.user.user_type)} · ${data.listings.length} active listings</p>
      </div>
      <div class="grid">${data.listings.map(propertyCard).join('') || '<div class="empty">No active listings.</div>'}</div></div>`;
  }

  // ---- Admin -----------------------------------------------------------------
  async function viewAdmin() {
    if (!API.store.user || API.store.user.role !== 'admin') {
      app.innerHTML = '<div class="container section empty"><h2>Admins only</h2></div>'; return;
    }
    const s = await API.adminStats();
    const all = await API.listProperties({ limit: 50, status: '' }).catch(() => ({ items: [] }));
    app.innerHTML = `<div class="container section">
      <h1>Admin console</h1>
      <div class="stat-row">
        ${[['Users', s.users], ['Properties', s.properties], ['Active', s.active], ['Pending', s.pending], ['Leads', s.leads]]
          .map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('')}
      </div>
      <h2>Listings by city</h2>
      <table style="max-width:420px;margin-bottom:30px"><tbody>
        ${s.by_city.map((r) => `<tr><td>${esc(r.city)}</td><td style="text-align:right"><b>${r.c}</b></td></tr>`).join('')}
      </tbody></table>
      <h2>Moderate listings</h2>
      <table><thead><tr><th>Title</th><th>Owner</th><th>Status</th><th>Featured</th></tr></thead><tbody>
      ${all.items.map((p) => `<tr>
        <td><a href="#/property/${p.id}" data-link>${esc(p.title)}</a></td>
        <td>${esc(p.owner?.name || '')}</td>
        <td><select data-mod-status="${p.id}">
          ${['active', 'pending', 'inactive', 'sold'].map((st) => `<option ${p.status === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select></td>
        <td><button class="btn btn-sm ${p.featured ? 'btn-primary' : ''}" data-mod-feat="${p.id}" data-on="${p.featured ? 1 : 0}">${p.featured ? '★ Featured' : 'Feature'}</button></td>
      </tr>`).join('')}
      </tbody></table></div>`;

    app.querySelectorAll('[data-mod-status]').forEach((sel) => sel.addEventListener('change', async () => {
      try { await API.adminModerate(sel.dataset.modStatus, { status: sel.value }); toast('Status updated', 'ok'); }
      catch (e) { toast(e.message, 'error'); }
    }));
    app.querySelectorAll('[data-mod-feat]').forEach((btn) => btn.addEventListener('click', async () => {
      const next = btn.dataset.on === '1' ? 0 : 1;
      try { await API.adminModerate(btn.dataset.modFeat, { featured: !!next }); toast('Updated', 'ok'); viewAdmin(); }
      catch (e) { toast(e.message, 'error'); }
    }));
  }

  // ---- Global event delegation ----------------------------------------------
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('[data-link]');
    if (link) { /* hash navigation handled by href */ return; }

    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      requireLogin(async () => {
        const id = fav.dataset.fav;
        const on = fav.classList.contains('on');
        try {
          if (on) { await API.removeFavorite(id); fav.classList.remove('on'); toast('Removed from shortlist'); }
          else { await API.addFavorite(id); fav.classList.add('on'); toast('Added to shortlist ♥', 'ok'); }
          if (fav.textContent.trim()) fav.innerHTML = fav.classList.contains('on') ? '♥ Shortlisted' : '♥ Shortlist';
        } catch (err) { toast(err.message, 'error'); }
      });
      return;
    }

    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'login') openAuth('login');
    if (action === 'close-modal') closeModal();
    if (action === 'to-register') openAuth('register', app._authAfter);
    if (action === 'to-login') openAuth('login', app._authAfter);
    if (action === 'logout') { API.store.clear(); toast('Logged out'); go('/'); }
    if (action === 'clear-filters') go('/results');
  });

  // Pagination (event delegation, since buttons re-render).
  document.addEventListener('click', (e) => {
    const pg = e.target.closest('[data-page]');
    if (!pg) return;
    const { params } = parseRoute();
    go('/results' + API.qs({ ...params, page: pg.dataset.page }));
  });

  window.addEventListener('hashchange', router);
  window.addEventListener('auth-changed', renderNav);
  renderNav();
  router();
})();
