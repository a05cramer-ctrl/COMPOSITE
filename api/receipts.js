import { rpc, isAddr } from './_lib.js';
// hourly receipts: memo txs from the treasury that start with COMPOSITE|REBAL|
export default async function handler(req, res) {
  const w = String(req.query.w || ''); if (!isAddr(w)) return res.status(400).json({ error: 'w required' });
  try {
    const sigs = (await rpc({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [w, { limit: 100 }] }))?.result || [];
    const memo = sigs.filter(s => s.memo && s.memo.includes('COMPOSITE|REBAL|') && !s.err).slice(0, 24);
    const receipts = memo.map(s => { const raw = s.memo.slice(s.memo.indexOf('COMPOSITE|')); const [, , hour, ref] = raw.split('|'); return { sig: s.signature, time: s.blockTime, hour, ref: ref || '', url: ref && !/^[0-9a-f]{64}$/.test(ref) ? `https://ipfs.filebase.io/ipfs/${ref}` : '' }; });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ receipts });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
}
