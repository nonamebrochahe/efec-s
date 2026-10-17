/*
  Efecıııs – 3-Player Chess engine (shared by server.js and index.html)
  Board: 14 rows x 11 cols T-shape (the empty 4th arm is cut off, 3x3 corners removed). Seats: 0 = Red (bottom), 1 = Blue (left), 2 = Yellow (top).
  Turn order 0 -> 1 -> 2. Every other player is your enemy (free-for-all).
  Rules: no castling / en passant, pawns auto-promote to queen, you may not leave your king attacked,
  capturing a king knocks that player out, checkmate/stalemate/timeout/resign eliminate a player.
  Last player standing wins; 2nd = last one eliminated, 3rd = first eliminated.
*/
(function (root) {
  const N = 14, ok = (r, c) => r >= 0 && r < N && c >= 0 && c <= 10 && !((r < 3 || r > 10) && c < 3);
  const DIR = [[-1, 0], [0, 1], [1, 0]], ST = [12, 1, 1], BACK = 'rnbqkbnr';
  const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const OR = [[1, 0], [-1, 0], [0, 1], [0, -1]], DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const prom = (p, r, c) => p === 0 ? r <= 6 : p === 1 ? c >= 7 : r >= 7;

  function init() {
    const b = Array.from({ length: N }, () => Array(N).fill(null));
    for (let i = 0; i < 8; i++) {
      const k = i + 3;
      b[13][k] = '0' + BACK[i]; b[12][k] = '0p';
      b[k][0] = '1' + BACK[i]; b[k][1] = '1p';
      b[0][k] = '2' + BACK[i]; b[1][k] = '2p';
    }
    return { b, turn: 0, alive: [true, true, true], ev: [] };
  }

  // pseudo-legal moves of player p; att=true -> squares p attacks (pawn diagonals even if empty)
  function gen(b, p, att) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = b[r][c]; if (!x || +x[0] !== p) continue; const t = x[1];
      const add = (tr, tc) => out.push({ fr: r, fc: c, tr, tc });
      const free = (tr, tc) => ok(tr, tc) && (!b[tr][tc] || +b[tr][tc][0] !== p);
      if (t === 'p') {
        const [dr, dc] = DIR[p], sides = dr ? [[dr, -1], [dr, 1]] : [[-1, dc], [1, dc]];
        for (const [a, d] of sides) { const tr = r + a, tc = c + d; if (!ok(tr, tc)) continue; const y = b[tr][tc]; if (att || (y && +y[0] !== p)) add(tr, tc); }
        if (!att) {
          const tr = r + dr, tc = c + dc;
          if (ok(tr, tc) && !b[tr][tc]) {
            add(tr, tc);
            const r2 = tr + dr, c2 = tc + dc;
            if ((p === 1 ? c : r) === ST[p] && ok(r2, c2) && !b[r2][c2]) add(r2, c2);
          }
        }
      } else if (t === 'n') { for (const [a, d] of KN) if (free(r + a, c + d)) add(r + a, c + d); }
      else if (t === 'k') { for (const [a, d] of [...OR, ...DG]) if (free(r + a, c + d)) add(r + a, c + d); }
      else {
        const ds = t === 'r' ? OR : t === 'b' ? DG : [...OR, ...DG];
        for (const [a, d] of ds) {
          let tr = r + a, tc = c + d;
          while (ok(tr, tc)) { const y = b[tr][tc]; if (!y) add(tr, tc); else { if (+y[0] !== p) add(tr, tc); break; } tr += a; tc += d; }
        }
      }
    }
    return out;
  }
  const kingPos = (b, p) => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === p + 'k') return [r, c]; return null; };
  function attacked(s, b, r, c, p) {
    for (let q = 0; q < 3; q++) { if (q === p || !s.alive[q]) continue; if (gen(b, q, true).some(m => m.tr === r && m.tc === c)) return true; }
    return false;
  }
  const inCheck = (s, p) => { const k = kingPos(s.b, p); return !!k && attacked(s, s.b, k[0], k[1], p); };
  function mk(b, m) {
    const n = b.map(r => r.slice()); let x = n[m.fr][m.fc]; n[m.fr][m.fc] = null;
    if (x[1] === 'p' && prom(+x[0], m.tr, m.tc)) x = x[0] + 'q';
    n[m.tr][m.tc] = x; return n;
  }
  function legal(s) {
    const p = s.turn, out = [];
    if (!s.alive[p]) return out;
    for (const m of gen(s.b, p, false)) {
      const t = s.b[m.tr][m.tc];
      if (t && t[1] === 'k') { out.push(m); continue; }
      const n = mk(s.b, m), k = kingPos(n, p);
      if (k && !attacked(s, n, k[0], k[1], p)) out.push(m);
    }
    return out;
  }
  const left = s => s.alive.filter(Boolean).length;
  const nextAlive = (s, p) => { for (let i = 1; i <= 3; i++) { const q = (p + i) % 3; if (s.alive[q]) return q; } return p; };
  function kill(s, p, why) {
    s.alive[p] = false;
    for (const row of s.b) for (let c = 0; c < N; c++) if (row[c] && +row[c][0] === p) row[c] = null;
    s.ev.push({ p, why });
  }
  function settle(s) {
    while (left(s) > 1) {
      if (!s.alive[s.turn]) { s.turn = nextAlive(s, s.turn); continue; }
      if (legal(s).length) break;
      kill(s, s.turn, inCheck(s, s.turn) ? 'checkmate' : 'stalemate'); s.turn = nextAlive(s, s.turn);
    }
    return s;
  }
  const clone = s => ({ b: s.b.map(r => r.slice()), turn: s.turn, alive: s.alive.slice(), ev: [] });
  function apply(s, m) {
    const n = clone(s), x = n.b[m.fr][m.fc], t = n.b[m.tr][m.tc], p = +x[0];
    n.b = mk(n.b, m);
    if (t && t[1] === 'k') kill(n, +t[0], 'king captured');
    n.turn = nextAlive(n, p); return settle(n);
  }
  function elim(s, p, why) {
    const n = clone(s); if (!n.alive[p]) return n;
    kill(n, p, why); if (n.turn === p) n.turn = nextAlive(n, p); return settle(n);
  }
  const over = s => left(s) === 1 ? { winner: s.alive.indexOf(true) } : null;
  const wire = m => [m.fr, m.fc, m.tr, m.tc];
  const find = (s, w) => Array.isArray(w) ? legal(s).find(m => m.fr === w[0] && m.fc === w[1] && m.tr === w[2] && m.tc === w[3]) : null;

  const T = { N, ok, init, legal, apply, elim, over, wire, find, inCheck, kingPos };
  if (typeof module !== 'undefined' && module.exports) module.exports = T; else root.Tri = T;
})(typeof self !== 'undefined' ? self : this);
