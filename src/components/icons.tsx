import {
  Apple,
  BookOpen,
  Briefcase,
  CakeSlice,
  Car,
  ChefHat,
  Circle,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  FlaskConical,
  Flower2,
  Footprints,
  GraduationCap,
  Heart,
  House,
  Laptop,
  Music,
  Palette,
  PawPrint,
  PiggyBank,
  Pizza,
  Plane,
  Salad,
  Sandwich,
  Soup,
  Sprout,
  Star,
  Target,
  UtensilsCrossed,
  Wheat,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

/*
 * Symbole sind Linien-Icons (keine Emojis). Gespeichert wird ein Schlüssel wie „school“ im Feld `emoji`
 * von Kategorien und Rezepten. Ältere Einträge enthalten noch echte Emojis – die werden über LEGACY
 * auf ein passendes Icon abgebildet, damit keine Datenmigration (und kein Sync-Konflikt) nötig ist.
 */

/** Symbole für Kategorien von Zielen, To-dos und Habits */
export const CATEGORY_SYMBOLS: Record<string, LucideIcon> = {
  target: Target,
  school: GraduationCap,
  music: Music,
  work: Briefcase,
  laptop: Laptop,
  lab: FlaskConical,
  book: BookOpen,
  home: House,
  money: PiggyBank,
  run: Footprints,
  calm: Flower2,
  heart: Heart,
  plant: Sprout,
  travel: Plane,
  art: Palette,
  tools: Wrench,
  car: Car,
  cook: ChefHat,
  pet: PawPrint,
  star: Star,
}

/** Symbole für Rezepte */
export const RECIPE_SYMBOLS: Record<string, LucideIcon> = {
  salad: Salad,
  soup: Soup,
  pot: CookingPot,
  pizza: Pizza,
  sandwich: Sandwich,
  egg: EggFried,
  fish: Fish,
  meat: Drumstick,
  grain: Wheat,
  bakery: Croissant,
  cake: CakeSlice,
  fruit: Apple,
  coffee: Coffee,
  drink: CupSoda,
  dish: UtensilsCrossed,
}

const ALL: Record<string, LucideIcon> = { ...CATEGORY_SYMBOLS, ...RECIPE_SYMBOLS }

/** Früher gespeicherte Emojis → Symbol-Schlüssel */
const LEGACY: Record<string, string> = {
  '🎯': 'target', '🎓': 'school', '🎵': 'music', '💼': 'work', '💻': 'laptop', '🧪': 'lab', '📚': 'book', '🏡': 'home',
  '💰': 'money', '🏃': 'run', '🧘': 'calm', '❤️': 'heart', '🌱': 'plant', '✈️': 'travel', '🎨': 'art', '🛠️': 'tools',
  '🚗': 'car', '🍳': 'egg', '🐾': 'pet', '⭐': 'star',
  '🥗': 'salad', '🍝': 'dish', '🍛': 'pot', '🌮': 'sandwich', '🍕': 'pizza', '🍲': 'soup', '🥘': 'pot', '🍜': 'soup',
  '🥪': 'sandwich', '🥞': 'bakery', '🍔': 'sandwich', '🍣': 'fish', '🥙': 'sandwich', '🍰': 'cake', '🥤': 'drink',
}

export const symbolIcon = (value: string | undefined): LucideIcon | undefined =>
  value ? (ALL[value] ?? ALL[LEGACY[value]] ?? Circle) : undefined

/** Zeigt ein gespeichertes Symbol als Icon an (nichts, wenn keins vergeben ist). */
export function SymbolIcon({ value, ...props }: { value: string | undefined } & LucideProps) {
  const Icon = symbolIcon(value)
  return Icon ? <Icon aria-hidden {...props} /> : null
}

/** Raster zur Symbolwahl, optional mit „Ohne“. */
export function SymbolGrid({
  symbols,
  value,
  onPick,
  allowNone,
}: {
  symbols: Record<string, LucideIcon>
  value?: string
  onPick: (key: string | undefined) => void
  allowNone?: boolean
}) {
  const current = value && LEGACY[value] ? LEGACY[value] : value
  const tone = (active: boolean) => (active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted')
  const cell = (active: boolean) => `grid size-11 place-items-center rounded-full border transition active:scale-95 ${tone(active)}`
  return (
    <div className="flex flex-wrap gap-2">
      {allowNone && (
        <button type="button" onClick={() => onPick(undefined)} className={`h-11 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${tone(!value)}`}>
          Ohne
        </button>
      )}
      {Object.entries(symbols).map(([key, Icon]) => (
        <button key={key} type="button" aria-label={`Symbol ${key}`} aria-pressed={current === key} onClick={() => onPick(key)} className={cell(current === key)}>
          <Icon size={19} />
        </button>
      ))}
    </div>
  )
}
