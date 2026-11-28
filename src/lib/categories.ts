import { Carrot, Cookie, Croissant, CupSoda, Drumstick, Milk, ShoppingBasket, Snowflake, Leaf, SprayCan, Wheat, Droplet } from 'lucide-react'

// Kategorien in typischer Supermarkt-Reihenfolge – bestimmt die Sortierung der Liste.
// `tint`: Pastellton für den Farbmodus der Einkaufsliste (Tokens `cat-*` in index.css; Klassen müssen ausgeschrieben bleiben).
export const CATEGORIES = [
  { id: 'obst', label: 'Obst & Gemüse', icon: Carrot, tint: 'bg-cat-obst' },
  { id: 'brot', label: 'Brot & Backwaren', icon: Croissant, tint: 'bg-cat-brot' },
  { id: 'kuehl', label: 'Kühlregal', icon: Milk, tint: 'bg-cat-kuehl' },
  { id: 'fleisch', label: 'Fleisch & Fisch', icon: Drumstick, tint: 'bg-cat-fleisch' },
  { id: 'vorrat', label: 'Vorrat', icon: Wheat, tint: 'bg-cat-vorrat' },
  { id: 'gewuerze', label: 'Gewürze & Saucen', icon: Leaf, tint: 'bg-cat-gewuerze' },
  { id: 'tk', label: 'Tiefkühl', icon: Snowflake, tint: 'bg-cat-tk' },
  { id: 'getraenke', label: 'Getränke', icon: CupSoda, tint: 'bg-cat-getraenke' },
  { id: 'snacks', label: 'Snacks', icon: Cookie, tint: 'bg-cat-snacks' },
  { id: 'haushalt', label: 'Haushalt', icon: SprayCan, tint: 'bg-cat-haushalt' },
  { id: 'drogerie', label: 'Drogerie', icon: Droplet, tint: 'bg-cat-drogerie' },
  { id: 'sonstiges', label: 'Sonstiges', icon: ShoppingBasket, tint: 'bg-cat-sonstiges' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

const KEYWORDS: Record<Exclude<CategoryId, 'sonstiges'>, string[]> = {
  obst: ['apfel', 'banane', 'birne', 'beere', 'zitrone', 'limette', 'orange', 'traube', 'mango', 'avocado', 'tomate', 'gurke', 'salat', 'paprika', 'zwiebel', 'knoblauch', 'kartoffel', 'karotte', 'möhre', 'brokkoli', 'spinat', 'zucchini', 'pilz', 'champignon', 'ingwer', 'kräuter', 'petersilie', 'basilikum', 'koriander', 'lauch', 'kohl', 'edamame', 'radieschen', 'süßkartoffel', 'frühlingszwiebel'],
  brot: ['brot', 'brötchen', 'toast', 'baguette', 'wrap', 'tortilla', 'croissant'],
  kuehl: ['creme fraiche', 'crème fraîche', 'milch', 'joghurt', 'quark', 'käse', 'butter', 'sahne', 'ei', 'eier', 'tofu', 'feta', 'mozzarella', 'skyr', 'frischkäse', 'schmand', 'hummus'],
  fleisch: ['hähnchen', 'huhn', 'rind', 'hack', 'schwein', 'lachs', 'thunfisch', 'fisch', 'garnele', 'wurst', 'schinken', 'speck', 'pute'],
  vorrat: ['reis', 'nudel', 'pasta', 'spaghetti', 'mehl', 'zucker', 'haferflocken', 'müsli', 'linsen', 'bohnen', 'kichererbsen', 'quinoa', 'couscous', 'dose', 'mais', 'nüsse', 'honig', 'marmelade', 'kaffee', 'tee'],
  gewuerze: ['salz', 'pfeffer', 'öl', 'olivenöl', 'rapsöl', 'sesamöl','essig', 'sojasauce', 'senf', 'ketchup', 'mayo', 'gewürz', 'paprikapulver', 'curry', 'sesam', 'brühe', 'pesto', 'sauce', 'soße'],
  tk: ['tiefkühl', 'tk-', 'pizza', 'eis', 'pommes'],
  getraenke: ['wasser', 'saft', 'cola', 'bier', 'wein', 'limo', 'sprudel'],
  snacks: ['chips', 'schokolade', 'keks', 'gummibär', 'riegel', 'cracker'],
  haushalt: ['spülmittel', 'spültabs', 'geschirrtabs', 'waschmittel', 'weichspüler', 'klopapier', 'toilettenpapier', 'küchenrolle', 'müllbeutel', 'schwamm', 'putzmittel', 'reiniger', 'allzweckreiniger', 'glasreiniger', 'wc-reiniger', 'entkalker', 'alufolie', 'frischhaltefolie', 'backpapier', 'gefrierbeutel', 'batterie', 'glühbirne', 'kerze', 'servietten', 'lappen', 'staubsaugerbeutel'],
  drogerie: ['shampoo', 'spülung', 'haarspülung', 'duschgel', 'zahnpasta', 'zahncreme', 'zahnbürste', 'zahnseide', 'mundspülung', 'seife', 'handseife', 'taschentücher', 'deo', 'deodorant', 'creme', 'bodylotion', 'lotion', 'sonnencreme', 'rasierer', 'rasierklinge', 'rasierschaum', 'wattepads', 'wattestäbchen', 'watte', 'tampons', 'binden', 'slipeinlagen', 'windeln', 'feuchttücher', 'pflaster', 'lippenpflege', 'labello', 'make-up', 'mascara', 'nagellack', 'abschminktücher', 'haargel', 'haarspray', 'kontaktlinsen', 'vitamin', 'kopfschmerztabletten', 'parfum', 'gesichtscreme', 'handcreme', 'peeling', 'kondome'],
}

// Längste Schlüsselwörter zuerst, damit z. B. „paprikapulver“ vor „paprika“ greift.
const RULES = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => ({ cat: cat as CategoryId, w })))
  .sort((a, b) => b.w.length - a.w.length)

/** Umlaute vereinheitlichen, damit Plurale wie „Äpfel“ zu „apfel“ passen */
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')

export function guessCategory(name: string): CategoryId {
  const n = fold(name.trim())
  const words = n.split(/[\s,-]+/)
  // Kurze Wörter (ei, öl, eis, tee) nur als ganzes Wort, sonst würde „Reis“ als „ei“ erkannt.
  const hit = RULES.find(({ w }) => {
    const k = fold(w)
    return k.length <= 3 ? words.includes(k) : n.includes(k)
  })
  return hit?.cat ?? 'sonstiges'
}

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
