document.addEventListener('DOMContentLoaded', () => {
  const APP_URL = window.APP_URL || 'http://localhost:5173';

  // ── Responsive search placeholder ──
  const searchInput = document.getElementById('searchInput');
  const desktopPlaceholder = 'Search by name, instagram, phone, or bank...';
  const mobilePlaceholder = 'Search vendor...';
  const updatePlaceholder = () => {
    if (searchInput) {
      searchInput.placeholder = window.innerWidth <= 768 ? mobilePlaceholder : desktopPlaceholder;
    }
  };
  updatePlaceholder();
  window.addEventListener('resize', updatePlaceholder);

  // ── Wire all .js-app-link hrefs to the deployed React app ──
  document.querySelectorAll('.js-app-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http')) {
      link.setAttribute('href', APP_URL + href);
    }
  });

  // ── Smooth scroll for nav anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        closeDrawer();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Mobile nav drawer ──
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navDrawer = document.getElementById('navDrawer');
  const navDrawerBackdrop = document.getElementById('navDrawerBackdrop');
  const navDrawerClose = document.getElementById('navDrawerClose');

  function openDrawer() {
    if (!navDrawer || !navDrawerBackdrop) return;
    navDrawer.classList.add('open');
    navDrawerBackdrop.classList.add('open');
    document.body.classList.add('nav-drawer-active');
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    if (!navDrawer || !navDrawerBackdrop) return;
    navDrawer.classList.remove('open');
    navDrawerBackdrop.classList.remove('open');
    document.body.classList.remove('nav-drawer-active');
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openDrawer);
  }

  if (navDrawerClose) {
    navDrawerClose.addEventListener('click', closeDrawer);
  }

  if (navDrawerBackdrop) {
    navDrawerBackdrop.addEventListener('click', closeDrawer);
  }

  // Close drawer when a nav item link is clicked
  if (navDrawer) {
    navDrawer.querySelectorAll('.nav-drawer-item, .nav-drawer-btn').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
  }

  // Close drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navDrawer && navDrawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // ── Hero search form ──
  const searchForm  = document.getElementById('searchForm');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = searchInput.value.trim();
      if (!raw) return;
      // Strip leading @ so the React app receives a clean query
      const query = raw.startsWith('@') ? raw.slice(1) : raw;
      if (query.length < 2) {
        alert('Please enter at least 2 characters to search.');
        return;
      }
      window.location.href = `${APP_URL}/?q=${encodeURIComponent(query)}`;
    });
  }

  // ── Search hint pills — click to pre-fill and submit ──
  document.querySelectorAll('.search-hint').forEach((pill) => {
    pill.addEventListener('click', () => {
      if (!searchInput) return;
      const hint = pill.getAttribute('data-hint') || pill.textContent.trim();
      searchInput.value = hint;
      searchInput.focus();
      // Auto-submit after a brief visual pause
      setTimeout(() => {
        searchForm && searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }, 120);
    });
  });

  // ── Scroll-aware nav shadow ──
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 12) {
        nav.style.boxShadow = 'var(--effect-regular-shadow-large)';
      } else {
        nav.style.boxShadow = '';
      }
    }, { passive: true });
  }

  // ── Fetch and Render Featured Vendors ──
  const API_URL = window.API_URL || 'http://localhost:3001';
  const featuredGrid = document.getElementById('featured-vendors-grid');
  const loadingEl = document.getElementById('featured-vendors-loading');

  if (featuredGrid) {
    fetch(`${API_URL}/api/vendors/featured`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch featured vendors');
        return res.json();
      })
      .then((vendors) => {
        if (!Array.isArray(vendors) || vendors.length === 0) {
          featuredGrid.innerHTML =
            '<div class="featured-empty">No featured vendors yet. Check back soon!</div>';
          return;
        }

        featuredGrid.innerHTML = vendors
          .map((v, index) => {
            const category = v.category || 'Retail store';
            const location = v.state ? `${v.state}` : '';
            const categoryLoc = location ? `${category} \u00B7 ${location}` : category;

            const initials = v.businessName
              ? v.businessName.split(' ').map((n) => n.charAt(0)).join('').slice(0, 2).toUpperCase()
              : '';

            let scoreClass = 'fv-score-low';
            if (v.trustScore >= 8.5) {
              scoreClass = 'fv-score-high';
            } else if (v.trustScore >= 5.0) {
              scoreClass = 'fv-score-mid';
            }

            const bgIndex = (index % 3) + 1;
            const bgClass = `fv-bg-${bgIndex}`;
            const backgroundLayer = v.coverImage
              ? `<div class="fv-card-bg" style="background-image: url('${v.coverImage}')"></div>`
              : `<div class="fv-card-bg ${bgClass}"></div>`;

            const initialsLayer = v.coverImage ? '' : `<div class="fv-initials">${initials}</div>`;

            return `
                <a href="${APP_URL}/vendors/${v.id}" class="fv-card" target="_blank">
                  ${backgroundLayer}
                  ${initialsLayer}
                  <div class="fv-card-overlay"></div>
                  <div class="fv-verified">
                    <div class="fv-verified-dot"></div>
                    Verified
                  </div>
                  <div class="fv-score ${scoreClass}">
                    <span class="fv-score-num">${v.trustScore.toFixed(1)}</span>
                    <span class="fv-score-denom">/10</span>
                  </div>
                  <div class="fv-content">
                    <span class="fv-category">${categoryLoc}</span>
                    <div class="fv-name">${v.businessName}</div>
                    <div class="fv-handle">@${v.instagramHandle || 'instagram'} \u00B7 ${v.state || 'Nigeria'}</div>
                    <div class="fv-footer">
                      <div class="fv-reviews">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        ${v.reviewCount} reviews
                      </div>
                      <span class="fv-cta">
                        View Profile
                        <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </a>
              `;
          })
          .join('');
      })
      .catch((err) => {
        console.error('Failed to load featured vendors:', err);
        featuredGrid.innerHTML =
          '<div class="featured-empty">Featured vendors are temporarily unavailable. Please try again shortly.</div>';
      });
  }
});
