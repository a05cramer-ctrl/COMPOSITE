export const SF = 'https://www.stonkfun.xyz/api/public/v1';
export const GTA6 = '4kjruqGHDsSqkMdFfCjV7Vb62HPFhtXyWc2t6JpQzDnz';
export const RULES = { N: 10, MIN_VOL_USD: 5000, MIN_MCAP_USD: 5000, MAX_WEIGHT: 0.2 };
export const isAddr = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || ''));
const num = v => (v == null || v === '' || isNaN(+v)) ? null : +v;
export function norm(t) {
  const m = t.market || {};
  return {
    mint: t.mint, symbol: t.symbol || '', name: t.name || '', image: t.imageUrl || t.image || '',
    status: t.status || '', mcap: num(m.marketCapUsd ?? t.marketCapUsd), vol24: num(m.volume24hUsd ?? t.volume24hUsd),
    price: num(m.priceUsd ?? t.priceUsd), chg24: num(m.priceChange24h ?? t.priceChange24h), createdAt: t.createdAt || '',
    x: t.links?.twitter || '', site: t.links?.website || '',
  };
}
export async function sfJSON(path) {
  const r = await fetch(SF + path, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('stonkfun ' + r.status);
  return r.json();
}
export async function economy(pages = 3, exclude = '') {
  const out = []; let total = null;
  for (let p = 1; p <= pages; p++) {
    const j = await sfJSON(`/tokens?quoteMint=${GTA6}&sort=volume&pageSize=100&page=${p}`);
    const d = j?.data || {}; const list = d.tokens || d.items || (Array.isArray(d) ? d : []);
    total = d.pagination?.total ?? d.total ?? total;
    out.push(...list.map(norm));
    if (list.length < 100) break;
  }
  return { coins: out.filter(c => c.mint && c.mint !== exclude), total: total ?? out.length };
}
// same rules as the engine: top N by 24h volume, floors, weights ∝ volume capped at MAX_WEIGHT
export function pickBasket(coins, r = RULES) {
  const el = coins.filter(c => (c.vol24 || 0) >= r.MIN_VOL_USD && (c.mcap || 0) >= r.MIN_MCAP_USD)
    .sort((a, b) => b.vol24 - a.vol24).slice(0, r.N);
  if (!el.length) return [];
  let w = el.map(c => c.vol24); const s = w.reduce((a, b) => a + b, 0); w = w.map(x => x / s);
  const cap = Math.max(r.MAX_WEIGHT, 1 / el.length);
  for (let i = 0; i < 50; i++) {
    const over = w.map((x, k) => x > cap + 1e-15 ? k : -1).filter(k => k >= 0); if (!over.length) break;
    const extra = over.reduce((a, k) => a + w[k] - cap, 0); over.forEach(k => w[k] = cap);
    const under = w.map((x, k) => x < cap - 1e-15 ? k : -1).filter(k => k >= 0); const base = under.reduce((a, k) => a + w[k], 0);
    under.forEach(k => w[k] += extra * w[k] / base);
  }
  return el.map((c, k) => ({ ...c, weight: w[k] }));
}
export async function rpc(body) {
  const key = process.env.HELIUS_API_KEY; if (!key) throw new Error('HELIUS_API_KEY missing');
  const r = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
