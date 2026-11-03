/* Homework quiz engine. Page defines window.HW = {key, sections:[{t,d}], qs:[...]} and <div id="hw-root">.
   Question: {id, sec, type:'mc'|'tf'|'num'|'short', stem, opts, ans, unit, tol, model, why}
   or a group: {id, sec, stem, parts:[{k, type, stem, ...}]}. Progress is stored in localStorage[HW.key]. */
(function () {
  var H = window.HW, root = document.getElementById('hw-root');
  if (!H || !root) return;
  var st = {}, lm = {}, L = 'ABCDEFGH';
  try { st = JSON.parse(localStorage.getItem(H.key) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(H.key, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function norm(p) {
    if (p.type === 'tf') { p.opts = ['正确', '错误']; p.type = 'mc'; p.ans = p.ans ? 0 : 1; p.tf = 1; }
    return p;
  }
  function leaves(q) { return q.parts || [q]; }
  H.qs.forEach(function (q) {
    leaves(q).forEach(function (p) {
      norm(p);
      p.id = q.parts ? q.id + '.' + p.k : q.id;
      lm[p.id] = p;
    });
  });

  function ansText(p) {
    if (p.type === 'mc') return p.tf ? p.opts[p.ans] : L[p.ans] + '. ' + p.opts[p.ans];
    if (p.type === 'num') return p.ans + (p.unit ? ' ' + p.unit : '');
    return p.model;
  }

  function leafHTML(p, label) {
    var h = '<div class="leaf" data-leaf="' + p.id + '">';
    if (p.stem) h += '<div class="stem">' + (label ? '<b>(' + label + ')</b> ' : '') + p.stem + (p.tf ? '<span class="paren">（　　）</span>' : '') + '</div>';
    if (p.type === 'mc') {
      h += '<div class="opts' + (p.tf ? ' tf' : '') + '">';
      p.opts.forEach(function (o, i) {
        h += '<button type="button" class="opt' + (i === p.ans ? ' key' : '') + '" data-i="' + i + '">' + (p.tf ? '' : '<span class="lt">' + L[i] + '.</span> ') + o + '</button>';
      });
      h += '</div>';
    } else if (p.type === 'num') {
      h += '<div class="numrow"><input class="numin" type="text" inputmode="decimal" autocomplete="off" placeholder="输入数字" aria-label="答案">' +
        (p.unit ? '<span class="unit">' + p.unit + '</span>' : '') +
        '<button type="button" class="btn btn-ghost chk">检查</button></div>' +
        '<div class="blank">答：__________ ' + (p.unit || '') + '</div>';
    } else {
      h += '<textarea class="ans" rows="3" placeholder="先自己写下答案，再展开参考答案对照"></textarea><div class="lines"></div>' +
        '<div class="selfrow"><span>对照参考答案后自评：</span><button type="button" class="btn btn-ghost self" data-r="1">我答出来了</button>' +
        '<button type="button" class="btn btn-ghost self" data-r="0">还需复习</button></div>';
    }
    h += '<p class="fb"></p>';
    h += '<details class="explain"><summary>' + (p.type === 'short' ? '参考答案与讲解' : '查看讲解') + '</summary><div class="exb">' +
      '<p><b>' + (p.type === 'short' ? '参考答案：' : '答案：') + '</b>' + ansText(p) + '</p>' + (p.why ? '<p>' + p.why + '</p>' : '') + '</div></details>';
    return h + '</div>';
  }

  function build() {
    var h = '', counts = {};
    H.sections.forEach(function (s, si) {
      h += '<section class="hw-sec"><h2>' + s.t + '</h2>' + (s.d ? '<p class="meta">' + s.d + '</p>' : '');
      H.qs.forEach(function (q) {
        if (q.sec !== si) return;
        counts[si] = (counts[si] || 0) + 1;
        h += '<div class="hq" data-q="' + q.id + '"><div class="hq-head"><span class="n">' + (s.p || '') + counts[si] + '.</span><span class="chk-mark" aria-hidden="true">✓</span></div>';
        if (q.parts) {
          h += '<div class="stem intro">' + q.stem + '</div>';
          q.parts.forEach(function (p, i) { h += leafHTML(p, 'abcdefgh'[i]); });
        } else h += leafHTML(q);
        h += '</div>';
      });
      h += '</section>';
    });
    root.innerHTML = h;
  }

  function paint(id, fresh) {
    var p = lm[id], s = st[id], el = root.querySelector('[data-leaf="' + id + '"]');
    if (!el) return;
    var fb = el.querySelector('.fb'), ex = el.querySelector('details.explain');
    var ok = s && s.ok === true;
    if (p.type === 'mc') {
      el.querySelectorAll('.opt').forEach(function (b) {
        var i = +b.dataset.i;
        b.classList.remove('right', 'wrong');
        b.disabled = ok;
        if (s && s.v === i) b.classList.add(s.ok ? 'right' : 'wrong');
      });
    } else if (p.type === 'num') {
      var inp = el.querySelector('.numin');
      if (s && s.v != null) inp.value = s.v;
      inp.classList.toggle('right', ok);
      inp.classList.toggle('wrong', !!s && s.ok === false);
      inp.disabled = ok;
      el.querySelector('.chk').disabled = ok;
    } else {
      var ta = el.querySelector('.ans');
      if (s && s.t != null) ta.value = s.t;
    }
    fb.className = 'fb';
    if (s && s.ok === true) { fb.className = 'fb show'; fb.innerHTML = p.type === 'short' ? '<b class="ok">已掌握。</b>' : '<b class="ok">正确。</b>展开讲解看看思路。'; if (ex && fresh) ex.open = true; }
    else if (s && s.ok === false) { fb.className = 'fb show'; fb.innerHTML = p.type === 'short' ? '<b class="no">已标记为需复习。</b>' : '<b class="no">不对，再想想。</b>可以再试一次，或展开讲解。'; }
  }

  function update() {
    var done = 0, bar = document.querySelector('.hw-progress i'), sc = document.querySelector('.hw-score');
    H.qs.forEach(function (q) {
      var all = leaves(q).every(function (p) { return st[p.id] && st[p.id].ok === true; });
      var el = root.querySelector('[data-q="' + q.id + '"]');
      if (el) el.classList.toggle('done', all);
      if (all) done++;
    });
    if (bar) bar.style.width = (done / H.qs.length * 100) + '%';
    if (sc) sc.textContent = done + ' / ' + H.qs.length + ' 题已完成';
  }

  build();
  Object.keys(lm).forEach(function (id) { paint(id); });
  update();

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    var leaf = b && b.closest('[data-leaf]');
    if (!leaf) return;
    var id = leaf.dataset.leaf, p = lm[id];
    if (b.classList.contains('opt')) {
      var i = +b.dataset.i;
      st[id] = { v: i, ok: i === p.ans };
    } else if (b.classList.contains('chk')) {
      var raw = leaf.querySelector('.numin').value, x = parseFloat(raw.replace(/[,，\s]/g, ''));
      if (isNaN(x)) return;
      st[id] = { v: raw, ok: Math.abs(x - p.ans) <= (p.tol || 0.001) };
    } else if (b.classList.contains('self')) {
      st[id] = { t: (st[id] && st[id].t) || leaf.querySelector('.ans').value, ok: b.dataset.r === '1' };
    } else return;
    save(); paint(id, true); update();
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('numin')) {
      e.preventDefault();
      e.target.closest('[data-leaf]').querySelector('.chk').click();
    }
  });
  root.addEventListener('input', function (e) {
    if (!e.target.classList.contains('ans')) return;
    var id = e.target.closest('[data-leaf]').dataset.leaf;
    st[id] = st[id] || {};
    st[id].t = e.target.value;
    save();
  });

  var rs = document.querySelector('[data-hw-reset]');
  if (rs) rs.addEventListener('click', function () {
    if (!confirm('清空本页所有作答记录？')) return;
    st = {}; save(); build(); Object.keys(lm).forEach(function (id) { paint(id); }); update();
  });

  document.querySelectorAll('[data-hw-print]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.body.classList.toggle('print-a', b.dataset.hwPrint === 'a');
      window.print();
    });
  });
  var opened = [];
  window.addEventListener('beforeprint', function () {
    if (!document.body.classList.contains('print-a')) return;
    root.querySelectorAll('details.explain').forEach(function (d) { if (!d.open) { d.open = true; opened.push(d); } });
  });
  window.addEventListener('afterprint', function () {
    opened.forEach(function (d) { d.open = false; }); opened = [];
    document.body.classList.remove('print-a');
  });
})();
