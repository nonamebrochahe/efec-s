/* Efeciis Chess Engine - standalone browser engine */
(function (global) {
  'use strict';
  const V = { p:100, n:320, b:330, r:500, q:900, k:20000 };
  const isW = p => p !== '.' && p === p.toUpperCase();
  const initial = () => ({
    b: 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR'.split(''),
    t: 'w', c: { K:true, Q:true, k:true, q:true }, ep: -1, h:0, n:1
  });
  const init = initial;
  const inside = i => i >= 0 && i < 64;
  const same = (a,b) => a !== '.' && b !== '.' && isW(a) === isW(b);
  function pseudo(s) {
    const out=[]; const b=s.b, side=s.t, forward=side==='w'?-8:8, home=side==='w'?6:1, last=side==='w'?0:7;
    function add(f,t,extra={}) { if(!inside(t))return; const p=b[t]; if(p!=='.'&&isW(p)===(side==='w'))return; out.push({f,t,...extra}); }
    for(let f=0;f<64;f++){
      const p=b[f]; if(p==='.'||isW(p)!==(side==='w'))continue;
      const typ=p.toLowerCase(), r=f>>3, c=f&7;
      if(typ==='p'){
        let t=f+forward;
        if(inside(t)&&b[t]==='.'){
          if((t>>3)===last) for(const pr of ['q','r','b','n'])add(f,t,{p:side==='w'?pr.toUpperCase():pr}); else add(f,t);
          const t2=f+2*forward;if(r===home&&b[t2]==='.')add(f,t2,{d:1});
        }
        for(const dc of [-1,1]){if(c+dc<0||c+dc>7)continue;t=f+forward+dc;
          if(inside(t)&&((b[t]!=='.'&&isW(b[t])!==(side==='w'))||t===s.ep)){
            if((t>>3)===last)for(const pr of ['q','r','b','n'])add(f,t,{p:side==='w'?pr.toUpperCase():pr,x:t===s.ep?'e':undefined});else add(f,t,{x:t===s.ep?'e':undefined});
          }
        }
      } else if(typ==='n'){
        for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<8&&cc>=0&&cc<8)add(f,rr*8+cc)}
      } else {
        let dirs=[];if(typ==='b'||typ==='q')dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);if(typ==='r'||typ==='q')dirs.push([-1,0],[1,0],[0,-1],[0,1]);if(typ==='k')dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){const t=rr*8+cc;if(b[t]==='.')add(f,t);else{if(isW(b[t])!==(side==='w'))add(f,t);break}if(typ==='k')break;rr+=dr;cc+=dc}}
        if(typ==='k'&&((side==='w'&&f===60)||(side==='b'&&f===4))){
          const rank=side==='w'?7:0, enemy=side==='w'?'b':'w';
          if(s.c[side==='w'?'K':'k']&&b[rank*8+5]==='.'&&b[rank*8+6]==='.'&&!attacked(s,f,enemy)&&!attacked(s,rank*8+5,enemy)&&!attacked(s,rank*8+6,enemy)&&b[rank*8+7]===(side==='w'?'R':'r'))add(f,rank*8+6,{x:'c'});
          if(s.c[side==='w'?'Q':'q']&&b[rank*8+1]==='.'&&b[rank*8+2]==='.'&&b[rank*8+3]==='.'&&!attacked(s,f,enemy)&&!attacked(s,rank*8+3,enemy)&&!attacked(s,rank*8+2,enemy)&&b[rank*8]===(side==='w'?'R':'r'))add(f,rank*8+2,{x:'c'});
        }
      }
    }
    return out;
  }
  function attacked(s, sq, by) {
    const b=s.b, r=sq>>3,c=sq&7;
    const pawnRow=r+(by==='w'?1:-1);
    for(const dc of [-1,1]){const cc=c+dc;if(pawnRow>=0&&pawnRow<8&&cc>=0&&cc<8){const p=b[pawnRow*8+cc];if(p===(by==='w'?'P':'p'))return true}}
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<8&&cc>=0&&cc<8&&b[rr*8+cc]===(by==='w'?'N':'n'))return true}
    for(const [dr,dc,types] of [[-1,-1,'bqk'],[-1,1,'bqk'],[1,-1,'bqk'],[1,1,'bqk'],[-1,0,'rqk'],[1,0,'rqk'],[0,-1,'rqk'],[0,1,'rqk']]){let rr=r+dr,cc=c+dc,dist=1;while(rr>=0&&rr<8&&cc>=0&&cc<8){const p=b[rr*8+cc];if(p!=='.'){if(isW(p)===(by==='w')&&types.includes(p.toLowerCase())&&(dist===1||p.toLowerCase()!=='k'))return true;break}rr+=dr;cc+=dc;dist++}}
    return false;
  }
  function inChk(s, side=s.t) {const k=s.b.indexOf(side==='w'?'K':'k');return k>=0&&attacked(s,k,side==='w'?'b':'w')}
  function make(s,m) {
    const n={b:s.b.slice(),t:s.t==='w'?'b':'w',c:{...s.c},ep:-1,h:s.h+1,n:s.n};
    const p=n.b[m.f], target=n.b[m.t]; n.b[m.f]='.';
    if(m.x==='e')n.b[m.t+(s.t==='w'?8:-8)]='.';
    if(m.x==='c'){
      n.b[m.t]=p;
      if(m.t>m.f){n.b[m.t-1]=n.b[m.t+1];n.b[m.t+1]='.'}else{n.b[m.t+1]=n.b[m.t-2];n.b[m.t-2]='.'}
    } else n.b[m.t]=m.p||p;
    if(p.toLowerCase()==='k'){if(s.t==='w'){n.c.K=false;n.c.Q=false}else{n.c.k=false;n.c.q=false}}
    if(m.f===63||m.t===63)n.c.K=false;if(m.f===56||m.t===56)n.c.Q=false;if(m.f===7||m.t===7)n.c.k=false;if(m.f===0||m.t===0)n.c.q=false;
    if(p.toLowerCase()==='p'&&Math.abs(m.t-m.f)===16)n.ep=(m.f+m.t)>>1;
    if(p.toLowerCase()==='p'||target!=='.'||m.x==='e')n.h=0;else n.h=s.h+1;
    if(s.t==='b')n.n=s.n+1;return n;
  }
  function legal(s) {return pseudo(s).filter(m=>!inChk(make(s,m),s.t))}
  function isCap(s,m){return s.b[m.t]!=='.'||m.x==='e'}
  function over(s){const ms=legal(s);if(!ms.length)return [s.t,inChk(s)?'mat':'pat'];if(s.h>=100)return ['d','50 hamle'];const pieces=s.b.filter(x=>x!=='.');if(pieces.every(x=>'Kk'.includes(x)))return ['d','yetersiz taş'];return null}
  function score(s, root){let val=0;for(let i=0;i<64;i++){const p=s.b[i];if(p!=='.')val+=(isW(p)?1:-1)*(V[p.toLowerCase()]||0)}return (root==='w'?val:-val)}
  function pick(s, depth=1){const ms=legal(s);if(!ms.length)return null;const d=Math.max(1,Math.min(3,Number(depth)||1));let best=ms[0],bestScore=-Infinity;
    for(const m of ms){const ns=make(s,m);let v=score(ns,s.t);if(d>1){const replies=legal(ns);if(replies.length){let worst=Infinity;for(const r of replies){const ss=make(ns,r);let z=score(ss,s.t);if(z<worst)worst=z}v=worst}}
      v+=(Math.random()-.5)*(d===1?150:20);if(v>bestScore){bestScore=v;best=m}}
    return best;
  }
  global.E={V,isW,init,make,legal,inChk,isCap,pick,over};
})(window);
