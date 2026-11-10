'use strict';
/* =========================================================
   LEADERBOARD — global top 10, stored in a shared JSON bin.
   Read/written only at Game Over (no fetch on page load).
   ========================================================= */

const LEADERBOARD_URL = 'https://json.extendsclass.com/bin/1cdcae4e74a3';
const lbReadJson = async r => { const t = await r.text(), i = t.search(/<!doctype|<html/i); return JSON.parse(i < 0 ? t : t.slice(0, i)); }; // the score host sometimes tacks a web page onto its reply; read only the JSON part
const LEADERBOARD_SIZE = 10;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function cleanBoard(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(e => e && typeof e.n === 'string' && Number.isFinite(+e.s))
    .map(e => ({
      n: e.n.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, '-'),
      s: Math.max(0, Math.floor(+e.s)),
      m: String(e.m || '').slice(0, 16),
      c: String(e.c || '').slice(0, 24),
      t: Number.isFinite(+e.t) ? +e.t : 0,
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, LEADERBOARD_SIZE);
}

const Leaderboard = {
  list: [], offline: false,
  async fetchList() {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(LEADERBOARD_URL, { cache: 'no-store', signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      this.list = cleanBoard(await lbReadJson(r));
      this.offline = false;
    } catch (e) {
      this.offline = true;   // keep the last known list
    } finally {
      clearTimeout(timer);
    }
    return this.list;
  },
  qualifies(score) {
    if (score <= 0) return false;
    return this.list.length < LEADERBOARD_SIZE || score > this.list[this.list.length - 1].s;
  },
  // Re-fetch just before writing so a near-simultaneous submit isn't clobbered.
  async submit(entry) {
    await this.fetchList();
    const merged = cleanBoard([...this.list, entry]);
    this.list = merged;
    if (this.offline) return false;
    try {
      const r = await fetch(LEADERBOARD_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
      return r.ok;
    } catch (e) { this.offline = true; return false; }
  },
};
