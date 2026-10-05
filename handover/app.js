/* 근무 인수인계 웹앱: 입력 폼, 카톡용 글 만들기, 달력, 소비기한, 사진, 설정 */
(function () {
  const KEY = 'handover-v1';
  const COINS = [{ v: 500, n: 50 }, { v: 500, n: 40 }, { v: 100, n: 50 }, { v: 50, n: 50 }, { v: 10, n: 50 }];
  const GIFT = [{ v: 50000, t: '5만원권' }, { v: 10000, t: '1만원권' }, { v: 5000, t: '5천원권' }];
  const LISTS = [
    { k: 'cig', t: '담배 보루 판매', a: { ph: '에쎄 체인지 4mg', num: false }, b: { ph: '보루 수', num: true }, names: true },
    { k: 'transfer', t: '계좌이체', a: { ph: '메모(선택)', num: false }, b: { ph: '금액', num: true }, money: true, sum: true },
    { k: 'refund', t: '부분환불', a: { ph: '내용', num: false }, b: { ph: '금액', num: true }, money: true }
  ];
  let BAGS = ['5L', '10L', '20L', '50L', '75L'];
  let STICKERS = [1000, 2000, 3000, 5000, 8000, 11000, 13000];
  const SECTIONS = [
    ['notices', '점장님 전달 사항'], ['tasks', '오늘 할 일'], ['coins', '동전'], ['gift', '문화상품권 재고'], ['giftSold', '문화상품권 판매'],
    ['cig', '담배 보루 판매'], ['bags', '종량제 봉투 판매'], ['stickers', '폐기물 스티커 판매'], ['transfer', '계좌이체'], ['refund', '부분환불'],
    ['note', '특이사항'], ['next', '다음 근무자에게'], ['compare', '지난 근무와 비교'], ['expiry', '소비기한 탭'], ['photos', '사진']
  ];
  function defCfg() { return { hide: {}, bags: BAGS.slice(), stickers: STICKERS.slice(), custom: [] }; }

  function fresh() {
    return {
      coins: COINS.map(function () { return 0; }),
      gift: GIFT.map(function () { return 0; }),
      giftSold: GIFT.map(function () { return 0; }),
      bags: BAGS.map(function () { return 0; }),
      stickers: STICKERS.map(function () { return 0; }),
      rows: { cig: [], transfer: [], refund: [] },
      names: { cig: [] },
      showEmpty: false,
      note: '',
      next: '',
      history: {},
      wage: 0,
      me: { name: '', no: '' },
      repFuture: true,
      ov: {},
      week: {},
      cfg: defCfg(),
      cc: {},
      exp: [],
      expCfg: { times: ['20:30', '22:30'], fired: {} },
      notices: [],
      manual: [],
      readNext: {},
      cold: {},
      tasks: { d: '', done: {} }
    };
  }
  const TASKS = [
    { id: 'sand', t: '20:30', m: 20 * 60 + 30, n: '샌드위치·햄버거 소비기한 확인' },
    { id: 'exp', t: '22:30', m: 22 * 60 + 30, n: '소비기한 점검' },
    { id: 'chair', t: '23:00', m: 23 * 60, n: '테라스 의자 정리' },
    { id: 'cold', t: '근무 중', m: null, n: '저온 2차 물류정리' }
  ];
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const LEGACY_WEEK = { 1: { s: 1140, e: 1440 }, 2: { s: 1140, e: 1440 }, 3: { s: 1200, e: 1440 } };
  function baseShift(dow) { const w = S.week && S.week[dow]; return w && typeof w.s === 'number' && typeof w.e === 'number' ? { s: w.s, e: w.e } : null; }
  function keyDow(key) { const p = key.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay(); }
  function shiftOn(key) { const o = S.ov[key]; if (o) return o.off ? null : { s: o.s, e: o.e }; return baseShift(keyDow(key)); }
  function hm(m) { const h = Math.floor(m / 60); return (m > 1440 ? '익일 ' + pad(h - 24) : pad(h)) + ':' + pad(m % 60); }
  function toInput(m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); }
  function fmtShift(sh) { return sh ? hm(sh.s) + '–' + hm(sh.e) : ''; }
  function dur(min) { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분'; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function shiftDate() { const d = new Date(); if (d.getHours() < 5) d.setDate(d.getDate() - 1); return d; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return ymd(shiftDate()); }
  function shiftText() { const d = shiftDate(), sh = shiftOn(ymd(d)); return DAYS[d.getDay()] + (sh ? ' ' + fmtShift(sh) : ' 근무 없는 날'); }
  /* ---- 저온 물류 도착 시각 기록과 평균 ---- */
  function coldMin(v) {
    if (!v) return null;
    const h = Number(v.slice(0, 2)), mi = Number(v.slice(3, 5));
    return h * 60 + mi + (h < 5 ? 1440 : 0);
  }
  function freshTasks() { const k = todayKey(); return { d: k, done: {}, time: S.cold[k] !== undefined ? toInput(S.cold[k]) : '' }; }
  function avgOf(list) { return list.reduce(function (a, b) { return a + b; }, 0) / list.length; }
  function coldInfo(dow) {
    const keys = Object.keys(S.cold);
    const all = keys.map(function (k) { return S.cold[k]; });
    const same = keys.filter(function (k) { return keyDow(k) === dow; }).map(function (k) { return S.cold[k]; });
    return {
      n: all.length, avg: all.length ? avgOf(all) : null,
      min: all.length ? Math.min.apply(null, all) : null, max: all.length ? Math.max.apply(null, all) : null,
      nDow: same.length, avgDow: same.length ? avgOf(same) : null
    };
  }
  function coldExpect() {
    const info = coldInfo(shiftDate().getDay());
    return info.nDow >= 2 ? info.avgDow : info.avg;
  }
  function coldHintHtml() {
    const dow = shiftDate().getDay(), info = coldInfo(dow);
    if (!info.n) return '<p class="none coldhint">도착 시각을 적어두면 평균 도착 시각을 알려줘요.</p>';
    const useDow = info.nDow >= 2;
    const ex = useDow ? info.avgDow : info.avg, cnt = useDow ? info.nDow : info.n;
    return '<p class="none coldhint">보통 ' + toInput(Math.round(ex)) + '쯤 와요 · ' + (useDow ? DAYS[dow] + '요일 평균' : '전체 평균') + ' · 기록 ' + cnt + '회</p>';
  }
  function renderTasks() {
    const box = document.getElementById('tasks');
    if (!box) return;
    if (S.tasks.d !== todayKey()) { S.tasks = freshTasks(); save(); }
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
    setT('shift', shiftText());
    box.innerHTML = TASKS.map(function (t) {
      const done = !!S.tasks.done[t.id];
      let cls = '', st = '';
      if (done) { cls = 'done'; st = '완료'; }
      else if (t.id === 'cold') {
        const ex = coldExpect();
        if (ex !== null && !S.tasks.time) {
          const dd = nowMin() - ex;
          if (dd >= -20 && dd < 0) { cls = 'now'; st = '곧 올 시간'; }
          else if (dd >= 0 && dd <= 60) { cls = 'now'; st = '올 시간'; }
        }
      }
      else if (t.m !== null && m >= 15 * 60) {
        const diff = m - t.m;
        if (diff >= 0 && diff <= 30) { cls = 'now'; st = '지금'; }
        else if (diff > 30) { cls = 'late'; st = '시간 지남'; }
        else if (diff > -30) { st = '곧'; }
      }
      return '<label class="task ' + cls + '"><input type="checkbox" data-task="' + t.id + '"' + (done ? ' checked' : '') + '>' +
        '<span class="tt">' + t.t + '</span><span class="tn">' + t.n + '</span><span class="ts">' + st + '</span></label>' +
        (t.id === 'cold' ? '<div class="coldtime"><label for="coldTime">도착 시각</label><input type="time" id="coldTime" value="' + esc(S.tasks.time || '') + '"></div>' + coldHintHtml() : '');
    }).join('');
  }
  let S = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw), f = fresh();
      Object.keys(f).forEach(function (k) { if (p[k] !== undefined) f[k] = p[k]; });
      if (p.week === undefined) f.week = JSON.parse(JSON.stringify(LEGACY_WEEK));
      applyCfg(f.cfg);
      if (f.coins.length === COINS.length && f.gift.length === GIFT.length && f.giftSold.length === GIFT.length && f.bags.length === BAGS.length && f.stickers.length === STICKERS.length) S = f;
      else { S.history = f.history || {}; S.wage = f.wage; S.ov = f.ov; S.notices = f.notices; S.manual = f.manual; S.readNext = f.readNext; S.week = f.week; S.cfg = f.cfg; S.cc = f.cc; S.exp = f.exp; S.expCfg = f.expCfg; S.bags = BAGS.map(function () { return 0; }); S.stickers = STICKERS.map(function () { return 0; }); S.me = f.me; S.repFuture = f.repFuture; S.cold = f.cold; }
    }
  } catch (e) {}
  function applyCfg(c) {
    if (!c || typeof c !== 'object') return;
    if (!c.hide || typeof c.hide !== 'object') c.hide = {};
    if (!Array.isArray(c.bags)) c.bags = BAGS.slice();
    if (!Array.isArray(c.stickers)) c.stickers = STICKERS.slice();
    if (!Array.isArray(c.custom)) c.custom = [];
    BAGS = c.bags;
    STICKERS = c.stickers;
  }
  function on(id) { return !(S.cfg && S.cfg.hide && S.cfg.hide[id]); }
  function setT(id, t) { const e = document.getElementById(id); if (e) e.textContent = t; }
  function cuId(c, j) { return c.id || ('c' + j); }
  function cuArr(c, j) {
    const id = cuId(c, j);
    if (!Array.isArray(S.cc[id])) S.cc[id] = [];
    while (S.cc[id].length < c.items.length) S.cc[id].push(0);
    S.cc[id].length = c.items.length;
    return S.cc[id];
  }
  function getArr(g) {
    if (g.indexOf('cu:') === 0) { const j = Number(g.slice(3)); return cuArr(S.cfg.custom[j], j); }
    return S[g];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function won(n) { return n.toLocaleString('en-US'); }
  function digits(s) { return String(s).replace(/[^\d]/g, ''); }
  function fmt(s) { const d = digits(s); return d ? won(Number(d)) : String(s).trim(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function stepper(group, i, label, val) {
    return '<div class="stepper" data-group="' + group + '" data-i="' + i + '">' +
      '<button type="button" data-act="dec" aria-label="' + label + ' 하나 줄이기">−</button>' +
      '<input inputmode="numeric" value="' + val + '" aria-label="' + label + ' 개수">' +
      '<button type="button" data-act="inc" aria-label="' + label + ' 하나 늘리기">+</button></div>';
  }

  function build() {
    const app = document.getElementById('app');
    let h = '';
    h += '<section class="sheet"><div class="sh"><h2>지금 근무</h2><span class="tot" id="liveClock"></span></div>' +
      '<p class="livemain" id="liveMain"></p><p class="earn" id="liveEarn" hidden></p><p class="livesub" id="liveSub"></p>' +
      '<div class="track" id="liveTrack" role="progressbar" aria-label="오늘 근무 진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="fill" id="liveFill"></div></div>' +
      '<div id="liveHint"></div></section>';
    if (on('notices')) h += '<section class="sheet"><div class="sh"><h2>점장님 전달 사항</h2><span class="tot" id="noticeCnt"></span></div><div id="noticeList"></div>' +
      '<div class="addrow"><input class="rowin" id="noticeIn" placeholder="전달 사항 한 줄" aria-label="전달 사항 입력" autocomplete="off"><button type="button" class="reset" id="noticeAdd">추가</button></div>' +
      '<button type="button" class="add" id="noticeClear" hidden>완료한 것 지우기</button></section>';
    if (on('tasks')) h += '<section class="sheet"><div class="sh"><h2>오늘 할 일</h2><span class="tot" id="shift"></span></div><div id="tasks"></div></section>';
    if (on('coins')) {
      h += '<section class="sheet"><div class="sh"><h2>동전</h2><span class="tot" id="tot-coins"></span></div>';
      COINS.forEach(function (c, i) {
        const lab = c.v + '원 ' + c.n + '개들이';
        h += '<div class="line"><div class="lab">(' + c.v + '×' + c.n + ')<span class="sub" id="sub-coins-' + i + '"></span></div>' + stepper('coins', i, lab, S.coins[i]) + '</div>';
      });
      h += '</section>';
    }
    [['gift', '문화상품권 재고'], ['giftSold', '문화상품권 판매']].forEach(function (g) {
      if (!on(g[0])) return;
      h += '<section class="sheet"><div class="sh"><h2>' + g[1] + '</h2><span class="tot" id="tot-' + g[0] + '"></span></div>';
      GIFT.forEach(function (x, i) {
        h += '<div class="line"><div class="lab">' + x.t + '<span class="sub" id="sub-' + g[0] + '-' + i + '"></span></div>' + stepper(g[0], i, g[1] + ' ' + x.t, S[g[0]][i]) + '</div>';
      });
      h += '</section>';
    });
    LISTS.forEach(function (L) {
      if (L.k === 'transfer') {
        if (on('bags')) {
          h += '<section class="sheet"><div class="sh"><h2>종량제 봉투 판매</h2><span class="tot" id="tot-bags"></span></div>';
          BAGS.forEach(function (b, i) {
            h += '<div class="line"><div class="lab">' + esc(b) + '</div>' + stepper('bags', i, '종량제 봉투 ' + b, S.bags[i]) + '</div>';
          });
          h += '</section>';
        }
        if (on('stickers')) {
          h += '<section class="sheet"><div class="sh"><h2>폐기물 스티커 판매</h2><span class="tot" id="tot-stickers"></span></div>';
          STICKERS.forEach(function (v, i) {
            h += '<div class="line"><div class="lab">' + won(v) + '원<span class="sub" id="sub-stickers-' + i + '"></span></div>' + stepper('stickers', i, '폐기물 스티커 ' + won(v) + '원', S.stickers[i]) + '</div>';
          });
          h += '</section>';
        }
      }
      if (!on(L.k)) return;
      h += '<section class="sheet"><div class="sh"><h2>' + L.t + '</h2><span class="tot" id="cnt-' + L.k + '"></span></div>' +
        '<div class="rows" id="rows-' + L.k + '"></div>' +
        '<button type="button" class="add" data-add="' + L.k + '">+ 한 줄 추가</button>';
      if (L.names) h += '<datalist id="dl-' + L.k + '"></datalist>';
      h += '</section>';
    });
    S.cfg.custom.forEach(function (c, j) {
      const arr = cuArr(c, j);
      h += '<section class="sheet"><div class="sh"><h2>' + esc(c.t) + '</h2><span class="tot" id="tot-cu' + j + '"></span></div>';
      c.items.forEach(function (n, i) {
        h += '<div class="line"><div class="lab">' + esc(n) + '</div>' + stepper('cu:' + j, i, c.t + ' ' + n, arr[i]) + '</div>';
      });
      h += '</section>';
    });
    if (on('photos')) h += '<section class="sheet" id="photoBox"></section>';
    if (on('note')) h += '<section class="sheet"><div class="sh"><h2>특이사항</h2></div><textarea class="note" id="note" placeholder="점장님께 전할 말을 적어요. 예: 폐기 상품, 손님 문의, 고장 난 물건" aria-label="특이사항"></textarea></section>';
    if (on('next')) h += '<section class="sheet"><div class="sh"><h2>다음 근무자에게</h2><button type="button" class="linkbtn" id="nextCopy">이 내용만 복사</button></div><textarea class="note" id="nextNote" placeholder="다음 근무자에게 넘길 일을 적어요. 예: 진열 덜 끝난 곳, 내일 아침 행사 준비, 부족한 재고" aria-label="다음 근무자 인수인계"></textarea></section>';
    if (on('compare')) h += '<section class="sheet" id="compare"></section>';
    app.innerHTML = h;
    if (on('note')) document.getElementById('note').value = S.note || '';
    if (on('next')) document.getElementById('nextNote').value = S.next || '';
    LISTS.forEach(function (L) { if (on(L.k)) { renderRows(L.k); renderNames(L.k); } });
    document.getElementById('showEmpty').checked = !!S.showEmpty;
    renderTasks();
    renderNotices();
    renderPhotos();
    liveHint = null;
    tick();
    refresh();
  }

  function renderRows(k) {
    const L = LISTS.filter(function (x) { return x.k === k; })[0];
    const box = document.getElementById('rows-' + k);
    const rows = S.rows[k];
    if (!rows.length) { box.innerHTML = '<p class="none">판매한 게 없으면 비워두세요.</p>'; return; }
    box.innerHTML = rows.map(function (r, i) {
      return '<div class="row">' +
        ('<input class="rowin' + (L.a.num ? ' num' : '') + '" data-k="' + k + '" data-i="' + i + '" data-f="a" value="' + esc(r.a) + '" placeholder="' + esc(L.a.ph) + '" aria-label="' + esc(L.t) + ' ' + (i + 1) + '번째 ' + (L.money ? '내용' : '항목') + '"' + (L.a.num ? ' inputmode="numeric"' : '') + (L.names ? ' list="dl-' + k + '"' : '') + '>') +
        '<input class="rowin num" data-k="' + k + '" data-i="' + i + '" data-f="b" value="' + esc(r.b) + '" placeholder="' + esc(L.b.ph) + '" aria-label="' + esc(L.t) + ' ' + (i + 1) + '번째 ' + (L.money ? '금액' : '수량') + '" inputmode="numeric">' +
        '<button type="button" class="rm" data-rm="' + k + '" data-i="' + i + '" aria-label="' + (i + 1) + '번째 줄 지우기">×</button></div>';
    }).join('');
  }
  function renderNames(k) {
    const dl = document.getElementById('dl-' + k);
    if (!dl) return;
    dl.innerHTML = (S.names[k] || []).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  }

  function validRows(L) {
    return S.rows[L.k].filter(function (r) { return L.sum ? r.b.trim() : r.a.trim() && r.b.trim(); });
  }
  function sumOf(rows) {
    return rows.reduce(function (a, r) { return a + (Number(digits(r.b)) || 0); }, 0);
  }
  function lineOf(L, r) {
    if (L.money) return r.a.trim() + ' - ' + fmt(r.b) + '원';
    if (L.k === 'sticker') return fmt(r.a) + ' - ' + r.b.trim();
    return r.a.trim() + ' - ' + r.b.trim();
  }

  function text() {
    let o = ['점장님! 근무교대 했습니다!'];
    const none = function (t) { if (S.showEmpty) o.push('', '<' + t + '>', '없음'); };
    if (on('coins')) {
      o.push('', '<동전>');
      COINS.forEach(function (c, i) { o.push('(' + c.v + '×' + c.n + ') - ' + S.coins[i] + '개'); });
    }
    if (on('gift')) {
      o.push('', '<문화상품권 재고>');
      GIFT.forEach(function (g, i) { o.push(g.t + ' - ' + S.gift[i] + '장'); });
    }
    if (on('giftSold')) {
      const sold = GIFT.map(function (g, i) { return S.giftSold[i] > 0 ? g.t + ' - ' + S.giftSold[i] + '장' : null; }).filter(Boolean);
      if (sold.length) { o.push('', '<문화상품권 판매>'); o = o.concat(sold); }
      else none('문화상품권 판매');
    }
    LISTS.forEach(function (L) {
      if (L.k === 'transfer') {
        if (on('bags')) {
          const bl = BAGS.map(function (b, i) { return S.bags[i] > 0 ? b + ' - ' + S.bags[i] : null; }).filter(Boolean);
          if (bl.length) { o.push('', '<종량제 봉투 판매>'); o = o.concat(bl); }
          else none('종량제 봉투 판매');
        }
        if (on('stickers')) {
          const sl = STICKERS.map(function (v, i) { return S.stickers[i] > 0 ? won(v) + ' - ' + S.stickers[i] : null; }).filter(Boolean);
          if (sl.length) { o.push('', '<폐기물 스티커 판매>'); o = o.concat(sl); }
          else none('폐기물 스티커 판매');
        }
      }
      if (!on(L.k)) return;
      const rows = validRows(L);
      if (rows.length && L.sum) {
        o.push('', '<' + L.t + '>');
        rows.forEach(function (r) { o.push((r.a.trim() ? r.a.trim() + ' - ' : '') + fmt(r.b) + '원'); });
        if (rows.length > 1) o.push('합계 ' + fmt(String(sumOf(rows))) + '원');
      }
      else if (rows.length) { o.push('', '<' + L.t + '>'); rows.forEach(function (r) { o.push(lineOf(L, r)); }); }
      else none(L.t);
    });
    S.cfg.custom.forEach(function (c, j) {
      const arr = cuArr(c, j);
      const cl = c.items.map(function (n, i) { return arr[i] > 0 ? n + ' - ' + arr[i] : null; }).filter(Boolean);
      if (cl.length) { o.push('', '<' + c.t + '>'); o = o.concat(cl); }
      else none(c.t);
    });
    if (on('note')) {
      if ((S.note || '').trim()) o.push('', '<특이사항>', S.note.trim());
      else none('특이사항');
    }
    return o.join('\n');
  }

  function refresh() {
    let ct = 0;
    COINS.forEach(function (c, i) {
      const v = c.v * c.n * S.coins[i]; ct += v;
      setT('sub-coins-' + i, '= ' + won(v) + '원');
    });
    setT('tot-coins', '합계 ' + won(ct) + '원');
    ['gift', 'giftSold'].forEach(function (g) {
      let t = 0;
      GIFT.forEach(function (x, i) {
        const v = x.v * S[g][i]; t += v;
        setT('sub-' + g + '-' + i, '= ' + won(v) + '원');
      });
      setT('tot-' + g, '합계 ' + won(t) + '원');
    });
    LISTS.forEach(function (L) {
      const vr = validRows(L);
      setT('cnt-' + L.k, L.sum && vr.length ? '합계 ' + won(sumOf(vr)) + '원' : vr.length + '건');
    });
    setT('tot-bags', S.bags.reduce(function (a, b) { return a + b; }, 0) + '개');
    let stt = 0;
    STICKERS.forEach(function (v, i) {
      stt += v * S.stickers[i];
      setT('sub-stickers-' + i, '= ' + won(v * S.stickers[i]) + '원');
    });
    setT('tot-stickers', '합계 ' + won(stt) + '원');
    S.cfg.custom.forEach(function (c, j) {
      setT('tot-cu' + j, cuArr(c, j).reduce(function (a, b) { return a + b; }, 0) + '개');
    });
    document.getElementById('preview').textContent = text();
    renderCompare();
    save();
  }

  const app = document.getElementById('app');
  app.addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act) {
      const st = b.closest('.stepper'), g = st.dataset.group, i = Number(st.dataset.i);
      const arr = getArr(g);
      arr[i] = Math.max(0, arr[i] + (b.dataset.act === 'inc' ? 1 : -1));
      st.querySelector('input').value = arr[i];
      refresh();
    } else if (b.dataset.add) {
      const k = b.dataset.add;
      S.rows[k].push({ a: '', b: '' });
      renderRows(k);
      const ins = document.querySelectorAll('#rows-' + k + ' .row:last-child .rowin');
      if (ins[0]) ins[0].focus();
      refresh();
    } else if (b.dataset.phdel) {
      phDelete(b.dataset.phdel);
    } else if (b.dataset.phshare !== undefined) {
      phShare(Number(b.dataset.phshare));
    } else if (b.id === 'nextCopy') {
      const nt = (S.next || '').trim();
      if (!nt) { say('적은 내용이 없어요.'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(nt).then(function () { say('다음 근무자용 글을 복사했어요.'); }, function () { say('복사에 실패했어요. 직접 선택해 복사해 주세요.'); });
      else say('복사에 실패했어요. 직접 선택해 복사해 주세요.');
    } else if (b.id === 'noticeAdd') {
      addNotice();
    } else if (b.id === 'noticeClear') {
      S.notices = S.notices.filter(function (n) { return !n.done || n.pin; });
      save(); renderNotices();
    } else if (b.dataset.npin) {
      const nn = S.notices[Number(b.dataset.npin)];
      nn.pin = !nn.pin; nn.done = false;
      save(); renderNotices();
    } else if (b.dataset.ndel) {
      S.notices.splice(Number(b.dataset.ndel), 1);
      save(); renderNotices();
    } else if (b.dataset.go === 'wage') {
      showTab('cal');
      const wi = document.getElementById('wage');
      if (wi) { wi.scrollIntoView({ block: 'center' }); wi.focus(); }
    } else if (b.dataset.rm) {
      S.rows[b.dataset.rm].splice(Number(b.dataset.i), 1);
      renderRows(b.dataset.rm);
      refresh();
    }
  });
  app.addEventListener('input', function (e) {
    const el = e.target;
    if (el.id === 'coldTime') {
      S.tasks.time = el.value;
      const cm = coldMin(el.value);
      if (cm === null) delete S.cold[todayKey()]; else S.cold[todayKey()] = cm;
      refresh();
    } else if (el.id === 'note') {
      S.note = el.value;
      refresh();
    } else if (el.id === 'nextNote') {
      S.next = el.value;
      refresh();
    } else if (el.closest('.stepper')) {
      const st = el.closest('.stepper');
      const n = Number(digits(el.value)) || 0;
      getArr(st.dataset.group)[Number(st.dataset.i)] = n;
      refresh();
    } else if (el.dataset.k) {
      S.rows[el.dataset.k][Number(el.dataset.i)][el.dataset.f] = el.value;
      refresh();
    }
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'phIn') {
      phAdd(e.target.files);
      e.target.value = '';
    } else if (e.target.dataset.nread !== undefined) {
      S.readNext[e.target.dataset.nread] = e.target.checked;
      save();
    } else if (e.target.dataset.nchk !== undefined) {
      S.notices[Number(e.target.dataset.nchk)].done = e.target.checked;
      save(); renderNotices();
    } else if (e.target.id === 'coldTime') {
      save(); renderTasks(); renderColdSheet();
    } else if (e.target.dataset.task) {
      S.tasks.done[e.target.dataset.task] = e.target.checked;
      save();
      renderTasks();
      refresh();
    }
  });
  setInterval(function () {
    const box = document.getElementById('tasks');
    if (box && !box.contains(document.activeElement)) renderTasks();
  }, 30000);
  app.addEventListener('focusin', function (e) {
    if (e.target.closest('.stepper') && e.target.tagName === 'INPUT') e.target.select();
  });
  app.addEventListener('focusout', function (e) {
    if (e.target.closest('.stepper') && e.target.tagName === 'INPUT') {
      const st = e.target.closest('.stepper');
      e.target.value = getArr(st.dataset.group)[Number(st.dataset.i)];
    }
  });

  document.getElementById('showEmpty').addEventListener('change', function (e) { S.showEmpty = e.target.checked; refresh(); });

  const statusEl = document.getElementById('status'), calStatus = document.getElementById('calStatus');
  let statusTimer;
  function say(m) {
    statusEl.textContent = m; calStatus.textContent = m;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { statusEl.textContent = ''; calStatus.textContent = ''; }, 3500);
  }

  function remember() {
    ['cig'].forEach(function (k) {
      validRows(LISTS.filter(function (x) { return x.k === k; })[0]).forEach(function (r) {
        const n = r.a.trim();
        if (n && S.names[k].indexOf(n) < 0) S.names[k].push(n);
      });
      renderNames(k);
    });
    save();
  }
  document.getElementById('copy').addEventListener('click', function () {
    const t = text();
    remember();
    archive();
    function fallback() {
      const pre = document.getElementById('preview'), r = document.createRange();
      r.selectNodeContents(pre);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      pre.scrollIntoView({ block: 'center' });
      say('글이 선택됐어요. 길게 눌러 복사하세요.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { say('복사했어요. 오늘 기록으로도 저장했어요.'); }, fallback);
    } else fallback();
  });

  const resetBtn = document.getElementById('reset');
  let armTimer;
  resetBtn.addEventListener('click', function () {
    if (!resetBtn.classList.contains('armed')) {
      resetBtn.classList.add('armed');
      resetBtn.textContent = '판매·이체 내역을 비워요. 한 번 더 누르면 실행';
      armTimer = setTimeout(disarm, 4000);
      return;
    }
    disarm();
    S.giftSold = GIFT.map(function () { return 0; });
    S.bags = BAGS.map(function () { return 0; });
    S.stickers = STICKERS.map(function () { return 0; });
    S.cc = {};
    S.tasks = freshTasks();
    S.note = '';
    S.next = '';
    Object.keys(S.rows).forEach(function (k) { S.rows[k] = []; });
    build();
    say('새 근무를 시작했어요. 동전과 재고는 그대로예요.');
    window.scrollTo(0, 0);
  });
  function disarm() { clearTimeout(armTimer); resetBtn.classList.remove('armed'); resetBtn.textContent = '새 근무 시작'; }

  /* ---- 달력과 저장된 기록 ---- */
  function archive() {
    S.history[todayKey()] = { text: text(), at: Date.now(), coins: S.coins.slice(), gift: S.gift.slice(), sold: S.giftSold.slice(), next: (S.next || '').trim() };
    save();
  }

  /* ---- 저온 물류 도착 기록 (달력 탭) ---- */
  function renderColdSheet() {
    const box = document.getElementById('coldSheet');
    if (!box) return;
    const info = coldInfo(-1), keys = Object.keys(S.cold).sort().reverse();
    let h = '<div class="sh"><h2>저온 물류 도착 시각</h2><span class="tot">' + (info.n ? '평균 ' + toInput(Math.round(info.avg)) + ' · ' + info.n + '회' : '기록 없음') + '</span></div>';
    if (info.n) {
      const parts = [];
      [1, 2, 3, 4, 5, 6, 0].forEach(function (dw) {
        const x = coldInfo(dw);
        if (x.nDow) parts.push(DAYS[dw] + ' ' + toInput(Math.round(x.avgDow)) + ' (' + x.nDow + '회)');
      });
      h += '<p class="none">가장 이른 ' + toInput(info.min) + ' · 가장 늦은 ' + toInput(info.max) + '</p><p class="none">요일별 평균: ' + parts.join(' · ') + '</p>';
    } else {
      h += '<p class="none">인수인계 탭의 "저온 2차 물류정리"에 도착 시각을 적으면 여기에 쌓이고 평균이 계산돼요.</p>';
    }
    h += '<div class="cmps">' + keys.slice(0, 8).map(function (k) {
      return '<div class="cmp"><span>' + dayLabel(k) + '</span><b>' + toInput(S.cold[k]) + ' <button type="button" class="linkbtn" data-cdel="' + k + '" aria-label="' + dayLabel(k) + ' 기록 지우기">지우기</button></b></div>';
    }).join('') + '</div>';
    h += '<div class="times"><label for="coldDate">날짜</label><input type="date" id="coldDate" value="' + todayKey() + '"><label for="coldTimeIn">시각</label><input type="time" id="coldTimeIn"><button type="button" class="reset" id="coldAdd">기록 추가</button></div>';
    box.innerHTML = h;
  }

  /* ---- 점장님 전달 사항 ---- */
  function renderNotices() {
    const box = document.getElementById('noticeList');
    if (!box) return;
    const open = S.notices.filter(function (n) { return !n.pin && !n.done; }).length;
    const pins = S.notices.filter(function (n) { return n.pin; }).length;
    document.getElementById('noticeCnt').textContent = S.notices.length ? (pins ? '고정 ' + pins + ' · ' : '') + open + '개 남음' : '';
    document.getElementById('noticeClear').hidden = !S.notices.some(function (n) { return n.done && !n.pin; });
    const order = S.notices.map(function (n, i) { return i; }).sort(function (a, b) { return (S.notices[b].pin ? 1 : 0) - (S.notices[a].pin ? 1 : 0) || a - b; });
    box.innerHTML = S.notices.length ? order.map(function (i) {
      const n = S.notices[i];
      return '<div class="notice' + (n.pin ? ' pinned' : n.done ? ' done' : '') + '"><label class="ntext">' +
        (n.pin ? '<span aria-hidden="true">📌</span>' : '<input type="checkbox" data-nchk="' + i + '"' + (n.done ? ' checked' : '') + '>') +
        '<span>' + esc(n.t) + '</span></label>' +
        '<button type="button" class="pin" data-npin="' + i + '" aria-pressed="' + (n.pin ? 'true' : 'false') + '" aria-label="' + (n.pin ? '고정 해제' : '위에 고정') + '">📌</button>' +
        '<button type="button" class="rm" data-ndel="' + i + '" aria-label="전달 사항 지우기">×</button></div>';
    }).join('') : '<p class="none">폐기 규칙처럼 계속 봐야 하는 건 📌로 고정해 두세요. 고정한 글은 항상 맨 위에 남아요.</p>';
  }
  function addNotice() {
    const inp = document.getElementById('noticeIn'), t = inp.value.trim();
    if (!t) return;
    S.notices.push({ t: t, done: false, pin: false });
    inp.value = '';
    save(); renderNotices();
    inp.focus();
  }
  app.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.target.id === 'noticeIn') { e.preventDefault(); addNotice(); }
  });

  /* ---- 지난 근무와 재고 비교 ---- */
  function dayLabel(key) { const p = key.split('-'); return Number(p[1]) + '/' + Number(p[2]) + ' (' + DAYS[keyDow(key)] + ')'; }
  function prevRecord() {
    const tk = todayKey();
    let best = null;
    Object.keys(S.history).forEach(function (k) {
      const r = S.history[k];
      if (k < tk && r && Array.isArray(r.coins) && Array.isArray(r.gift) && (!best || k > best.k)) best = { k: k, r: r };
    });
    return best;
  }
  function renderCompare() {
    const box = document.getElementById('compare');
    if (!box) return;
    const pv = prevRecord();
    const h = '<div class="sh"><h2>지난 근무와 비교</h2><span class="tot">' + (pv ? dayLabel(pv.k) + ' 기록' : '') + '</span></div>';
    if (!pv) { box.innerHTML = h + '<p class="none">비교할 지난 기록이 없어요. 오늘 글을 복사해 두면 다음 근무부터 비교해 줘요.</p>'; return; }
    const rd = !!(S.readNext && S.readNext[pv.k]);
    const pnHtml = pv.r.next ? '<div class="pnote"><b>지난 근무자가 남긴 인수인계</b><p>' + esc(pv.r.next).replace(/\n/g, '<br>') + '</p>' +
      '<label class="chk" style="margin-top:6px"><input type="checkbox" data-nread="' + pv.k + '"' + (rd ? ' checked' : '') + '> 읽었어요</label></div>' : '';
    let rows = '', flags = '';
    function row(lab, a, b, unit) {
      if (a === b) return;
      const d = b - a;
      rows += '<div class="cmp ' + (d < 0 ? 'down' : 'up') + '"><span>' + lab + '</span><b>' + a + ' → ' + b + unit + ' (' + (d < 0 ? '▼' : '▲') + Math.abs(d) + ')</b></div>';
    }
    if (on('coins')) COINS.forEach(function (c, i) { row('동전 (' + c.v + '×' + c.n + ')', pv.r.coins[i] || 0, S.coins[i], '개'); });
    if (on('gift')) GIFT.forEach(function (g, i) {
      const a = pv.r.gift[i] || 0, b = S.gift[i], sold = S.giftSold[i], drop = a - b;
      row('상품권 ' + g.t, a, b, '장');
      if (sold > 0 && drop < sold) {
        flags += '<p class="flag">' + g.t + ' 판매를 ' + sold + '장 적었는데 재고는 ' + (drop > 0 ? drop + '장만 줄었어요' : drop === 0 ? '그대로예요' : '늘었어요') + '. 입고한 게 아니면 다시 세어 보세요.</p>';
      }
    });
    box.innerHTML = h + pnHtml + (rows ? '<div class="cmps">' + rows + '</div>' : '<p class="none">동전과 상품권 재고가 지난 근무와 같아요.</p>') + flags;
  }

  /* ---- 지금 근무: 남은 시간과 번 돈 ---- */
  let liveHint = null;
  function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + (d.getHours() < 5 ? 1440 : 0); }
  function tick() {
    const mainEl = document.getElementById('liveMain');
    if (!mainEl) return;
    const d = new Date(), sh = shiftOn(todayKey()), m = nowMin(), w = S.wage || 0;
    const earnEl = document.getElementById('liveEarn'), track = document.getElementById('liveTrack');
    let mainT = '', subT = '', earn = null, pct = 0, hint = false;
    if (!sh) {
      mainT = '오늘은 근무 없는 날이에요';
      const base = shiftDate();
      for (let i = 1; i <= 21; i++) {
        const nd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), ns = shiftOn(ymd(nd));
        if (ns) { subT = '다음 근무 ' + (nd.getMonth() + 1) + '/' + nd.getDate() + ' (' + DAYS[nd.getDay()] + ') ' + fmtShift(ns) + ' · ' + i + '일 뒤'; break; }
      }
    } else {
      const len = sh.e - sh.s, total = Math.round(w * len / 60);
      hint = !w;
      if (m < sh.s) {
        mainT = '근무 시작까지 ' + dur(Math.ceil(sh.s - m));
        subT = '오늘 근무 ' + fmtShift(sh) + ' · 총 ' + dur(len);
        if (w) earn = ['예상 일당', won(total) + '원'];
      } else if (m < sh.e) {
        pct = (m - sh.s) / len * 100;
        mainT = '퇴근까지 ' + dur(Math.ceil(sh.e - m)) + ' 남았어요';
        subT = dur(m - sh.s) + ' 일했어요 · ' + Math.floor(pct) + '% · ' + fmtShift(sh) + (w ? ' · 예상 ' + won(total) + '원' : '');
        if (w) earn = ['오늘 번 돈', won(Math.floor(w * (m - sh.s) / 60)) + '원'];
      } else {
        pct = 100;
        mainT = '오늘 근무 끝. 수고했어요';
        subT = '총 ' + dur(len) + ' 근무 · ' + fmtShift(sh);
        if (w) earn = ['오늘 번 돈', won(total) + '원'];
      }
    }
    document.getElementById('liveClock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    mainEl.textContent = mainT;
    document.getElementById('liveSub').textContent = subT;
    earnEl.innerHTML = earn ? '<span class="ek">' + earn[0] + '</span><span class="en">' + earn[1] + '</span>' : '';
    earnEl.hidden = !earn;
    track.hidden = !sh;
    track.setAttribute('aria-valuenow', String(Math.floor(pct)));
    document.getElementById('liveFill').style.width = pct + '%';
    if (hint !== liveHint) {
      liveHint = hint;
      document.getElementById('liveHint').innerHTML = hint ? '<button type="button" class="linkbtn" data-go="wage">시급을 넣으면 오늘 번 돈이 보여요. 시급 입력하기</button>' : '';
    }
  }

  /* ---- 달 근무시간과 급여 ---- */
  function monthStats() {
    const days = new Date(calY, calM + 1, 0).getDate(), tk = todayKey(), nm = nowMin();
    let cnt = 0, total = 0, done = 0;
    for (let d = 1; d <= days; d++) {
      const key = calY + '-' + pad(calM + 1) + '-' + pad(d), sh = shiftOn(key);
      if (!sh) continue;
      const len = sh.e - sh.s;
      cnt++; total += len;
      if (key < tk) done += len;
      else if (key === tk) done += Math.min(Math.max(nm - sh.s, 0), len);
    }
    return { cnt: cnt, total: total, done: done };
  }
  function renderPay() {
    const box = document.getElementById('pay');
    if (!box) return;
    box.innerHTML = '<div class="sh"><h2>' + (calM + 1) + '월 근무·급여</h2><span class="tot">세전 대략값</span></div>' +
      '<div class="line"><label class="lab" for="wage">시급</label><span class="wagebox"><input id="wage" inputmode="numeric" value="' + (S.wage || '') + '" placeholder="0"> 원</span></div>' +
      '<div class="line"><span class="lab">근무</span><span class="val" id="payDays"></span></div>' +
      '<div class="line"><span class="lab">지금까지 번 돈</span><span class="val" id="payDone"></span></div>' +
      '<div class="line"><span class="lab">이 달 예상 합계</span><span class="val big" id="payTotal"></span></div>' +
      '<p class="none">휴게시간, 주휴수당, 세금은 넣지 않은 값이에요. 달력에서 근무를 바꾸면 여기에도 반영돼요.</p>';
    updatePay();
  }
  function updatePay() {
    const st = monthStats(), w = S.wage || 0, q = function (id) { return document.getElementById(id); };
    if (!q('payDays')) return;
    q('payDays').textContent = st.cnt + '일 · ' + dur(st.total);
    q('payDone').textContent = w ? won(Math.floor(w * st.done / 60)) + '원' : '시급을 넣어 주세요';
    q('payTotal').textContent = w ? won(Math.round(w * st.total / 60)) + '원' : '-';
  }
  document.getElementById('view-cal').addEventListener('input', function (e) {
    const id = e.target.id;
    if (id === 'wage') { S.wage = Number(digits(e.target.value)) || 0; save(); updatePay(); tick(); }
    else if (id === 'meName') { S.me.name = e.target.value; save(); updateReport(); }
    else if (id === 'meNo') { S.me.no = digits(e.target.value); save(); updateReport(); }
    else if (id === 'repFuture') { S.repFuture = e.target.checked; save(); updateReport(); }
  });

  /* ---- 점장님께 보내는 월 근무시간 보고 ---- */
  function monthReport() {
    const days = new Date(calY, calM + 1, 0).getDate(), tk = todayKey(), lines = [];
    let total = 0;
    for (let d = 1; d <= days; d++) {
      const key = calY + '-' + pad(calM + 1) + '-' + pad(d), sh = shiftOn(key);
      if (!sh || (S.repFuture === false && key > tk)) continue;
      const len = sh.e - sh.s;
      total += len;
      lines.push((calM + 1) + '월 ' + d + '일 ' + DAYS[new Date(calY, calM, d).getDay()] + '요일 (' + toInput(sh.s) + '~' + toInput(sh.e) + ') ' + dur(len));
    }
    const nm = (S.me.name || '').trim(), no = (S.me.no || '').trim();
    if (!lines.length) return calY + '년 ' + (calM + 1) + '월은 보고할 근무가 없어요.';
    return ['안녕하세요.',
      'CU에서 ' + (no ? no + '번으로 ' : '') + '근무하고 ' + (nm ? '있는 ' + nm + '입니다.' : '있습니다.'),
      '이번 달 근무시간 말씀드리겠습니다.',
      '이번 한 달도 감사합니다.',
      '',
      calY + '년 ' + (calM + 1) + '월 총 ' + dur(total) + ' 근무했습니다.',
      ''].concat(lines).join('\n');
  }
  function updateReport() {
    const el = document.getElementById('repText');
    if (el) el.textContent = monthReport();
  }
  function renderMonthReport() {
    const box = document.getElementById('monthReport');
    if (!box) return;
    box.innerHTML = '<div class="sh"><h2>' + (calM + 1) + '월 근무시간 보고</h2><span class="tot">점장님께 보낼 글</span></div>' +
      '<div class="fields"><label class="fld">이름<input class="rowin" id="meName" value="' + esc(S.me.name || '') + '" autocomplete="off"></label>' +
      '<label class="fld">번호<input class="rowin num" id="meNo" inputmode="numeric" value="' + esc(S.me.no || '') + '" autocomplete="off"></label></div>' +
      '<label class="chk"><input type="checkbox" id="repFuture"' + (S.repFuture === false ? '' : ' checked') + '> 아직 오지 않은 근무도 포함</label>' +
      '<pre class="receipt" id="repText"></pre>' +
      '<div class="recbtns" style="margin-top:10px"><button type="button" class="reset" id="repCopy">보고 글 복사</button></div>';
    updateReport();
  }

  let calY, calM, calSel, delArmed = false, delTimer;
  (function () { const d = shiftDate(); calY = d.getFullYear(); calM = d.getMonth(); calSel = ymd(d); })();

  function renderCal() {
    const box = document.getElementById('cal');
    const days = new Date(calY, calM + 1, 0).getDate(), lead = new Date(calY, calM, 1).getDay(), tk = todayKey();
    let work = 0, rec = 0, cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const key = calY + '-' + pad(calM + 1) + '-' + pad(d), dow = new Date(calY, calM, d).getDay();
      const sh = shiftOn(key), r = S.history[key];
      let cls = 'day', dot = 'none';
      if (sh) { work++; dot = ''; cls += ' work'; }
      if (S.ov[key]) cls += ' chg';
      if (r) { rec++; dot = 'rec'; } else if (sh && key < tk) dot = 'miss';
      if (key === tk) cls += ' today';
      if (key === calSel) cls += ' sel';
      cells += '<button type="button" class="' + cls + '" data-day="' + key + '" aria-label="' + (calM + 1) + '월 ' + d + '일 ' + DAYS[dow] + '요일' + (sh ? ', 근무 ' + fmtShift(sh) : '') + (S.ov[key] ? ', 바꾼 날' : '') + (r ? ', 기록 있음' : '') + '"' + (key === calSel ? ' aria-pressed="true"' : '') + '>' + d + '<i class="dot ' + dot + '"></i></button>';
    }
    box.innerHTML =
      '<div class="cal-head"><button type="button" class="nav" data-cal="-1" aria-label="이전 달">‹</button><strong>' + calY + '년 ' + (calM + 1) + '월</strong><button type="button" class="nav" data-cal="1" aria-label="다음 달">›</button></div>' +
      '<p class="cal-sum">근무 ' + work + '일 · 저장된 기록 ' + rec + '일</p>' +
      '<div class="dow">' + DAYS.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<div class="grid">' + cells + '</div>' +
      '<div class="legend"><span><i class="dot"></i>근무일</span><span><i class="swatch"></i>바꾼 날</span><span><i class="dot rec"></i>기록 저장됨</span><span><i class="dot miss"></i>지난 근무일인데 기록 없음</span></div>';
    renderDetail();
    renderPay();
    renderMonthReport();
    renderColdSheet();
  }

  function renderDetail() {
    const box = document.getElementById('calDetail'), p = calSel.split('-');
    const dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])), sh = shiftOn(calSel), r = S.history[calSel];
    delArmed = false; clearTimeout(delTimer);
    let h = '<div class="sh"><h2>' + (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일 (' + DAYS[dt.getDay()] + ')</h2><span class="tot">' + (sh ? fmtShift(sh) : '근무 없는 날') + '</span></div>';
    if (r) {
      const at = r.at ? new Date(r.at) : null;
      h += '<pre class="receipt" id="recText"></pre><div class="recbar"><span class="tot">' + (at && !isNaN(at) ? pad(at.getHours()) + ':' + pad(at.getMinutes()) + ' 저장' : '') + '</span>' +
        '<span class="recbtns"><button type="button" class="reset" id="recCopy">다시 복사</button><button type="button" class="reset" id="recDel">기록 지우기</button></span></div>';
    } else {
      h += '<p class="none">' + (calSel > todayKey() ? '아직 오지 않은 날이에요.' : '저장된 기록이 없어요. 인수인계 글을 복사하면 그날 기록으로 저장돼요.') + '</p>';
    }
    const ov = S.ov[calSel];
    h += '<div class="edit"><h3>근무 바꾸기' + (ov ? ' (바꾼 날)' : '') + '</h3>' +
      '<div class="times"><label for="ovS">시작</label><input type="time" id="ovS" value="' + toInput(sh ? sh.s : 1140) + '"><label for="ovE">끝</label><input type="time" id="ovE" value="' + toInput(sh ? sh.e : 1440) + '"></div>' +
      '<div class="recbtns"><button type="button" class="reset" data-ov="work">이 시간으로 근무</button><button type="button" class="reset" data-ov="off">쉬는 날로 표시</button>' +
      (ov ? '<button type="button" class="reset" data-ov="reset">정기 근무로 되돌리기</button>' : '') + '</div>' +
      '<p class="none">대타를 가거나 쉬게 된 날, 시간이 달라진 날에 써요. 끝이 시작보다 이르면 다음 날 새벽으로 계산해요.</p></div>';
    const dayPh = PH.filter(function (x) { return x.d === calSel; });
    if (dayPh.length) h += '<div class="edit"><h3>그날 올린 사진 ' + dayPh.length + '장</h3><div class="phgrid">' + dayPh.map(function (x) { return '<div class="ph"><img src="' + phUrl(x) + '" alt="' + shortDate(x.d) + ' 사진" data-phview="' + x.id + '"></div>'; }).join('') + '</div></div>';
    box.innerHTML = h;
    if (r) document.getElementById('recText').textContent = r.text;
  }

  function disarmDel() {
    clearTimeout(delTimer); delArmed = false;
    const x = document.getElementById('recDel');
    if (x) { x.classList.remove('armed'); x.textContent = '기록 지우기'; }
  }

  document.getElementById('view-cal').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cal) {
      calM += Number(b.dataset.cal);
      if (calM < 0) { calM = 11; calY--; } else if (calM > 11) { calM = 0; calY++; }
      renderCal();
    } else if (b.dataset.day) {
      calSel = b.dataset.day;
      renderCal();
      const sb = document.querySelector('#cal [data-day="' + calSel + '"]');
      if (sb) sb.focus();
    } else if (b.id === 'recCopy') {
      const r = S.history[calSel];
      if (!r) return;
      const fb = function () {
        const pre = document.getElementById('recText'), rg = document.createRange();
        rg.selectNodeContents(pre);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
        say('글이 선택됐어요. 길게 눌러 복사하세요.');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(r.text).then(function () { say('복사했어요.'); }, fb);
      else fb();
    } else if (b.dataset.cdel) {
      const ck = b.dataset.cdel;
      delete S.cold[ck];
      if (S.tasks.d === ck) S.tasks.time = '';
      save(); renderColdSheet(); renderTasks(); refresh();
    } else if (b.id === 'coldAdd') {
      const dv = document.getElementById('coldDate').value, tv = document.getElementById('coldTimeIn').value;
      if (!dv || !tv) { say('날짜와 시각을 모두 넣어 주세요.'); return; }
      const cm = coldMin(tv);
      S.cold[dv] = cm;
      if (S.tasks.d === dv) S.tasks.time = toInput(cm);
      save(); renderColdSheet(); renderTasks(); refresh();
      say('도착 시각을 기록했어요.');
    } else if (b.dataset.ov) {
      if (b.dataset.ov === 'off') S.ov[calSel] = { off: true };
      else if (b.dataset.ov === 'reset') delete S.ov[calSel];
      else {
        const sv = document.getElementById('ovS').value, ev = document.getElementById('ovE').value;
        if (!sv || !ev) { say('시작과 끝 시각을 넣어 주세요.'); return; }
        const s1 = Number(sv.slice(0, 2)) * 60 + Number(sv.slice(3, 5));
        let e1 = Number(ev.slice(0, 2)) * 60 + Number(ev.slice(3, 5));
        if (e1 <= s1) e1 += 1440;
        S.ov[calSel] = { s: s1, e: e1 };
      }
      save(); renderCal(); renderTasks(); tick();
      say('근무를 바꿨어요.');
    } else if (b.id === 'repCopy') {
      const rt = monthReport();
      const fb2 = function () {
        const pre = document.getElementById('repText'), rg2 = document.createRange();
        rg2.selectNodeContents(pre);
        const sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(rg2);
        say('글이 선택됐어요. 길게 눌러 복사하세요.');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(rt).then(function () { say('보고 글을 복사했어요. 카톡에 붙여넣으세요.'); }, fb2);
      else fb2();
    } else if (b.id === 'recDel') {
      if (!delArmed) {
        delArmed = true; b.classList.add('armed'); b.textContent = '한 번 더 누르면 지워요';
        delTimer = setTimeout(disarmDel, 4000);
      } else {
        delete S.history[calSel]; save(); renderCal(); say('기록을 지웠어요.');
      }
    }
  });

  const bkBox = document.getElementById('bkBox');
  document.getElementById('bkCopy').addEventListener('click', function () {
    const j = JSON.stringify({ v: 4, history: S.history, ov: S.ov, wage: S.wage, notices: S.notices, manual: S.manual, readNext: S.readNext, week: S.week, cfg: S.cfg, exp: S.exp, expCfg: { times: S.expCfg.times }, me: S.me, repFuture: S.repFuture, cold: S.cold });
    bkBox.value = j;
    const fb = function () { bkBox.focus(); bkBox.select(); say('백업 글이 선택됐어요. 길게 눌러 복사하세요.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(j).then(function () { say('백업을 복사했어요. 메모장이나 카톡 나에게 보내기에 붙여넣어 두세요.'); }, fb);
    else fb();
  });
  document.getElementById('bkRestore').addEventListener('click', function () {
    try {
      const o = JSON.parse(bkBox.value);
      let n = 0;
      if (!o || typeof o.history !== 'object' || !o.history) throw new Error('bad');
      Object.keys(o.history).forEach(function (k) {
        const r = o.history[k];
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && r && typeof r.text === 'string') {
          S.history[k] = { text: r.text, at: Number(r.at) || 0 };
          ['coins', 'gift', 'sold'].forEach(function (f) {
            if (Array.isArray(r[f])) S.history[k][f] = r[f].map(function (x) { return Number(x) || 0; });
          });
          n++;
        }
      });
      if (o.ov && typeof o.ov === 'object') {
        Object.keys(o.ov).forEach(function (k) {
          const v = o.ov[k];
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && (v.off === true || (typeof v.s === 'number' && typeof v.e === 'number'))) S.ov[k] = v.off ? { off: true } : { s: v.s, e: v.e };
        });
      }
      if (typeof o.wage === 'number' && o.wage > 0) S.wage = o.wage;
      if (o.cold && typeof o.cold === 'object') {
        Object.keys(o.cold).forEach(function (k) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof o.cold[k] === 'number') S.cold[k] = o.cold[k];
        });
      }
      if (o.me && typeof o.me.name === 'string') S.me = { name: o.me.name, no: String(o.me.no || '') };
      if (typeof o.repFuture === 'boolean') S.repFuture = o.repFuture;
      if (Array.isArray(o.notices)) {
        S.notices = o.notices.filter(function (x) { return x && typeof x.t === 'string'; }).map(function (x) { return { t: x.t, done: !!x.done, pin: !!x.pin }; });
      }
      if (Array.isArray(o.manual)) {
        S.manual = o.manual.filter(function (x) { return x && typeof x.t === 'string' && typeof x.b === 'string'; }).map(function (x) { return { t: x.t, b: x.b }; });
      }
      if (o.readNext && typeof o.readNext === 'object') S.readNext = o.readNext;
      if (Array.isArray(o.exp)) {
        S.exp = o.exp.filter(function (x) { return x && typeof x.n === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.d || ''); }).map(function (x, k) {
          return { id: String(x.id || 'e' + k), n: x.n, d: x.d, t: typeof x.t === 'string' ? x.t : '', in: typeof x.in === 'string' ? x.in : '', q: typeof x.q === 'string' ? x.q : '', chk: Array.isArray(x.chk) ? x.chk.filter(function (m) { return typeof m === 'number'; }) : [], done: !!x.done };
        });
      }
      if (o.expCfg && Array.isArray(o.expCfg.times)) {
        S.expCfg.times = o.expCfg.times.filter(function (t) { return /^\d{2}:\d{2}$/.test(t); });
      }
      if (o.week && typeof o.week === 'object') {
        S.week = {};
        Object.keys(o.week).forEach(function (k) {
          const w = o.week[k];
          if (/^[0-6]$/.test(k) && w && typeof w.s === 'number' && typeof w.e === 'number') S.week[k] = { s: w.s, e: w.e };
        });
      } else if (o.v !== undefined && !o.week) { S.week = JSON.parse(JSON.stringify(LEGACY_WEEK)); }
      if (o.cfg && typeof o.cfg === 'object' && Array.isArray(o.cfg.bags) && Array.isArray(o.cfg.stickers)) {
        S.cfg = {
          hide: (o.cfg.hide && typeof o.cfg.hide === 'object') ? o.cfg.hide : {},
          bags: o.cfg.bags.map(String),
          stickers: o.cfg.stickers.map(Number).filter(Boolean),
          custom: (Array.isArray(o.cfg.custom) ? o.cfg.custom : []).filter(function (c) { return c && typeof c.t === 'string' && Array.isArray(c.items); }).map(function (c, k) { return { id: String(c.id || 'c' + k), t: c.t, items: c.items.map(String) }; })
        };
        applyCfg(S.cfg);
        S.bags = BAGS.map(function () { return 0; });
        S.stickers = STICKERS.map(function () { return 0; });
        S.cc = {};
        build(); refresh();
      }
      save(); renderCal(); renderNotices(); renderManual(); renderExp(); applyTabs(); tick();
      say(n + '일치 기록과 설정을 불러왔어요.');
    } catch (err) {
      say('백업 글을 읽지 못했어요. 복사한 내용 전체를 붙여넣었는지 확인하세요.');
    }
  });

  const tabR = document.getElementById('tab-report'), tabC = document.getElementById('tab-cal'), tabM = document.getElementById('tab-man'), tabS = document.getElementById('tab-set'), tabE = document.getElementById('tab-exp');
  /* ---- 업무 매뉴얼 ---- */
  let manEdit = -1;
  function manSay(m) { document.getElementById('manStatus').textContent = m; }
  function renderManual() {
    const box = document.getElementById('manualBox');
    if (!box) return;
    const cur = manEdit >= 0 ? S.manual[manEdit] : null;
    let h = '<div class="sh"><h2>업무 매뉴얼</h2><span class="tot">' + (S.manual.length ? S.manual.length + '개' : '') + '</span></div>';
    h += S.manual.length ? S.manual.map(function (m, i) {
      return '<details class="man"><summary>' + esc(m.t) + '</summary><p class="mbody">' + esc(m.b).replace(/\n/g, '<br>') + '</p>' +
        '<div class="recbtns"><button type="button" class="reset" data-medit="' + i + '">수정</button><button type="button" class="reset" data-mdel="' + i + '">삭제</button></div></details>';
    }).join('') : '<p class="none">택배 접수, 상품권 판매처럼 자주 묻는 방법을 한 번 적어 두면 계속 꺼내 볼 수 있어요.</p>';
    h += '<div class="mform"><input class="rowin" id="manT" placeholder="제목 (예: 택배 접수)" aria-label="매뉴얼 제목" autocomplete="off" value="' + esc(cur ? cur.t : '') + '">' +
      '<textarea class="note" id="manB" placeholder="방법을 순서대로 적어요" aria-label="매뉴얼 내용">' + esc(cur ? cur.b : '') + '</textarea>' +
      '<div class="recbtns"><button type="button" class="reset" id="manSave">' + (cur ? '수정 저장' : '매뉴얼 추가') + '</button>' + (cur ? '<button type="button" class="reset" id="manCancel">취소</button>' : '') + '</div></div>';
    box.innerHTML = h;
  }
  document.getElementById('view-man').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'manSave') {
      const t = document.getElementById('manT').value.trim(), body = document.getElementById('manB').value.trim();
      if (!t || !body) { manSay('제목과 내용을 모두 적어 주세요.'); return; }
      if (manEdit >= 0) S.manual[manEdit] = { t: t, b: body }; else S.manual.push({ t: t, b: body });
      manEdit = -1; save(); renderManual(); manSay('매뉴얼을 저장했어요.');
    } else if (b.id === 'manCancel') {
      manEdit = -1; renderManual();
    } else if (b.dataset.medit !== undefined) {
      manEdit = Number(b.dataset.medit); renderManual();
      document.getElementById('manT').focus();
    } else if (b.dataset.mdel !== undefined) {
      S.manual.splice(Number(b.dataset.mdel), 1); manEdit = -1; save(); renderManual();
    }
  });
  /* ---- 사진 (IndexedDB에 줄여서 저장) ---- */
  let PH = [], phDb = null, phOk = true;
  const phUrls = {};
  function phUrl(rec) { if (!phUrls[rec.id]) phUrls[rec.id] = URL.createObjectURL(rec.blob); return phUrls[rec.id]; }
  function phOpen() {
    return new Promise(function (res) {
      try {
        const r = indexedDB.open('handover-photos', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('p', { keyPath: 'id' }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (err) { res(null); }
    });
  }
  function phTx(mode, fn) {
    return new Promise(function (res) {
      if (!phDb) { res(null); return; }
      try {
        const tx = phDb.transaction('p', mode), st = tx.objectStore('p'), rq = fn(st);
        tx.oncomplete = function () { res(rq ? rq.result : true); };
        tx.onerror = function () { res(null); };
        tx.onabort = function () { res(null); };
      } catch (err) { res(null); }
    });
  }
  function phShrink(file) {
    return new Promise(function (res, rej) {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        const sc = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) res(b); else rej(new Error('blob')); }, 'image/jpeg', 0.75);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  function phSay(m) { const e = document.getElementById('phStatus'); if (e) e.textContent = m; }
  function renderPhotos() {
    const box = document.getElementById('photoBox');
    if (!box) return;
    const today = PH.filter(function (x) { return x.d === todayKey(); });
    box.innerHTML = '<div class="sh"><h2>사진</h2><span class="tot">' + (today.length ? today.length + '장' : '') + '</span></div>' +
      '<p class="none">진열 사진처럼 점장님께 보낼 사진을 올려 두는 곳이에요. 올리면 자동으로 작게 줄여 저장해요.</p>' +
      '<div class="phrow"><label class="phbtn">사진 추가<input type="file" id="phIn" accept="image/*" multiple hidden></label>' +
      (today.length <= PH_GROUP && today.length ? '<button type="button" class="phbtn" data-phshare="0">카톡 등으로 보내기</button>' : '') + '</div>' +
      (today.length > PH_GROUP ? '<p class="none">한 번에 보낼 수 있는 사진 수에 제한이 있어서 ' + PH_GROUP + '장씩 나눠 보내요.</p><div class="phrow">' + Array.apply(null, { length: Math.ceil(today.length / PH_GROUP) }).map(function (_, g) {
        const a = g * PH_GROUP + 1, z = Math.min(today.length, (g + 1) * PH_GROUP);
        return '<button type="button" class="phbtn" data-phshare="' + g * PH_GROUP + '">' + a + '~' + z + '번 보내기</button>';
      }).join('') + '</div>' : '') +
      (today.length ? '<div class="phgrid">' + today.sort(function (a, b) { return a.at - b.at; }).map(function (x) {
        return '<div class="ph"><img src="' + phUrl(x) + '" alt="오늘 올린 사진" data-phview="' + x.id + '"><button type="button" class="rm" data-phdel="' + x.id + '" aria-label="사진 지우기">×</button></div>';
      }).join('') + '</div>' : '') +
      '<p class="calstatus" id="phStatus" role="status" aria-live="polite">' + (phOk ? '' : '이 브라우저에서는 사진을 저장할 수 없어서, 창을 닫으면 사라져요.') + '</p>';
  }
  function phAdd(files) {
    const list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { phSay('사진 파일을 골라 주세요.'); return; }
    phSay('사진을 줄이는 중이에요…');
    let chain = Promise.resolve(), fail = 0;
    list.forEach(function (f) {
      chain = chain.then(function () { return phShrink(f); }).then(function (blob) {
        const rec = { id: 'p' + Date.now() + Math.floor(Math.random() * 1000), d: todayKey(), at: Date.now(), blob: blob };
        PH.push(rec);
        return phTx('readwrite', function (st) { return st.put(rec); });
      }).catch(function () { fail++; });
    });
    chain.then(function () {
      renderPhotos();
      try { renderDetail(); } catch (err) {}
      phSay(fail ? fail + '장은 올리지 못했어요.' : list.length + '장 올렸어요.');
    });
  }
  function phDelete(id) {
    PH = PH.filter(function (x) { return x.id !== id; });
    if (phUrls[id]) { URL.revokeObjectURL(phUrls[id]); delete phUrls[id]; }
    phTx('readwrite', function (st) { return st.delete(id); });
    renderPhotos();
    try { renderDetail(); } catch (err) {}
  }
  const PH_GROUP = 10;
  function phShare(start) {
    const today = PH.filter(function (x) { return x.d === todayKey(); }).sort(function (a, b) { return a.at - b.at; });
    const part = today.slice(start, start + PH_GROUP);
    const files = part.map(function (x, i) { return new File([x.blob], todayKey() + '_' + (start + i + 1) + '.jpg', { type: 'image/jpeg' }); });
    if (!navigator.share) { phSay('이 브라우저는 바로 보내기를 지원하지 않아요. 사진을 눌러 크게 연 뒤 길게 눌러 저장하고 카톡에서 보내 주세요.'); return; }
    try {
      if (navigator.canShare && !navigator.canShare({ files: files })) {
        phSay('이 브라우저는 사진 보내기를 지원하지 않아요. 사진을 눌러 크게 연 뒤 길게 눌러 저장하고 카톡에서 보내 주세요.');
        return;
      }
      navigator.share({ files: files, title: '근무교대 사진' }).then(function () {
        phSay((start + 1) + '~' + (start + part.length) + '번 사진을 보냈어요.');
      }).catch(function (err) {
        if (err && err.name === 'AbortError') { phSay('보내기를 취소했어요.'); return; }
        phSay('보내지 못했어요 (' + (err && err.name ? err.name : '오류') + '). 사진 수를 줄이거나, 공유가 막힌 화면일 수 있어요. 주소창에 직접 연 페이지(github.io)에서 다시 눌러 보세요.');
      });
    } catch (err) {
      phSay('보내지 못했어요 (' + (err && err.name ? err.name : '오류') + ').');
    }
  }
  document.addEventListener('click', function (e) {
    const im = e.target.closest('img[data-phview]');
    if (im) {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = '<img src="' + im.src + '" alt="사진 크게 보기">';
      lb.addEventListener('click', function () { lb.remove(); });
      document.body.appendChild(lb);
    }
  });
  phOpen().then(function (db) {
    phDb = db;
    if (!db) { phOk = false; renderPhotos(); return null; }
    return phTx('readonly', function (st) { return st.getAll(); }).then(function (all) {
      const cut = new Date(); cut.setDate(cut.getDate() - 60);
      const ck = ymd(cut);
      PH = (all || []).filter(function (x) {
        if (x.d < ck) { phTx('readwrite', function (st) { return st.delete(x.id); }); return false; }
        return true;
      });
      renderPhotos();
      if (typeof renderDetail === 'function' && calSel) { try { renderDetail(); } catch (err) {} }
    });
  });
  /* ---- 소비기한 관리 ---- */
  const EXG = ['지난 상품 · 폐기 대상', '오늘까지', '내일까지', '3일 이내', '그 이후'];
  function pdate(key) { const p = key.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function expDays(it) { return Math.round((pdate(it.d) - pdate(todayKey())) / 86400000); }
  function expAt(it) {
    const p = it.d.split('-'), t = (it.t || '23:59').split(':');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(t[0]), Number(t[1])).getTime();
  }
  function expGroup(it) { const d = expDays(it); return d < 0 ? 0 : d === 0 ? 1 : d === 1 ? 2 : d <= 3 ? 3 : 4; }
  function checkedToday(it) { return (it.chk || []).some(function (ms) { return ymd(new Date(ms - 5 * 3600000)) === todayKey(); }); }
  function shortDate(key) { return Number(key.split('-')[1]) + '/' + Number(key.split('-')[2]) + ' (' + DAYS[keyDow(key)] + ')'; }
  function hhmm(ms) { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function expSay(m) { document.getElementById('expStatus').textContent = m; }
  function expItemHtml(it, g) {
    const d = expDays(it);
    let badge = d < 0 ? '기한 ' + (-d) + '일 지남' : d === 0 ? '오늘' : d === 1 ? '내일' : 'D-' + d;
    if (d === 0 && it.t && Date.now() > expAt(it)) badge = '시간 지남';
    const last = (it.chk || []).length ? it.chk[it.chk.length - 1] : 0;
    const st = checkedToday(it) ? '오늘 확인 ' + hhmm(last) + ' · 총 ' + it.chk.length + '회' : (it.chk || []).length ? '오늘 미확인 · 마지막 ' + shortDate(ymd(new Date(last - 5 * 3600000))) + ' ' + hhmm(last) : '아직 확인 안 함';
    return '<div class="ex g' + g + '"><div class="exh"><b>' + esc(it.n) + (it.q ? ' × ' + esc(it.q) : '') + '</b><span class="exd">' + badge + '</span></div>' +
      '<p class="exm">소비기한 ' + shortDate(it.d) + (it.t ? ' ' + it.t : '') + (it.in ? ' · 입고 ' + shortDate(it.in) : '') + '</p>' +
      '<p class="exm">' + st + '</p>' +
      '<div class="exb"><button type="button" class="reset" data-echk="' + it.id + '">확인했어요</button>' +
      (checkedToday(it) ? '<button type="button" class="linkbtn" data-eundo="' + it.id + '">확인 취소</button>' : '') +
      '<label class="chk"><input type="checkbox" data-edone="' + it.id + '"> 폐기·처리 완료</label>' +
      '<button type="button" class="rm" data-edel="' + it.id + '" aria-label="' + esc(it.n) + ' 지우기">×</button></div></div>';
  }
  function renderExp() {
    const list = document.getElementById('expList');
    if (!list) return;
    const act = S.exp.filter(function (x) { return !x.done; }).sort(function (a, b) { return expAt(a) - expAt(b); });
    const cnt = [0, 0, 0, 0, 0];
    act.forEach(function (x) { cnt[expGroup(x)]++; });
    const unchecked = act.filter(function (x) { return expDays(x) <= 1 && !checkedToday(x); }).length;
    document.getElementById('expSum').innerHTML = '<div class="sh"><h2>오늘 확인 현황</h2><span class="tot">' + act.length + '개 관리 중</span></div>' +
      (act.length ? '<p class="exsum">' + EXG.slice(0, 4).map(function (n, i) { return '<span>' + n.replace(' · 폐기 대상', '') + ' <b>' + cnt[i] + '</b></span>'; }).join('') + '</p>' +
      '<p class="exm">' + (unchecked ? '오늘·내일 기한인데 아직 확인 안 한 상품이 ' + unchecked + '개 있어요.' : '오늘 확인이 필요한 상품은 모두 확인했어요.') + '</p>' : '<p class="none">아직 등록한 상품이 없어요. 위에서 상품명과 소비기한을 넣으면 기한이 빠른 순서대로 정리돼요.</p>');
    list.innerHTML = EXG.map(function (name, g) {
      const items = act.filter(function (x) { return expGroup(x) === g; });
      if (!items.length) return '';
      return '<section class="sheet"><div class="sh"><h2>' + name + '</h2><span class="tot">' + items.length + '개</span></div>' + items.map(function (x) { return expItemHtml(x, g); }).join('') + '</section>';
    }).join('');
    const done = S.exp.filter(function (x) { return x.done; });
    document.getElementById('expDone').innerHTML = done.length ? '<details><summary class="linkbtn">처리 완료 ' + done.length + '개 보기</summary>' + done.map(function (x) {
      return '<div class="ex"><div class="exh"><b>' + esc(x.n) + '</b><span class="exd">' + shortDate(x.d) + '</span></div><div class="exb"><label class="chk"><input type="checkbox" data-edone="' + x.id + '" checked> 처리 완료</label><button type="button" class="rm" data-edel="' + x.id + '" aria-label="' + esc(x.n) + ' 지우기">×</button></div></div>';
    }).join('') + '<button type="button" class="add" id="exClear">처리 완료 모두 지우기</button></details>' : '';
    const names = []; S.exp.forEach(function (x) { if (names.indexOf(x.n) < 0) names.push(x.n); });
    document.getElementById('exNames').innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    const canNotify = typeof window.Notification === 'function';
    document.getElementById('expCfg').innerHTML = '<div class="sh"><h2>확인 알림 시간</h2></div><div class="chips">' + S.expCfg.times.map(function (t, i) {
      return '<span class="chip">' + t + '<button type="button" data-etdel="' + i + '" aria-label="' + t + ' 알림 빼기">×</button></span>';
    }).join('') + '</div><div class="addrow"><input class="rowin" type="time" id="exTimeIn" aria-label="알림 시간 추가"><button type="button" class="reset" id="exTimeAdd">추가</button></div>' +
      (canNotify && Notification.permission === 'default' ? '<button type="button" class="add" id="exPerm">브라우저 알림 허용하기</button>' : '') +
      '<p class="none">이 앱을 열어 둔 상태에서만 알려줘요. 화면 위에 안내가 뜨고, 알림을 허용하면 팝업과 진동도 와요. 앱을 닫아 두면 못 울리니 중요한 시간은 폰 알람도 함께 맞춰 두세요.</p>';
    expTick();
  }
  let expBdgN = -1;
  function expNotify(msg) {
    try { if (typeof window.Notification === 'function' && Notification.permission === 'granted') new Notification('소비기한 확인', { body: msg }); } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
  function expTick() {
    const tk = todayKey();
    Object.keys(S.expCfg.fired).forEach(function (k) { if (k.indexOf(tk) !== 0) delete S.expCfg.fired[k]; });
    const urgent = S.exp.filter(function (x) { return !x.done && expDays(x) <= 1; });
    const n = urgent.filter(function (x) { return !checkedToday(x); }).length;
    if (n !== expBdgN) { expBdgN = n; document.getElementById('expBdg').innerHTML = n ? '<span class="bdg">' + n + '</span>' : ''; }
    const nm = nowMin(), ban = document.getElementById('expBanner');
    let due = null;
    S.expCfg.times.forEach(function (t) {
      const m = coldMin(t);
      if (m !== null && nm >= m && nm < m + 30 && (!due || m > due.m)) due = { t: t, m: m };
    });
    let pending = [];
    if (due) {
      const alarmMs = Date.now() - (nm - due.m) * 60000;
      pending = urgent.filter(function (x) { return !(x.chk || []).some(function (ms) { return ms >= alarmMs; }); });
      const key = tk + ' ' + due.t;
      if (!S.expCfg.fired[key]) {
        S.expCfg.fired[key] = 1; save();
        if (pending.length) expNotify(due.t + ' 소비기한 확인 시간이에요. 확인할 상품 ' + pending.length + '개');
      }
    }
    if (due && pending.length && on('expiry')) {
      ban.hidden = false;
      ban.innerHTML = due.t + ' 소비기한 확인 시간이에요 · 확인할 상품 ' + pending.length + '개 <button type="button" class="reset" id="expGo">보러 가기</button>';
    } else ban.hidden = true;
  }
  document.getElementById('expBanner').addEventListener('click', function (e) { if (e.target.id === 'expGo') showTab('exp'); });
  document.getElementById('view-exp').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    const find = function (id) { return S.exp.filter(function (x) { return x.id === id; })[0]; };
    if (b.id === 'exAdd') {
      const n = document.getElementById('exName').value.trim(), d = document.getElementById('exDate').value;
      if (!n || !d) { expSay('상품명과 소비기한을 넣어 주세요.'); return; }
      S.exp.push({ id: 'e' + Date.now() + Math.floor(Math.random() * 1000), n: n, d: d, t: document.getElementById('exTime').value, in: document.getElementById('exIn').value, q: digits(document.getElementById('exQty').value), chk: [], done: false });
      document.getElementById('exName').value = ''; document.getElementById('exQty').value = ''; document.getElementById('exTime').value = '';
      expSay(n + ' 추가했어요.'); save(); renderExp();
      document.getElementById('exName').focus();
    } else if (b.dataset.echk) {
      const it = find(b.dataset.echk); it.chk.push(Date.now()); save(); renderExp();
    } else if (b.dataset.eundo) {
      const it = find(b.dataset.eundo); it.chk.pop(); save(); renderExp();
    } else if (b.dataset.edel) {
      S.exp = S.exp.filter(function (x) { return x.id !== b.dataset.edel; }); save(); renderExp();
    } else if (b.id === 'exClear') {
      S.exp = S.exp.filter(function (x) { return !x.done; }); save(); renderExp();
    } else if (b.dataset.etdel) {
      S.expCfg.times.splice(Number(b.dataset.etdel), 1); save(); renderExp();
    } else if (b.id === 'exTimeAdd') {
      const v = document.getElementById('exTimeIn').value;
      if (!v || S.expCfg.times.indexOf(v) >= 0) return;
      S.expCfg.times.push(v); S.expCfg.times.sort(); save(); renderExp();
    } else if (b.id === 'exPerm') {
      try { Notification.requestPermission().then(function () { renderExp(); }); } catch (err) { expSay('이 브라우저에서는 알림을 허용할 수 없어요.'); }
    }
  });
  document.getElementById('view-exp').addEventListener('change', function (e) {
    if (e.target.dataset.edone) {
      const it = S.exp.filter(function (x) { return x.id === e.target.dataset.edone; })[0];
      if (it) { it.done = e.target.checked; save(); renderExp(); }
    }
  });
  function initExpForm() {
    document.getElementById('exDate').value = todayKey();
    document.getElementById('exIn').value = todayKey();
  }
  /* ---- 설정: 항목 켜고 끄기, 규격 고치기, 직접 만드는 항목 ---- */
  function setSay(m) { document.getElementById('setStatus').textContent = m; }
  function renderSettings() {
    const box = document.getElementById('setBox');
    if (!box) return;
    let h = '<div class="sh"><h2>항목 설정</h2></div><p class="none">우리 가게에 없는 항목은 끄고, 필요한 항목은 직접 만들 수 있어요. 끈 항목은 화면과 보고 글에서 빠져요.</p>';
    h += '<div class="setgrp"><h3>정기 근무 요일과 시간</h3><p class="none">근무하는 요일에 체크하고 시간을 넣으면 달력, 남은 시간, 월말 보고에 쓰여요. 끝이 시작보다 이르면 다음 날 새벽으로 계산해요.</p>' +
      [1, 2, 3, 4, 5, 6, 0].map(function (dw) {
        const w = S.week[dw];
        return '<div class="wkrow"><label class="chk"><input type="checkbox" data-wk="' + dw + '"' + (w ? ' checked' : '') + '> ' + DAYS[dw] + '</label>' +
          '<input class="rowin" type="time" data-wks="' + dw + '" value="' + toInput(w ? w.s : 1140) + '" aria-label="' + DAYS[dw] + '요일 시작"' + (w ? '' : ' disabled') + '>' +
          '<input class="rowin" type="time" data-wke="' + dw + '" value="' + toInput(w ? w.e : 1440) + '" aria-label="' + DAYS[dw] + '요일 끝"' + (w ? '' : ' disabled') + '></div>';
      }).join('') + '</div>';
    h += '<div class="setgrp"><h3>보이는 항목</h3>' + SECTIONS.map(function (x) {
      return '<label class="chk"><input type="checkbox" data-shide="' + x[0] + '"' + (on(x[0]) ? ' checked' : '') + '> ' + x[1] + '</label>';
    }).join('') + '</div>';
    h += '<div class="setgrp"><h3>종량제 봉투 규격</h3><div class="chips">' + S.cfg.bags.map(function (b, i) {
      return '<span class="chip">' + esc(b) + '<button type="button" data-sdel="bags:' + i + '" aria-label="' + esc(b) + ' 빼기">×</button></span>';
    }).join('') + '</div><div class="addrow"><input class="rowin" id="bagIn" placeholder="예: 3L" aria-label="추가할 봉투 규격" autocomplete="off"><button type="button" class="reset" data-sadd="bags">추가</button></div></div>';
    h += '<div class="setgrp"><h3>폐기물 스티커 금액</h3><div class="chips">' + S.cfg.stickers.map(function (v, i) {
      return '<span class="chip">' + won(v) + '원<button type="button" data-sdel="stickers:' + i + '" aria-label="' + won(v) + '원 빼기">×</button></span>';
    }).join('') + '</div><div class="addrow"><input class="rowin num" id="stkIn" inputmode="numeric" placeholder="예: 4000" aria-label="추가할 스티커 금액" autocomplete="off"><button type="button" class="reset" data-sadd="stickers">추가</button></div></div>';
    h += '<div class="setgrp"><h3>내가 만드는 항목</h3>';
    h += S.cfg.custom.length ? S.cfg.custom.map(function (c, j) {
      return '<div class="man"><b>' + esc(c.t) + '</b><div class="chips">' + c.items.map(function (n, i) {
        return '<span class="chip">' + esc(n) + '<button type="button" data-sdel="cu:' + j + ':' + i + '" aria-label="' + esc(n) + ' 빼기">×</button></span>';
      }).join('') + '</div><div class="addrow"><input class="rowin" id="cuIn' + j + '" placeholder="세부 항목 추가" aria-label="' + esc(c.t) + ' 세부 항목" autocomplete="off"><button type="button" class="reset" data-sadd="cu:' + j + '">추가</button></div>' +
        '<button type="button" class="linkbtn" data-sdel="cusec:' + j + '">이 항목 통째로 지우기</button></div>';
    }).join('') : '<p class="none">예: 제목 "택배 접수", 세부 항목 "일반 택배, 반값 택배"처럼 적으면 개수 버튼이 생겨요.</p>';
    h += '<div class="mform"><input class="rowin" id="cuT" placeholder="새 항목 제목 (예: 택배 접수)" aria-label="새 항목 제목" autocomplete="off">' +
      '<input class="rowin" id="cuI" placeholder="세부 항목을 쉼표로 (예: 일반 택배, 반값 택배)" aria-label="세부 항목" autocomplete="off">' +
      '<div class="recbtns"><button type="button" class="reset" id="cuAdd">항목 만들기</button></div></div></div>';
    box.innerHTML = h;
  }
  function cfgChanged() { save(); renderSettings(); build(); refresh(); applyTabs(); }
  function weekSave(dw) {
    const row = document.querySelector('[data-wk="' + dw + '"]').closest('.wkrow');
    const on1 = row.querySelector('[data-wk]').checked, a = row.querySelector('[data-wks]'), z = row.querySelector('[data-wke]');
    a.disabled = z.disabled = !on1;
    if (!on1) delete S.week[dw];
    else if (a.value && z.value) {
      const m1 = Number(a.value.slice(0, 2)) * 60 + Number(a.value.slice(3, 5)), m2 = Number(z.value.slice(0, 2)) * 60 + Number(z.value.slice(3, 5));
      S.week[dw] = { s: m1, e: m2 <= m1 ? m2 + 1440 : m2 };
    }
    save(); tick(); setT('shift', shiftText()); setSay('정기 근무를 저장했어요.');
  }
  document.getElementById('view-set').addEventListener('change', function (e) {
    const d = e.target.dataset;
    if (d.wk !== undefined) { weekSave(d.wk); return; }
    if (d.wks !== undefined) { weekSave(d.wks); return; }
    if (d.wke !== undefined) { weekSave(d.wke); return; }
    if (e.target.dataset.shide) {
      if (e.target.checked) delete S.cfg.hide[e.target.dataset.shide]; else S.cfg.hide[e.target.dataset.shide] = true;
      cfgChanged();
    }
  });
  document.getElementById('view-set').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sadd) {
      const k = b.dataset.sadd;
      if (k === 'bags') {
        const v = document.getElementById('bagIn').value.trim();
        if (!v) return;
        if (S.cfg.bags.indexOf(v) >= 0) { setSay('이미 있는 규격이에요.'); return; }
        S.cfg.bags.push(v); S.bags.push(0);
      } else if (k === 'stickers') {
        const v = Number(digits(document.getElementById('stkIn').value));
        if (!v) return;
        if (S.cfg.stickers.indexOf(v) >= 0) { setSay('이미 있는 금액이에요.'); return; }
        const pairs = S.cfg.stickers.map(function (x, i) { return { v: x, c: S.stickers[i] || 0 }; });
        pairs.push({ v: v, c: 0 });
        pairs.sort(function (a, c) { return a.v - c.v; });
        S.cfg.stickers = pairs.map(function (x) { return x.v; });
        S.stickers = pairs.map(function (x) { return x.c; });
        STICKERS = S.cfg.stickers;
      } else if (k.indexOf('cu:') === 0) {
        const j = Number(k.slice(3)), inp = document.getElementById('cuIn' + j), v = inp.value.trim();
        if (!v) return;
        S.cfg.custom[j].items.push(v);
      }
      setSay('');
      cfgChanged();
    } else if (b.dataset.sdel) {
      const p = b.dataset.sdel.split(':');
      if (p[0] === 'bags') { S.cfg.bags.splice(Number(p[1]), 1); S.bags.splice(Number(p[1]), 1); }
      else if (p[0] === 'stickers') { S.cfg.stickers.splice(Number(p[1]), 1); S.stickers.splice(Number(p[1]), 1); }
      else if (p[0] === 'cu') {
        const c = S.cfg.custom[Number(p[1])], arr = cuArr(c, Number(p[1]));
        c.items.splice(Number(p[2]), 1); arr.splice(Number(p[2]), 1);
      } else if (p[0] === 'cusec') {
        const j = Number(p[1]), id = cuId(S.cfg.custom[j], j);
        S.cfg.custom.splice(j, 1);
        delete S.cc[id];
      }
      cfgChanged();
    } else if (b.id === 'cuAdd') {
      const t = document.getElementById('cuT').value.trim();
      const items = document.getElementById('cuI').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!t || !items.length) { setSay('제목과 세부 항목을 하나 이상 적어 주세요.'); return; }
      S.cfg.custom.push({ id: 'c' + Date.now(), t: t, items: items });
      setSay('');
      cfgChanged();
    }
  });
  function showTab(which) {
    const cal = which === 'cal', man = which === 'man', set = which === 'set', exp = which === 'exp';
    document.getElementById('view-report').hidden = cal || man || set || exp;
    document.getElementById('view-cal').hidden = !cal;
    document.getElementById('view-man').hidden = !man;
    document.getElementById('view-set').hidden = !set;
    document.getElementById('view-exp').hidden = !exp;
    document.querySelector('.bar').hidden = cal || man || set || exp;
    tabR.setAttribute('aria-selected', String(!cal && !man && !set && !exp));
    tabE.setAttribute('aria-selected', String(exp));
    tabC.setAttribute('aria-selected', String(cal));
    tabM.setAttribute('aria-selected', String(man));
    tabS.setAttribute('aria-selected', String(set));
    if (cal) renderCal();
    if (man) renderManual();
    if (set) renderSettings();
    if (exp) renderExp();
    window.scrollTo(0, 0);
  }
  tabR.addEventListener('click', function () { showTab('report'); });
  tabC.addEventListener('click', function () { showTab('cal'); });
  tabM.addEventListener('click', function () { showTab('man'); });
  tabS.addEventListener('click', function () { showTab('set'); });
  tabE.addEventListener('click', function () { showTab('exp'); });
  function applyTabs() { tabE.hidden = !on('expiry'); if (!on('expiry') && tabE.getAttribute('aria-selected') === 'true') showTab('report'); }

  document.getElementById('today').textContent = shiftDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  build();
  initExpForm(); applyTabs(); expTick();
  setInterval(tick, 1000);
  setInterval(expTick, 15000);
})();
