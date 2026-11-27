const UNIT = '(?:g|kg|ml|l|x|stk\\.?|stück|pck\\.?|packung(?:en)?|dosen?|bund|flaschen?|becher|gläser|glas|el|tl)'
const LEADING = new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*${UNIT}?)\\s+(.+)$`, 'i')

/** „500 g Mehl“ → { quantity: "500 g", name: "Mehl" }; „Mehl“ → { quantity: "", name: "Mehl" } */
export function parseEntry(input: string): { name: string; quantity: string } {
  const text = input.trim().replace(/\s+/g, ' ')
  const m = text.match(LEADING)
  if (m) return { quantity: m[1].trim(), name: capitalize(m[2]) }
  return { quantity: '', name: capitalize(text) }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
