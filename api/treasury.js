import { economy, sfJSON, norm, rpc, isAddr, GTA6 } from './_lib.js';
const PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
export default async function handler(req, res) {
  const w = String(req.query.w || ''); const self = String(req.query.self || '');
  if (!isAddr(w)) return res.status(400).json({ error: 'w required' });
  try {
    const body = PROGRAMS.map((p, i) => ({ jsonrpc: '2.0', id: i, method: 'getTokenAccountsByOwner', params: [w, { programId: p }, { encoding: 'jsonParsed' }] }));
    body.push({ jsonrpc: '2.0', id: 9, method: 'getBalance', params: [w] });
    const out = await rpc(body);
    const bal = new Map();
    for (const r of out) for (const a of r?.result?.value || []) { const i = a.account?.data?.parsed?.info; if (!i) continue; const ui = +i.tokenAmount.uiAmount || 0; if (ui > 0) bal.set(i.mint, (bal.get(i.mint) || 0) + ui); }
    const sol = (out.find(r => r.id === 9)?.result?.value || 0) / 1e9;
    const { coins } = await economy(3, '');
    const price = new Map(coins.map(c => [c.mint, c]));
    const extra = [GTA6, self].filter(m => isAddr(m) && !price.has(m));
    for (const m of extra) { try { const j = await sfJSON(`/tokens/${m}`); price.set(m, norm(j.data?.token || j.data || {})); } catch {} }
    const holdings = [...bal.entries()].filter(([m]) => m !== self).map(([mint, amount]) => { const c = price.get(mint) || {}; const usd = c.price != null ? amount * c.price : null; return { mint, symbol: c.symbol || '', image: c.image || '', amount, usd }; }).sort((a, b) => (b.usd || 0) - (a.usd || 0));
    const navUsd = holdings.reduce((s, h) => s + (h.usd || 0), 0);
    const selfTok = price.get(self) || null;
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.status(200).json({ wallet: w, sol, holdings, navUsd, self: selfTok ? { mcap: selfTok.mcap, price: selfTok.price, vol24: selfTok.vol24 } : null, generatedAt: new Date().toISOString() });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
}
