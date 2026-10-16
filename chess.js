/* Chess rules engine - works in browser (window.Chess) and Node (require) */
(function (root) {
  const N = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const K = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const B = [[-1,-1],[-1,1],[1,-1],[1,1]], R = [[-1,0],[1,0],[0,-1],[0,1]];
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const sq = (r, c) => 'abcdefgh'[c] + (8 - r);

  function init() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null)), back = 'rnbqkbnr';
    for (let c = 0; c < 8; c++) { b[0][c] = 'b' + back[c]; b[1][c] = 'bp'; b[6][c] = 'wp'; b[7][c] = 'w' + back[c]; }
    return { b, turn: 'w', cas: { wK: 1, wQ: 1, bK: 1, bQ: 1 }, ep: null, half: 0, full: 1 };
  }
  const clone = s => ({ b: s.b.map(r => r.slice()), turn: s.turn, cas: { ...s.cas }, ep: s.ep, half: s.half, full: s.full });

  function attacked(b, r, c, by) {
    const d = by === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) { const rr = r + d, cc = c + dc; if (on(rr, cc) && b[rr][cc] === by + 'p') return true; }
    for (const [dr, dc] of N) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr][cc] === by + 'n') return true; }
    for (const [dr, dc] of K) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr][cc] === by + 'k') return true; }
    for (const [ds, pp] of [[R, 'r'], [B, 'b']]) for (const [dr, dc] of ds) {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc)) {
        const p = b[rr][cc];
        if (p) { if (p[0] === by && (p[1] === pp || p[1] === 'q')) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }
  function kingPos(b, t) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === t + 'k') return [r, c];
  }
  const inCheck = s => { const k = kingPos(s.b, s.turn); return attacked(s.b, k[0], k[1], s.turn === 'w' ? 'b' : 'w'); };

  function gen(s) {
    const { b, turn: t } = s, o = [], e = t === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c]; if (!p || p[0] !== t) continue; const k = p[1];
      const add = (tr, tc, x) => o.push(Object.assign({ fr: r, fc: c, tr, tc }, x));
      if (k === 'p') {
        const d = t === 'w' ? -1 : 1, st = t === 'w' ? 6 : 1, pr = t === 'w' ? 0 : 7;
        const push = (tr, tc, x) => { if (tr === pr) for (const q of 'qrbn') add(tr, tc, Object.assign({ pr: q }, x)); else add(tr, tc, x); };
        if (on(r + d, c) && !b[r + d][c]) { push(r + d, c); if (r === st && !b[r + 2 * d][c]) add(r + 2 * d, c, { dp: 1 }); }
        for (const dc of [-1, 1]) {
          const tr = r + d, tc = c + dc; if (!on(tr, tc)) continue;
          if (b[tr][tc] && b[tr][tc][0] === e) push(tr, tc, { cap: 1 });
          else if (s.ep && s.ep[0] === tr && s.ep[1] === tc) add(tr, tc, { ep: 1, cap: 1 });
        }
      } else if (k === 'n' || k === 'k') {
        for (const [dr, dc] of (k === 'n' ? N : K)) {
          const tr = r + dr, tc = c + dc;
          if (on(tr, tc) && (!b[tr][tc] || b[tr][tc][0] === e)) add(tr, tc, { cap: b[tr][tc] ? 1 : 0 });
        }
        const home = t === 'w' ? 7 : 0;
        if (k === 'k' && r === home && c === 4 && !attacked(b, r, 4, e)) {
          if (s.cas[t + 'K'] && b[r][7] === t + 'r' && !b[r][5] && !b[r][6] && !attacked(b, r, 5, e) && !attacked(b, r, 6, e)) add(r, 6, { ca: 'K' });
          if (s.cas[t + 'Q'] && b[r][0] === t + 'r' && !b[r][1] && !b[r][2] && !b[r][3] && !attacked(b, r, 3, e) && !attacked(b, r, 2, e)) add(r, 2, { ca: 'Q' });
        }
      } else {
        for (const [dr, dc] of (k === 'r' ? R : k === 'b' ? B : R.concat(B))) {
          let tr = r + dr, tc = c + dc;
          while (on(tr, tc)) {
            const q = b[tr][tc];
            if (!q) add(tr, tc, { cap: 0 });
            else { if (q[0] === e) add(tr, tc, { cap: 1 }); break; }
            tr += dr; tc += dc;
          }
        }
      }
    }
    return o;
  }

  function apply(s, m) {
    const n = clone(s), b = n.b, p = b[m.fr][m.fc], t = s.turn;
    b[m.fr][m.fc] = null;
    if (m.ep) b[m.fr][m.tc] = null;
    b[m.tr][m.tc] = m.pr ? t + m.pr : p;
    if (m.ca === 'K') { b[m.tr][5] = b[m.tr][7]; b[m.tr][7] = null; }
    if (m.ca === 'Q') { b[m.tr][3] = b[m.tr][0]; b[m.tr][0] = null; }
    const f = { 60: ['wK', 'wQ'], 56: ['wQ'], 63: ['wK'], 4: ['bK', 'bQ'], 0: ['bQ'], 7: ['bK'] };
    for (const q of [m.fr * 8 + m.fc, m.tr * 8 + m.tc]) for (const x of f[q] || []) n.cas[x] = 0;
    n.ep = m.dp ? [(m.fr + m.tr) / 2, m.fc] : null;
    n.half = (p[1] === 'p' || m.cap) ? 0 : s.half + 1;
    if (t === 'b') n.full++;
    n.turn = t === 'w' ? 'b' : 'w';
    return n;
  }

  function legal(s) {
    const e = s.turn === 'w' ? 'b' : 'w';
    return gen(s).filter(m => { const n = apply(s, m), k = kingPos(n.b, s.turn); return !attacked(n.b, k[0], k[1], e); });
  }

  function status(s) {
    if (!legal(s).length)
      return inCheck(s) ? { result: s.turn === 'w' ? '0-1' : '1-0', reason: 'checkmate' } : { result: '1/2-1/2', reason: 'stalemate' };
    if (s.half >= 100) return { result: '1/2-1/2', reason: '50-move rule' };
    const ps = []; s.b.forEach(r => r.forEach(p => { if (p && p[1] !== 'k') ps.push(p[1]); }));
    if (!ps.length || (ps.length === 1 && (ps[0] === 'n' || ps[0] === 'b'))) return { result: '1/2-1/2', reason: 'insufficient material' };
    return null;
  }

  function san(s, m) {
    const p = s.b[m.fr][m.fc][1]; let t;
    if (m.ca) t = m.ca === 'K' ? 'O-O' : 'O-O-O';
    else {
      let dis = '';
      if (p !== 'p' && p !== 'k') {
        const o = legal(s).filter(x => x.tr === m.tr && x.tc === m.tc && s.b[x.fr][x.fc] === s.b[m.fr][m.fc] && (x.fr !== m.fr || x.fc !== m.fc));
        if (o.length) dis = o.every(x => x.fc !== m.fc) ? 'abcdefgh'[m.fc] : o.every(x => x.fr !== m.fr) ? String(8 - m.fr) : sq(m.fr, m.fc);
      }
      t = (p === 'p' ? (m.cap ? 'abcdefgh'[m.fc] + 'x' : '') : p.toUpperCase() + dis + (m.cap ? 'x' : '')) + sq(m.tr, m.tc) + (m.pr ? '=' + m.pr.toUpperCase() : '');
    }
    const n = apply(s, m), st = status(n);
    if (st && st.reason === 'checkmate') t += '#'; else if (inCheck(n)) t += '+';
    return t;
  }

  const wire = m => ({ f: sq(m.fr, m.fc), t: sq(m.tr, m.tc), p: m.pr || undefined });
  const find = (s, w) => legal(s).find(m => sq(m.fr, m.fc) === w.f && sq(m.tr, m.tc) === w.t && (m.pr || '') === (w.p || ''));

  const E = { init, legal, apply, status, inCheck, san, wire, find, sq, kingPos };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Chess = E;
})(typeof window !== 'undefined' ? window : globalThis);
