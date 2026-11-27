import type { Product } from './db'

/*
 * Vorschläge und Tippfehler-Erkennung für Produktnamen – rein lokal über die gemerkten Produkte.
 * Toleranz: Tippfehler zählen als Abstand nach Damerau-Levenshtein (vertauschte Buchstaben = 1 Fehler,
 * „Toamten“ → „Tomaten“). Bei kurzen Eingaben wird nichts geraten, sonst gäbe es zu viele Treffer.
 */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Erlaubte Tippfehler je nach Länge der Eingabe */
const tolerance = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0)

/** Editierabstand mit Vertauschungen (Optimal String Alignment). */
export function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** Abstand der Eingabe zum Anfang des Namens („Toma“ passt ungefähr zu „Tomaten“). */
const prefixDistance = (q: string, name: string) =>
  Math.min(...[-1, 0, 1].map((k) => q.length + k).filter((n) => n > 0 && n <= name.length).map((n) => distance(q, name.slice(0, n))), Infinity)

const byUse = (a: Product, b: Product) => b.uses - a.uses || a.name.localeCompare(b.name, 'de')

/**
 * Passende Produkte zur Eingabe, beste zuerst: Anfang des Namens > Anfang eines Wortes > irgendwo enthalten
 * > ungefähr (Tippfehler). Innerhalb einer Stufe zählt, wie oft das Produkt gekauft wurde.
 */
export function suggestProducts(products: Product[], query: string, limit = 6) {
  const q = norm(query)
  if (!q) return []
  const tol = tolerance(q.length)
  const scored: Array<{ p: Product; rank: number }> = []
  for (const p of products) {
    const n = norm(p.name)
    const rank =
      n.startsWith(q) ? 0
      : n.split(' ').some((w) => w.startsWith(q)) ? 1
      : q.length >= 3 && n.includes(q) ? 2
      : tol && prefixDistance(q, n) <= tol ? 3
      : -1
    if (rank >= 0) scored.push({ p, rank })
  }
  return scored
    .sort((a, b) => a.rank - b.rank || byUse(a.p, b.p))
    .slice(0, limit)
    .map((x) => x.p)
}

/**
 * Ist `name` vermutlich ein vertipptes bekanntes Produkt? Liefert das ähnlichste – oder nichts, wenn der Name
 * bekannt ist bzw. nichts Ähnliches existiert.
 */
export function likelyTypo(products: Product[], name: string): Product | undefined {
  const q = norm(name)
  const tol = tolerance(q.length)
  if (!tol || products.some((p) => norm(p.name) === q)) return undefined
  let best: { p: Product; d: number } | undefined
  for (const p of products) {
    const d = distance(q, norm(p.name))
    if (d <= tol && (!best || d < best.d || (d === best.d && p.uses > best.p.uses))) best = { p, d }
  }
  return best?.p
}
