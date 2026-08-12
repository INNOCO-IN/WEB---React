/* IN Website — Supabase form bridge.
   Zero dependencies: talks to the Supabase REST + Storage APIs with fetch.

   Markup contract
   ---------------
   <form data-in-form="stories" data-in-thanks="Thank you for adding your light.">
     <input name="email">                          → column "email"
     <textarea name="body">                        → column "body"
     <input type="checkbox" name="consent">        → boolean
     <input type="file" name="attachment_url">     → uploaded, stores public URL
     <div data-chip-group="format" data-multi="1"> → text[] column
        <button type="button" data-value="Photo">Photo</button>
     </div>
     <div data-in-status></div>                    → inline status line (optional)
   </form>
*/
(function () {
  var CFG = window.IN_SUPABASE || {};
  var BASE = (CFG.url || '').replace(/\/+$/, '');
  var CONFIGURED = !!(BASE && CFG.anonKey) && !/YOUR_/.test(BASE + CFG.anonKey);

  var SEL_ON  = { background: '#2E3B40', color: '#FAF4E2', borderColor: '#2E3B40' };
  var SEL_OFF = { background: 'transparent', color: '#2E3B40', borderColor: 'rgba(46,59,64,0.3)' };

  function h(extra) {
    var o = { apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  function insert(table, row) {
    if (!CONFIGURED) return Promise.reject(new Error('Supabase isn\u2019t connected yet — add your project URL and anon key to supabase-config.js.'));
    return fetch(BASE + '/rest/v1/' + table, {
      method: 'POST',
      headers: h({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(row)
    }).then(function (r) {
      if (r.ok) return true;
      return r.text().then(function (t) { throw new Error('Save failed (' + r.status + '). ' + t); });
    });
  }

  function upload(file) {
    var bucket = CFG.bucket || 'story-media';
    var safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    var path = new Date().toISOString().slice(0, 10) + '/' + Date.now() + '-' + safe;
    return fetch(BASE + '/storage/v1/object/' + bucket + '/' + encodeURI(path), {
      method: 'POST',
      headers: h({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }),
      body: file
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Upload failed (' + r.status + '). ' + t); });
      return BASE + '/storage/v1/object/public/' + bucket + '/' + encodeURI(path);
    });
  }

  /* ---------- chip / card groups ---------- */
  function paint(btn, on) {
    var s = on ? SEL_ON : SEL_OFF;
    if (btn.hasAttribute('data-keep-bg')) {
      btn.style.outline = on ? '2.5px solid #2E3B40' : 'none';
      btn.style.outlineOffset = on ? '-2.5px' : '0';
      return;
    }
    btn.style.background = s.background;
    btn.style.color = s.color;
    btn.style.borderColor = s.borderColor;
  }

  /* Selection lives on a JS property, not an attribute: the design-component
     runtime re-applies each node's template `style`/attrs on every re-render,
     which would otherwise wipe both the state and its styling. */
  function reassert(group) {
    var sel = group.__inSel || (group.__inSel = []);
    var multi = group.hasAttribute('data-multi');
    [].slice.call(group.querySelectorAll('[data-value]')).forEach(function (b) {
      var on = sel.indexOf(b.getAttribute('data-value')) > -1;
      b.setAttribute('role', multi ? 'checkbox' : 'radio');
      b.setAttribute('aria-checked', String(on));
      b.style.cursor = 'pointer';
      paint(b, on);
    });
  }

  function initGroups(scope) {
    scope.querySelectorAll('[data-chip-group]').forEach(function (group) {
      var multi = group.hasAttribute('data-multi');
      if (!group.__inSel) {
        group.__inSel = [];
        [].slice.call(group.querySelectorAll('[data-value]')).forEach(function (b) {
          function toggle() {
            var v = b.getAttribute('data-value');
            var sel = group.__inSel;
            var at = sel.indexOf(v);
            if (!multi) group.__inSel = at > -1 ? [] : [v];
            else if (at > -1) sel.splice(at, 1);
            else sel.push(v);
            reassert(group);
          }
          b.addEventListener('click', toggle);
          b.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            e.preventDefault();
            toggle();
          });
        });
      }
      reassert(group);
    });
  }

  function groupValues(form) {
    var out = {};
    form.querySelectorAll('[data-chip-group]').forEach(function (g) {
      var sel = (g.__inSel || []).slice();
      out[g.getAttribute('data-chip-group')] = g.hasAttribute('data-multi') ? sel : (sel[0] || null);
    });
    return out;
  }

  /* ---------- serialize + submit ---------- */
  function serialize(form) {
    var row = {}, files = [];
    [].slice.call(form.elements).forEach(function (el) {
      var name = el.name;
      if (!name || name.charAt(0) === '_' || el.disabled) return;
      if (el.type === 'checkbox') { row[name] = el.checked; return; }
      if (el.type === 'radio') { if (el.checked) row[name] = el.value; return; }
      if (el.type === 'file') { if (el.files && el.files[0]) files.push({ name: name, file: el.files[0] }); return; }
      var v = (el.value || '').trim();
      row[name] = v === '' ? null : v;
    });
    Object.assign(row, groupValues(form));
    row.source_page = location.pathname.split('/').pop() || 'index.html';
    return { row: row, files: files };
  }

  function status(form, msg, tone) {
    var el = form.querySelector('[data-in-status]');
    if (!el) return;
    el.textContent = msg || '';
    el.style.fontFamily = "'Archivo', sans-serif";
    el.style.fontWeight = '700';
    el.style.fontSize = '14px';
    el.style.lineHeight = '1.4';
    el.style.color = tone === 'error' ? '#D21E28' : 'rgba(46,59,64,0.62)';
  }

  function succeed(form) {
    var box = document.createElement('div');
    box.setAttribute('data-in-thanks', '1');
    box.style.cssText = 'background:#FAB414;color:#2E3B40;padding:34px 32px;font-family:\'Newsreader\',serif;';
    box.innerHTML = '<div style="font-family:\'Archivo\',sans-serif;font-weight:700;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px;">Received</div>'
      + '<p style="font-size:23px;line-height:1.4;margin:0;">'
      + (form.getAttribute('data-in-thanks') || 'Thank you — we\u2019ve got it. We\u2019ll be in touch soon.')
      + '</p>';
    form.parentNode.insertBefore(box, form);
    form.remove();
    window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 110, behavior: 'smooth' });
  }

  function wire(form) {
    var table = form.getAttribute('data-in-form');
    initGroups(form);
    form.noValidate = true;   // property, not attribute — survives re-render
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.textContent : '';
      var data = serialize(form);
      if ((form.elements._hp || {}).value) { succeed(form); return; }   // honeypot

      if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.textContent = 'Sending…'; }
      status(form, data.files.length ? 'Uploading your piece…' : 'Sending…');

      Promise.all(data.files.map(function (f) {
        return upload(f.file).then(function (url) { data.row[f.name] = url; });
      }))
        .then(function () { return insert(table, data.row); })
        .then(function () { succeed(form); })
        .catch(function (err) {
          console.error('[IN → Supabase]', err);
          status(form, err.message || 'Something went wrong. Please try again, or email us directly.', 'error');
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = label; }
        });
    });
  }

  function boot() {
    document.querySelectorAll('form[data-in-form]').forEach(function (f) {
      if (f.__inWired) { initGroups(f); f.noValidate = true; return; }
      f.__inWired = true;
      wire(f);
    });
  }

  window.INSupabase = { insert: insert, upload: upload, boot: boot, configured: CONFIGURED };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // Forms stream in with the design component — pick them up as they appear.
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
})();
