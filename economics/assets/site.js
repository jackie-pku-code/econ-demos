/* Quiz + completion state. Keys: econ-mooc-done:{chapterId}:{qId}; chapter flag uses qId "chapter". */
(function () {
  var PFX = 'econ-mooc-done:';
  function get(k) { try { return localStorage.getItem(PFX + k); } catch (e) { return null; } }
  function set(k, v) { try { v ? localStorage.setItem(PFX + k, '1') : localStorage.removeItem(PFX + k); } catch (e) {} }

  /* chapter pages */
  var root = document.querySelector('[data-chapter]');
  if (root) {
    var cid = root.getAttribute('data-chapter');
    var qs = root.querySelectorAll('.q');
    var bar = root.querySelector('.progress i');
    var score = root.querySelector('.score');
    var box = root.querySelector('.chapter-done input');

    function refresh() {
      var n = 0;
      qs.forEach(function (q) { if (get(cid + ':' + q.dataset.q)) n++; });
      if (bar) bar.style.width = (n / qs.length * 100) + '%';
      if (score) score.textContent = n + ' / ' + qs.length;
    }

    qs.forEach(function (q) {
      var qid = q.dataset.q, ans = q.dataset.answer;
      var opts = q.querySelectorAll('.opt'), fb = q.querySelector('.fb');
      function show(pick) {
        var ok = pick === ans;
        opts.forEach(function (o) {
          o.classList.remove('right', 'wrong');
          if (o.dataset.v === ans && (ok || pick === null)) o.classList.add('right');
          if (o.dataset.v === pick) o.classList.add(ok ? 'right' : 'wrong');
        });
        fb.innerHTML = pick === null
          ? '<b class="ok">已完成。</b>' + q.dataset.explain
          : (ok ? '<b class="ok">正确。</b>' : '<b class="no">不对，再想想。</b>') + q.dataset.explain;
        fb.classList.add('show');
      }
      opts.forEach(function (o) {
        o.addEventListener('click', function () {
          var ok = o.dataset.v === ans;
          if (ok) set(cid + ':' + qid, true);
          show(o.dataset.v);
          if (ok) opts.forEach(function (x) { x.disabled = true; });
          refresh();
        });
      });
      if (get(cid + ':' + qid)) { show(null); opts.forEach(function (x) { x.disabled = true; }); }
    });

    if (box) {
      box.checked = !!get(cid + ':chapter');
      box.addEventListener('change', function () { set(cid + ':chapter', box.checked); });
    }
    refresh();
  }

  /* cover page badges */
  document.querySelectorAll('[data-progress]').forEach(function (el) {
    var cid = el.dataset.progress, total = +el.dataset.total, n = 0;
    for (var i = 1; i <= total; i++) if (get(cid + ':q' + i)) n++;
    if (get(cid + ':chapter')) { el.textContent = '已完成'; el.classList.add('done'); }
    else if (n) el.textContent = '练习 ' + n + '/' + total;
  });

  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });
})();
