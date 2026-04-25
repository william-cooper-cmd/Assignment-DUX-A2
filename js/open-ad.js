(function () {
    'use strict';


    function esc(str) {
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }

    function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }


    function showError(msg) {
        document.getElementById('skeleton-body').style.display = 'none';
        document.getElementById('ad-heading-wrap').style.display = 'none';
        const section = document.getElementById('listing-section');
        const el = document.createElement('div');
        el.className = 'error-banner';
        el.setAttribute('role', 'alert');
        el.innerHTML =
            '<strong>&#9888; ' + esc(msg) + '</strong><br>' +
            '<a href="../index.html">Return to homepage</a> or ' +
            '<a href="search.html">browse all listings</a>.';
        section.appendChild(el);
        document.title = 'Listing not found \u2014 craigslist London';
    }


    function loadListing() {
        const params = new URLSearchParams(window.location.search);
        const id = parseInt(params.get('id'), 10);

        if (!id || isNaN(id)) {
            showError('No listing ID was provided in the URL.');
            return;
        }

        if (typeof CRAIGSLIST_LISTINGS === 'undefined') {
            showError('Listings data not found. Make sure data.js is loaded.');
            return;
        }

        const listing = CRAIGSLIST_LISTINGS.find(function (l) {
            return l.id === id;
        });
        if (!listing) {
            showError('No listing found with ID ' + id + '.');
            return;
        }

        document.title = listing.title + ' \u2014 ' + listing.price + ' \u2014 craigslist London';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', listing.description.slice(0, 155));

        document.getElementById('breadcrumb-title').textContent = listing.title;

        const subtitle = document.getElementById('contact-modal-subtitle');
        if (subtitle) subtitle.textContent = 'Sending about: ' + listing.title + ' \u2014 ' + listing.price;

        const sellerNameEl = document.getElementById('seller-name-msg');
        if (sellerNameEl) sellerNameEl.textContent = listing.seller.name + ' (Seller)';

        const rows = Object.entries(listing.details).map(function (pair) {
            return '<tr style="border-bottom:1px dotted var(--color-border-light);">' +
                '<th style="text-align:left;padding:0.35rem 0.5rem 0.35rem 0;color:var(--color-text-muted);font-weight:bold;width:40%;white-space:nowrap;" scope="row">' + esc(pair[0]) + '</th>' +
                '<td style="padding:0.35rem 0;">' + esc(pair[1]) + '</td>' +
                '</tr>';
        }).join('');

        const badge =
            '<span style="background:var(--color-primary-light);color:var(--color-primary);' +
            'padding:0.1rem 0.4rem;border-radius:2px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">' +
            esc(listing.category) + '</span>';

        const html =
            '<img src="' + esc(listing.image) + '" alt="' + esc(listing.imageAlt) + '" ' +
            'style="width:100%;max-height:420px;object-fit:cover;display:block;border-bottom:1px solid var(--color-border-light);">' +

            '<div class="ad-card-body" style="padding:1rem 0 0;">' +

            '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.8rem;">' +
            '<div>' +
            '<div class="ad-card-price" style="font-size:1.4rem;">' + esc(listing.price) + '</div>' +
            '<div class="ad-card-location">&#128205; ' + esc(listing.location) + '</div>' +
            '<div style="margin-top:0.25rem;">' + badge + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
            '<button class="btn btn-primary" id="dyn-contact-btn" aria-haspopup="dialog">contact seller</button>' +
            '<button class="btn btn-secondary" id="dyn-save-btn" aria-pressed="false">save</button>' +
            '<button class="btn btn-secondary" id="dyn-share-btn">share</button>' +
            '</div>' +
            '</div>' +

            '<div class="ad-card-desc" style="font-size:13px;margin-bottom:1rem;line-height:1.7;">' +
            esc(listing.description) +
            '</div>' +

            '<table style="font-size:12px;border-collapse:collapse;width:100%;max-width:420px;" aria-label="Listing details">' +
            '<tbody>' +
            rows +
            '<tr>' +
            '<th style="text-align:left;padding:0.35rem 0.5rem 0.35rem 0;color:var(--color-text-muted);font-weight:bold;" scope="row">Seller</th>' +
            '<td style="padding:0.35rem 0;">' +
            esc(listing.seller.name) + ' ' +
            '<span aria-label="Seller rating">' + esc(listing.seller.rating) + '</span>' +
            ' &middot; member since ' + esc(listing.seller.memberSince) +
            '</td>' +
            '</tr>' +
            '</tbody>' +
            '</table>' +

            '<p style="font-size:11px;color:var(--color-text-faint);margin-top:1rem;">' +
            'Posted: ' + formatDate(listing.postedDate) + ' &middot; Ad ID: #' + esc(listing.adId) + ' &middot; ' +
            '<button style="background:none;border:none;color:var(--color-primary);font-size:11px;cursor:pointer;font-family:inherit;padding:0;" id="dyn-flag-btn">' +
            'flag this listing' +
            '</button>' +
            '</p>' +

            '</div>';

        document.getElementById('skeleton-body').style.display = 'none';
        document.getElementById('ad-heading').innerHTML = esc(listing.title);

        const body = document.getElementById('listing-body');
        body.innerHTML = html;
        body.style.display = '';

        document.getElementById('dyn-contact-btn').addEventListener('click', function () {
            openModal('contact-modal');
        });

        document.getElementById('dyn-save-btn').addEventListener('click', function () {
            const pressed = this.getAttribute('aria-pressed') === 'true';
            this.setAttribute('aria-pressed', String(!pressed));
            this.textContent = pressed ? 'save' : 'saved \u2713';
            showToast(pressed ? 'Listing removed from saved.' : 'Listing saved!', 'success');
        });

        document.getElementById('dyn-share-btn').addEventListener('click', function () {
            if (navigator.share) {
                navigator.share({title: listing.title, text: listing.price, url: window.location.href});
            } else {
                navigator.clipboard.writeText(window.location.href).then(function () {
                    showToast('Link copied to clipboard.', 'success');
                });
            }
        });

        document.getElementById('dyn-flag-btn').addEventListener('click', function () {
            showToast('Listing flagged for review. Thank you.', 'success');
        });


        const mapSection = document.getElementById('map-section');
        if (listing.lat && listing.lng && typeof L !== 'undefined') {
            mapSection.style.display = '';
            const map = L.map('map').setView([listing.lat, listing.lng], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(map);
            L.marker([listing.lat, listing.lng])
                .addTo(map)
                .bindPopup('<strong>' + esc(listing.title) + '</strong><br>' + esc(listing.price) + '<br><small>&#128205; ' + esc(listing.location) + '</small>')
                .openPopup();
            setTimeout(function () {
                map.invalidateSize();
            }, 100);
        }

        document.getElementById('messages-section').style.display = '';

        const replyForm = document.getElementById('reply-form');
        const thread = document.getElementById('messages-thread');
        if (replyForm && thread) {
            // Load saved messages
            const key = 'messages-' + listing.id;
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            stored.forEach(function (m) {
                const d = new Date(m.time);
                const timeStr = d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) +
                    ', ' + d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
                const msg = document.createElement('div');
                msg.className = 'seller-card message-buyer';
                msg.setAttribute('role', 'article');
                msg.innerHTML = '<h5>You (Buyer)</h5><p>' + esc(m.text) + '</p>' +
                    '<time style="font-size:10px;color:var(--color-text-faint);" datetime="' + m.time + '">' + timeStr + '</time>';
                thread.appendChild(msg);
            });

            replyForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const textarea = document.getElementById('reply-textarea');
                const text = textarea.value.trim();
                if (!text) return;

                const now = new Date();
                const timeStr = now.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) +
                    ', ' + now.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
                const isoStr = now.toISOString();

                const msg = document.createElement('div');
                msg.className = 'seller-card message-buyer';
                msg.setAttribute('role', 'article');
                msg.innerHTML = '<h5>You (Buyer)</h5><p>' + esc(text) + '</p>' +
                    '<time style="font-size:10px;color:var(--color-text-faint);" datetime="' + isoStr + '">' + timeStr + '</time>';
                thread.appendChild(msg);

                const stored = JSON.parse(localStorage.getItem(key) || '[]');
                stored.push({text: text, time: isoStr});
                localStorage.setItem(key, JSON.stringify(stored));

                textarea.value = '';
                msg.scrollIntoView({behavior: 'smooth'});
                showToast('Message sent!', 'success');
            });
        }
    }
    document.addEventListener('DOMContentLoaded', loadListing);
    document.addEventListener('DOMContentLoaded', function () {
        loadListing();
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function (e) {
                e.preventDefault();
                closeModal('contact-modal');
                showToast('Message sent!', 'success');
            });
        }
    });
})();