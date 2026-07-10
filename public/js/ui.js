/* Presentational helpers: escaping, price formatting, toasts, modals, cards. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // Indian-format price (lakh / crore) with sale vs rent context.
  function formatPrice(amount, purpose) {
    const n = Number(amount) || 0;
    let text;
    if (n >= 10000000) text = '₹' + (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
    else if (n >= 100000) text = '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + ' Lac';
    else text = '₹' + n.toLocaleString('en-IN');
    return purpose === 'rent' ? text + '/mo' : text;
  }

  // Inline SVG placeholder used when a remote image fails to load (offline-safe).
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#e9ebef"/>` +
    `<text x="50%" y="50%" font-family="sans-serif" font-size="26" fill="#9aa1ad" text-anchor="middle" dy=".35em">Acreo</text></svg>`
  );
  const imgFallback = `onerror="this.onerror=null;this.src='${PLACEHOLDER}'"`;

  function toast(message, type = '') {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function openModal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-overlay">${html}</div>`;
    root.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) closeModal();
    });
  }
  const closeModal = () => { document.getElementById('modal-root').innerHTML = ''; };

  const typeLabel = { apartment: 'Apartment', villa: 'Villa', plot: 'Plot', office: 'Office', shop: 'Shop', pg: 'PG/Co-living' };

  // A single property card. `onFav` toggles favorite; omit for anonymous.
  function propertyCard(p) {
    const cover = (p.images && p.images[0]) || p.cover_image || PLACEHOLDER;
    const beds = p.bhk ? `<span><b>${p.bhk}</b> BHK</span>` : '';
    const baths = p.bathrooms ? `<span><b>${p.bathrooms}</b> Bath</span>` : '';
    const area = p.area_sqft ? `<span><b>${p.area_sqft}</b> sqft</span>` : '';
    return `
      <article class="card">
        <a class="thumb" href="#/property/${p.id}" data-link>
          <img src="${esc(cover)}" alt="${esc(p.title)}" ${imgFallback} />
          <span class="badge">For ${esc(p.purpose)}</span>
          ${p.featured ? '<span class="badge featured">★ Featured</span>' : ''}
          <button class="fav-btn ${p.favorited ? 'on' : ''}" data-fav="${p.id}" title="Shortlist">♥</button>
        </a>
        <div class="body">
          <div class="price">${formatPrice(p.price, p.purpose)}</div>
          <a class="title" href="#/property/${p.id}" data-link>${esc(p.title)}</a>
          <div class="loc">${esc(p.locality)}, ${esc(p.city)} · ${typeLabel[p.property_type] || p.property_type}</div>
          <div class="meta">${beds}${baths}${area}</div>
        </div>
      </article>`;
  }

  window.UI = { esc, formatPrice, toast, openModal, closeModal, propertyCard, imgFallback, PLACEHOLDER, typeLabel };
})();
