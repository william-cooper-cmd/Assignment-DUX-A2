(function () {
    'use strict';


    function esc(str) {
        const d = document.createElement('div');
        d.textContent = String(str || '');
        return d.innerHTML;
    }

    function parsePrice(priceStr) {
        const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    function highlight(text, query) {
        if (!query) return esc(text);
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('(' + escaped + ')', 'gi');
        return esc(text).replace(re, '<mark style="background:var(--color-primary-light);color:var(--color-primary);">$1</mark>');
    }

    function buildCard(listing, query) {
        return `
      <article class="ad-card">
        <img src="${esc(listing.image)}" alt="${esc(listing.imageAlt)}" loading="lazy">
        <div class="ad-card-body">
          <div class="ad-card-title"><a href="open-ad.html?id=${listing.id}" style="color:inherit;text-decoration:none;">${highlight(listing.title, query)}</a></div>
          <div class="ad-card-price">${esc(listing.price)}</div>
          <div class="ad-card-location">&#128205; ${esc(listing.location)}</div>
          <div class="ad-card-desc">${highlight(listing.description.slice(0, 100) + '…', query)}</div>
          <a href="open-ad.html?id=${listing.id}" class="btn btn-primary">view listing</a>
        </div>
      </article>`;
    }

    function buildEmptyState(query) {
        return `
      <div style="grid-column:1/-1;padding:2rem 0;text-align:center;color:var(--color-text-muted);">
        <p style="font-size:1.5rem;margin-bottom:0.5rem;">&#128269;</p>
        <p style="font-size:13px;font-weight:bold;margin-bottom:0.25rem;">
          No listings found${query ? ' for &ldquo;' + esc(query) + '&rdquo;' : ''}.
        </p>
        <p style="font-size:12px;">Try a different search term, remove some filters, or
          <a href="post-ad.html">post your own ad</a>.
        </p>
      </div>`;
    }


    function filterAndSort(listings, params) {
        const q         = (params.q         || '').trim().toLowerCase();
        const category  = (params.category  || '').trim().toLowerCase();
        const location  = (params.location  || '').trim().toLowerCase();
        const minPrice  = parseFloat(params.min_price) || 0;
        const maxPrice  = parseFloat(params.max_price) || Infinity;
        const sort      = params.sort || 'recent';

        let results = listings.filter(function (l) {
            if (q) {
                const haystack = [l.title, l.description, l.category, l.location]
                    .join(' ').toLowerCase();
                const words = q.split(/\s+/).filter(Boolean);
                if (!words.every(function (w) { return haystack.includes(w); })) {
                    return false;
                }
            }

            if (category && category !== 'all') {
                if (!l.categorySlug.toLowerCase().includes(category) &&
                    !l.category.toLowerCase().includes(category)) {
                    return false;
                }
            }

            if (location) {
                if (!l.location.toLowerCase().includes(location)) {
                    return false;
                }
            }

            const price = parsePrice(l.price);
            if (price < minPrice || price > maxPrice) return false;

            return true;
        });

        results.sort(function (a, b) {
            if (sort === 'price-asc')  return parsePrice(a.price) - parsePrice(b.price);
            if (sort === 'price-desc') return parsePrice(b.price) - parsePrice(a.price);
            return new Date(b.postedDate) - new Date(a.postedDate);
        });

        return results;
    }


    function populateForm(params) {
        const qInput = document.getElementById('nav-search');
        if (qInput && params.q) qInput.value = params.q;

        const catSelect = document.getElementById('filter-category');
        if (catSelect && params.category) {
            const opt = Array.from(catSelect.options).find(function (o) {
                return o.value.toLowerCase() === params.category.toLowerCase();
            });
            if (opt) {
                opt.selected = true;
            } else if (params.category) {
                const newOpt = document.createElement('option');
                newOpt.value = params.category;
                newOpt.textContent = params.category;
                newOpt.selected = true;
                catSelect.appendChild(newOpt);
            }
        }

        const minInput = document.getElementById('filter-min');
        if (minInput && params.min_price) minInput.value = params.min_price;

        const maxInput = document.getElementById('filter-max');
        if (maxInput && params.max_price) maxInput.value = params.max_price;

        const locInput = document.getElementById('filter-location');
        if (locInput && params.location) locInput.value = params.location;

        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect && params.sort) {
            const opt = Array.from(sortSelect.options).find(function (o) {
                return o.value === params.sort;
            });
            if (opt) opt.selected = true;
        }
    }


    function updateHeading(params, count) {
        const heading = document.getElementById('results-heading');
        const meta    = document.getElementById('results-meta');

        const q        = params.q || '';
        const location = params.location || 'London';
        const sort     = params.sort || 'recent';
        const sortLabel = { recent: 'most recent', 'price-asc': 'price: low to high', 'price-desc': 'price: high to low' };

        if (heading) {
            heading.textContent = q
                ? 'Results for "' + q + '" in ' + location
                : 'All listings in ' + location;
        }

        if (meta) {
            meta.textContent = count + ' result' + (count !== 1 ? 's' : '') +
                ' found \u00B7 sorted by: ' + (sortLabel[sort] || sort);
        }

        document.title = (q ? '"' + q + '" \u2014 ' : 'All listings \u2014 ') + 'craiglist London';
    }


    let leafletMap = null;

    function renderMap(results) {
        const mapEl = document.getElementById('map');
        if (!mapEl || typeof L === 'undefined') return;

        if (leafletMap) {
            leafletMap.remove();
            leafletMap = null;
        }

        leafletMap = L.map('map').setView([51.505, -0.09], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(leafletMap);

        const withCoords = results.filter(function (l) { return l.lat && l.lng; });

        if (withCoords.length === 0) {
            leafletMap.setView([51.505, -0.09], 11);
            return;
        }

        const markers = withCoords.map(function (l) {
            return L.marker([l.lat, l.lng])
                .addTo(leafletMap)
                .bindPopup(
                    '<strong>' + esc(l.title) + '</strong><br>' +
                    esc(l.price) + '<br>' +
                    '<small>&#128205; ' + esc(l.location) + '</small><br>' +
                    '<a href="open-ad.html?id=' + l.id + '" style="color:#800080;">view listing</a>'
                );
        });

        const group = L.featureGroup(markers);
        leafletMap.fitBounds(group.getBounds().pad(0.15));
        setTimeout(function () { leafletMap.invalidateSize(); }, 100);
    }


    function runSearch() {
        const urlParams  = new URLSearchParams(window.location.search);
        const params = {
            q:          urlParams.get('q')          || '',
            category:   urlParams.get('category')   || '',
            min_price:  urlParams.get('min_price')  || '',
            max_price:  urlParams.get('max_price')  || '',
            location:   urlParams.get('location')   || '',
            sort:       urlParams.get('sort')        || 'recent',
        };

        populateForm(params);

        const grid = document.getElementById('results-grid');
        if (grid) {
            grid.innerHTML = '<p style="color:var(--color-text-muted);font-size:12px;grid-column:1/-1;">Loading listings&#x2026;</p>';
        }

        if (typeof CRAIGLIST_LISTINGS === 'undefined') {
            if (grid) {
                grid.innerHTML = '<p style="color:#c0392b;font-size:12px;grid-column:1/-1;">&#9888; Listings data not found. Make sure data.js is loaded.</p>';
            }
            return;
        }

        const results = filterAndSort(CRAIGLIST_LISTINGS, params);

        updateHeading(params, results.length);

        if (grid) {
            grid.innerHTML = results.length > 0
                ? results.map(function (l) { return buildCard(l, params.q); }).join('')
                : buildEmptyState(params.q);
        }

        renderMap(results);
    }


    document.addEventListener('DOMContentLoaded', function () {

        runSearch();

        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const params = new URLSearchParams();

                const q = document.getElementById('nav-search');
                if (q && q.value.trim()) params.set('q', q.value.trim());

                const cat = document.getElementById('filter-category');
                if (cat && cat.value) params.set('category', cat.value);

                const min = document.getElementById('filter-min');
                if (min && min.value.trim()) params.set('min_price', min.value.trim());

                const max = document.getElementById('filter-max');
                if (max && max.value.trim()) params.set('max_price', max.value.trim());

                const loc = document.getElementById('filter-location');
                if (loc && loc.value.trim()) params.set('location', loc.value.trim());

                const sort = document.getElementById('filter-sort');
                if (sort && sort.value) params.set('sort', sort.value);

                const newUrl = window.location.pathname + '?' + params.toString();
                window.history.pushState({}, '', newUrl);

                runSearch();
            });
        }

        window.addEventListener('popstate', runSearch);
    });

})();