import { economy, pickBasket, sfJSON, norm, GTA6, RULES } from './_lib.js';
export default async function handler(req, res) {
  try {
    const self = String(req.query.self || '');
    const [{ coins, total }, g] = await Promise.all([economy(3, self), sfJSON(`/tokens/${GTA6}`).catch(() => null)]);
    const gt = g ? norm(g.data?.token || g.data || {}) : null;
    const basket = pickBasket(coins);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ gta6: gt, coins: coins.slice(0, 120), total, basket: basket.map(b => ({ mint: b.mint, symbol: b.symbol, weight: b.weight })), rules: RULES, generatedAt: new Date().toISOString() });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
}
