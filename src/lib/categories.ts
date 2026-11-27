import { Carrot, Cookie, Croissant, CupSoda, Drumstick, Milk, ShoppingBasket, Snowflake, Leaf, SprayCan, Wheat } from 'lucide-react'

// Kategorien in typischer Supermarkt-Reihenfolge – bestimmt die Sortierung der Liste.
export const CATEGORIES = [
  { id: 'obst', label: 'Obst & Gemüse', icon: Carrot },
  { id: 'brot', label: 'Brot & Backwaren', icon: Croissant },
  { id: 'kuehl', label: 'Kühlregal', icon: Milk },
  { id: 'fleisch', label: 'Fleisch & Fisch', icon: Drumstick },
  { id: 'vorrat', label: 'Vorrat', icon: Wheat },
  { id: 'gewuerze', label: 'Gewürze & Saucen', icon: Leaf },
  { id: 'tk', label: 'Tiefkühl', icon: Snowflake },
  { id: 'getraenke', label: 'Getränke', icon: CupSoda },
  { id: 'snacks', label: 'Snacks', icon: Cookie },
  { id: 'haushalt', label: 'Haushalt & Drogerie', icon: SprayCan },
  { id: 'sonstiges', label: 'Sonstiges', icon: ShoppingBasket },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

const KEYWORDS: Record<Exclude<CategoryId, 'sonstiges'>, string[]> = {
  obst: ['apfel', 'banane', 'birne', 'beere', 'zitrone', 'limette', 'orange', 'traube', 'mango', 'avocado', 'tomate', 'gurke', 'salat', 'paprika', 'zwiebel', 'knoblauch', 'kartoffel', 'karotte', 'möhre', 'brokkoli', 'spinat', 'zucchini', 'pilz', 'champignon', 'ingwer', 'kräuter', 'petersilie', 'basilikum', 'koriander', 'lauch', 'kohl', 'edamame', 'radieschen', 'süßkartoffel', 'frühlingszwiebel'],
  brot: ['brot', 'brötchen', 'toast', 'baguette', 'wrap', 'tortilla', 'croissant'],
  kuehl: ['milch', 'joghurt', 'quark', 'käse', 'butter', 'sahne', 'ei', 'eier', 'tofu', 'feta', 'mozzarella', 'skyr', 'frischkäse', 'schmand', 'hummus'],
  fleisch: ['hähnchen', 'huhn', 'rind', 'hack', 'schwein', 'lachs', 'thunfisch', 'fisch', 'garnele', 'wurst', 'schinken', 'speck', 'pute'],
  vorrat: ['reis', 'nudel', 'pasta', 'spaghetti', 'mehl', 'zucker', 'haferflocken', 'müsli', 'linsen', 'bohnen', 'kichererbsen', 'quinoa', 'couscous', 'dose', 'mais', 'nüsse', 'honig', 'marmelade', 'kaffee', 'tee'],
  gewuerze: ['salz', 'pfeffer', 'öl', 'olivenöl', 'rapsöl', 'sesamöl','essig', 'sojasauce', 'senf', 'ketchup', 'mayo', 'gewürz', 'paprikapulver', 'curry', 'sesam', 'brühe', 'pesto', 'sauce', 'soße'],
  tk: ['tiefkühl', 'tk-', 'pizza', 'eis', 'pommes'],
  getraenke: ['wasser', 'saft', 'cola', 'bier', 'wein', 'limo', 'sprudel'],
  snacks: ['chips', 'schokolade', 'keks', 'gummibär', 'riegel', 'cracker'],
  haushalt: ['spülmittel', 'waschmittel', 'klopapier', 'toilettenpapier', 'küchenrolle', 'müllbeutel', 'shampoo', 'duschgel', 'zahnpasta', 'seife', 'schwamm', 'taschentücher'],
}

// Längste Schlüsselwörter zuerst, damit z. B. „paprikapulver“ vor „paprika“ greift.
const RULES = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => ({ cat: cat as CategoryId, w })))
  .sort((a, b) => b.w.length - a.w.length)

export function guessCategory(name: string): CategoryId {
  const n = name.toLowerCase().trim()
  const words = n.split(/[\s,-]+/)
  // Kurze Wörter (ei, öl, eis, tee) nur als ganzes Wort, sonst würde „Reis“ als „ei“ erkannt.
  const hit = RULES.find(({ w }) => (w.length <= 3 ? words.includes(w) : n.includes(w)))
  return hit?.cat ?? 'sonstiges'
}

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
