(function () {
  'use strict';

  var view = document.getElementById('view');
  var brand = document.getElementById('brand');
  var site = {};
  var projects = [];

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function list(v) { return v == null || v === '' ? [] : (Array.isArray(v) ? v : [v]); }
  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'project';
  }
  function paragraphs(text) {
    var box = document.createDocumentFragment();
    String(text || '').split(/\n\s*\n/).forEach(function (t) {
      t = t.trim();
      if (!t) return;
      var p = el('p', null, t);
      p.setAttribute('dir', 'auto');
      box.appendChild(p);
    });
    return box;
  }
  function safeLink(url) {
    url = String(url || '').trim();
    return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
  }

  /* ---------- embeds ----------
     Accepts a plain link (YouTube, Vimeo, Sketchfab) or any pasted <iframe> embed code. */
  function embedSrc(input) {
    var s = String(input || '').trim();
    if (!s) return null;
    var m = s.match(/<iframe[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i);
    var url = m ? m[1] : s;
    if (url.indexOf('//') === 0) url = 'https:' + url;
    var u;
    try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    var host = u.hostname.replace(/^www\./, '');
    var id;

    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (/^\/(embed|shorts|live|v)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    }
    if (id) return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id);

    if (host === 'vimeo.com') {
      var v = u.pathname.match(/^\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)(?:\/([a-z0-9]+))?/i);
      if (v) return 'https://player.vimeo.com/video/' + v[1] + (v[2] ? '?h=' + v[2] : '');
    }

    if (host === 'sketchfab.com' && u.pathname.indexOf('/3d-models/') === 0) {
      var sk = u.pathname.match(/([0-9a-f]{32})\/?$/i);
      if (sk) return 'https://sketchfab.com/models/' + sk[1] + '/embed';
    }
    return u.href; // any other https embed (Behance, player.vimeo.com, sketchfab embed, ...)
  }
  function ratioValue(r) {
    var p = String(r || '16:9').split(':');
    var a = parseFloat(p[0]), b = parseFloat(p[1]);
    return a > 0 && b > 0 ? (a / b) : 16 / 9;
  }

  /* ---------- views ---------- */
  function setTitle(t) {
    document.title = t ? t + ' — ' + (site.title || 'Portfolio') : (site.title || 'Portfolio');
  }

  function home() {
    setTitle('');
    view.textContent = '';
    if (!projects.length) {
      view.appendChild(el('p', 'note', 'No projects yet.'));
      return;
    }
    var grid = el('div', 'grid');
    projects.forEach(function (p) {
      var a = el('a', 'card');
      a.href = '#/p/' + encodeURIComponent(p._slug);
      var thumb = el('div', 'thumb');
      var cover = list(p.cover)[0];
      if (cover) {
        var img = el('img');
        img.src = cover;
        img.alt = p.title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        thumb.appendChild(img);
      }
      var row = el('div', 'row');
      var t = el('span', 'title', p.title || 'Untitled');
      t.setAttribute('dir', 'auto');
      row.appendChild(t);
      a.appendChild(thumb);
      a.appendChild(row);
      grid.appendChild(a);
    });
    view.appendChild(grid);
  }

  function project(slug) {
    var p = projects.filter(function (x) { return x._slug === slug; })[0];
    view.textContent = '';
    if (!p) { setTitle(''); view.appendChild(el('p', 'note', 'Project not found.')); return; }
    setTitle(p.title);

    var box = el('article', 'project');
    var back = el('a', 'back', '← Work');
    back.href = '#/';
    box.appendChild(back);

    var h = el('h1', null, p.title || 'Untitled');
    h.setAttribute('dir', 'auto');
    box.appendChild(h);

    var sub = [p.year, p.subtitle].filter(Boolean).join(' · ');
    if (sub) { var s = el('p', 'sub', sub); s.setAttribute('dir', 'auto'); box.appendChild(s); }

    if (p.description) {
      var d = el('div', 'desc');
      d.appendChild(paragraphs(p.description));
      box.appendChild(d);
    }

    var media = el('div', 'media');
    list(p.media).forEach(function (item) {
      if (!item) return;
      if (item.type === 'embed') {
        var src = embedSrc(item.code);
        if (!src) return;
        var fig = el('figure');
        var wrap = el('div', 'embed');
        wrap.style.setProperty('--r', ratioValue(item.ratio));
        var f = document.createElement('iframe');
        f.src = src;
        f.loading = 'lazy';
        f.title = (p.title || 'Embed');
        f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; xr-spatial-tracking');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        wrap.appendChild(f);
        fig.appendChild(wrap);
        if (item.caption) fig.appendChild(el('figcaption', null, item.caption));
        media.appendChild(fig);
      } else {
        var imgs = list(item.src);
        imgs.forEach(function (src, i) {
          var fig2 = el('figure');
          var img = el('img');
          img.src = src;
          img.alt = item.caption || p.title || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          fig2.appendChild(img);
          if (item.caption && i === imgs.length - 1) fig2.appendChild(el('figcaption', null, item.caption));
          media.appendChild(fig2);
        });
      }
    });
    box.appendChild(media);
    view.appendChild(box);
  }

  function about() {
    setTitle('About');
    view.textContent = '';
    var box = el('section', 'about');
    box.appendChild(el('h1', null, 'About'));
    box.appendChild(paragraphs(site.about));

    var contact = el('div', 'contact');
    if (site.email) {
      var m = el('a', null, site.email);
      m.href = 'mailto:' + site.email;
      contact.appendChild(m);
    }
    list(site.links).forEach(function (l) {
      var href = l && safeLink(l.url);
      if (!href) return;
      var a = el('a', null, l.label || href);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      contact.appendChild(a);
    });
    if (contact.childNodes.length) box.appendChild(contact);
    view.appendChild(box);
  }

  /* ---------- routing ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    try { h = decodeURIComponent(h); } catch (e) {}
    var page = 'work';
    if (h === 'about') { about(); page = 'about'; }
    else if (h.indexOf('p/') === 0) { project(h.slice(2)); }
    else { home(); }
    Array.prototype.forEach.call(document.querySelectorAll('nav a'), function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  /* ---------- start ---------- */
  function load(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    });
  }

  Promise.all([load('data/site.json'), load('data/projects.json')])
    .then(function (res) {
      site = res[0] || {};
      var seen = {};
      projects = list((res[1] || {}).projects).filter(Boolean).map(function (p) {
        var base = slugify(p.title), slug = base, n = 2;
        while (seen[slug]) slug = base + '-' + n++;
        seen[slug] = true;
        p._slug = slug;
        return p;
      });
      document.documentElement.setAttribute('data-theme', site.theme === 'light' ? 'light' : 'dark');
      brand.textContent = '';
      var logo = el('img', 'logo');
      logo.src = 'uploads/logo.png';
      logo.alt = '';
      brand.appendChild(logo);
      brand.appendChild(el('span', '', site.title || 'Portfolio'));
      window.addEventListener('hashchange', route);
      route();
    })
    .catch(function () {
      view.textContent = '';
      view.appendChild(el('p', 'note', 'Could not load the site content.'));
    })
    .then(function () { document.body.classList.add('ready'); });
})();
