import {
  Bath,
  BedDouble,
  BrushCleaning,
  Drill,
  Droplets,
  Hammer,
  Key,
  Mailbox,
  Package,
  PaintRoller,
  Receipt,
  Recycle,
  Refrigerator,
  Shirt,
  ShoppingCart,
  Shovel,
  Shrub,
  Sofa,
  Sparkles,
  SprayCan,
  Toilet,
  Trash2,
  Utensils,
  WashingMachine,
  Apple,
  Baby,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  CakeSlice,
  Camera,
  Car,
  Cat,
  ChefHat,
  Circle,
  Code,
  Coffee,
  Compass,
  CookingPot,
  Croissant,
  CupSoda,
  Dog,
  Drama,
  Drumstick,
  Dumbbell,
  EggFried,
  Feather,
  Fish,
  FlaskConical,
  Flower2,
  Footprints,
  Gamepad2,
  Gift,
  GraduationCap,
  Guitar,
  Handshake,
  Headphones,
  Heart,
  HeartPulse,
  House,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  Medal,
  Mic,
  Microscope,
  Moon,
  Mountain,
  Music,
  NotebookPen,
  Paintbrush,
  Palette,
  PawPrint,
  PenTool,
  Piano,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Rocket,
  Sailboat,
  Salad,
  Sandwich,
  Soup,
  Sprout,
  Star,
  Sun,
  Target,
  Telescope,
  TrendingUp,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
  Wheat,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

/*
 * Symbole sind Linien-Icons (keine Emojis). Gespeichert wird ein Schlüssel wie „school“ im Feld `emoji`
 * von Kategorien und Rezepten. Ältere Einträge enthalten noch echte Emojis – die werden über LEGACY
 * auf ein passendes Icon abgebildet, damit keine Datenmigration (und kein Sync-Konflikt) nötig ist.
 * Schlüssel nie umbenennen: sie stehen so in den gespeicherten Daten.
 */

type Sym = { icon: LucideIcon; label: string }
export type SymbolGroup = { label?: string; symbols: Record<string, Sym> }

/** Symbole für Kategorien von Zielen, To-dos und Habits – in Gruppen, damit die Auswahl übersichtlich bleibt */
export const CATEGORY_SYMBOL_GROUPS: SymbolGroup[] = [
  {
    label: 'Allgemein',
    symbols: {
      target: { icon: Target, label: 'Zielscheibe' },
      star: { icon: Star, label: 'Stern' },
      heart: { icon: Heart, label: 'Herz' },
      home: { icon: House, label: 'Zuhause' },
      tools: { icon: Wrench, label: 'Werkzeug' },
    },
  },
  {
    label: 'Haushalt',
    symbols: {
      clean: { icon: BrushCleaning, label: 'Putzen' },
      sparkle: { icon: Sparkles, label: 'Sauber' },
      spray: { icon: SprayCan, label: 'Reiniger' },
      laundry: { icon: WashingMachine, label: 'Wäsche' },
      clothes: { icon: Shirt, label: 'Kleidung' },
      dishes: { icon: Utensils, label: 'Abwasch' },
      fridge: { icon: Refrigerator, label: 'Kühlschrank' },
      trash: { icon: Trash2, label: 'Müll' },
      recycle: { icon: Recycle, label: 'Recycling' },
      bath: { icon: Bath, label: 'Bad' },
      toilet: { icon: Toilet, label: 'Toilette' },
      sofa: { icon: Sofa, label: 'Wohnzimmer' },
      bedroom: { icon: BedDouble, label: 'Schlafzimmer' },
      repair: { icon: Hammer, label: 'Reparieren' },
      drill: { icon: Drill, label: 'Bohren' },
      paint: { icon: PaintRoller, label: 'Streichen' },
      garden: { icon: Shovel, label: 'Garten' },
      shrub: { icon: Shrub, label: 'Pflanzen' },
      water: { icon: Droplets, label: 'Gießen' },
      shopping: { icon: ShoppingCart, label: 'Einkaufen' },
      mail: { icon: Mailbox, label: 'Post' },
      bills: { icon: Receipt, label: 'Rechnungen' },
      parcel: { icon: Package, label: 'Pakete' },
      key: { icon: Key, label: 'Schlüssel' },
    },
  },
  {
    label: 'Schreiben & Kreatives',
    symbols: {
      pen: { icon: PenTool, label: 'Federspitze' },
      feather: { icon: Feather, label: 'Schreibfeder' },
      notebook: { icon: NotebookPen, label: 'Notizbuch' },
      art: { icon: Palette, label: 'Farbpalette' },
      brush: { icon: Paintbrush, label: 'Pinsel' },
      camera: { icon: Camera, label: 'Kamera' },
      music: { icon: Music, label: 'Musik' },
      guitar: { icon: Guitar, label: 'Gitarre' },
      piano: { icon: Piano, label: 'Klavier' },
      mic: { icon: Mic, label: 'Mikrofon' },
      headphones: { icon: Headphones, label: 'Kopfhörer' },
      stage: { icon: Drama, label: 'Theater' },
    },
  },
  {
    label: 'Sport & Gesundheit',
    symbols: {
      run: { icon: Footprints, label: 'Laufen' },
      dumbbell: { icon: Dumbbell, label: 'Hantel' },
      bike: { icon: Bike, label: 'Fahrrad' },
      mountain: { icon: Mountain, label: 'Berg' },
      sail: { icon: Sailboat, label: 'Segelboot' },
      calm: { icon: Flower2, label: 'Blüte' },
      pulse: { icon: HeartPulse, label: 'Herzschlag' },
      pill: { icon: Pill, label: 'Tablette' },
      sleep: { icon: Bed, label: 'Schlaf' },
      sun: { icon: Sun, label: 'Sonne' },
      moon: { icon: Moon, label: 'Mond' },
      leaf: { icon: Leaf, label: 'Blatt' },
      plant: { icon: Sprout, label: 'Pflanze' },
    },
  },
  {
    label: 'Lernen & Arbeit',
    symbols: {
      school: { icon: GraduationCap, label: 'Abschluss' },
      book: { icon: BookOpen, label: 'Buch' },
      work: { icon: Briefcase, label: 'Arbeit' },
      laptop: { icon: Laptop, label: 'Laptop' },
      code: { icon: Code, label: 'Code' },
      lab: { icon: FlaskConical, label: 'Labor' },
      brain: { icon: Brain, label: 'Gehirn' },
      idea: { icon: Lightbulb, label: 'Idee' },
      languages: { icon: Languages, label: 'Sprachen' },
      microscope: { icon: Microscope, label: 'Mikroskop' },
      telescope: { icon: Telescope, label: 'Teleskop' },
      rocket: { icon: Rocket, label: 'Rakete' },
      growth: { icon: TrendingUp, label: 'Wachstum' },
      trophy: { icon: Trophy, label: 'Pokal' },
      medal: { icon: Medal, label: 'Medaille' },
    },
  },
  {
    label: 'Alltag & Soziales',
    symbols: {
      people: { icon: Users, label: 'Menschen' },
      family: { icon: Baby, label: 'Familie' },
      pet: { icon: PawPrint, label: 'Haustier' },
      dog: { icon: Dog, label: 'Hund' },
      cat: { icon: Cat, label: 'Katze' },
      gift: { icon: Gift, label: 'Geschenk' },
      handshake: { icon: Handshake, label: 'Handschlag' },
      cook: { icon: ChefHat, label: 'Kochen' },
      coffee: { icon: Coffee, label: 'Kaffee' },
      money: { icon: PiggyBank, label: 'Sparschwein' },
      wallet: { icon: Wallet, label: 'Geldbörse' },
      car: { icon: Car, label: 'Auto' },
      travel: { icon: Plane, label: 'Reisen' },
      compass: { icon: Compass, label: 'Kompass' },
      games: { icon: Gamepad2, label: 'Spiele' },
    },
  },
]

/** Symbole für Rezepte */
export const RECIPE_SYMBOL_GROUPS: SymbolGroup[] = [
  {
    symbols: {
      salad: { icon: Salad, label: 'Salat' },
      soup: { icon: Soup, label: 'Suppe' },
      pot: { icon: CookingPot, label: 'Topf' },
      pizza: { icon: Pizza, label: 'Pizza' },
      sandwich: { icon: Sandwich, label: 'Sandwich' },
      egg: { icon: EggFried, label: 'Spiegelei' },
      fish: { icon: Fish, label: 'Fisch' },
      meat: { icon: Drumstick, label: 'Fleisch' },
      grain: { icon: Wheat, label: 'Getreide' },
      bakery: { icon: Croissant, label: 'Gebäck' },
      cake: { icon: CakeSlice, label: 'Kuchen' },
      fruit: { icon: Apple, label: 'Obst' },
      coffee: { icon: Coffee, label: 'Kaffee' },
      drink: { icon: CupSoda, label: 'Getränk' },
      dish: { icon: UtensilsCrossed, label: 'Gericht' },
    },
  },
]

const ALL: Record<string, LucideIcon> = Object.fromEntries(
  [...CATEGORY_SYMBOL_GROUPS, ...RECIPE_SYMBOL_GROUPS].flatMap((g) => Object.entries(g.symbols).map(([k, s]) => [k, s.icon])),
)

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

/** Raster zur Symbolwahl, nach Gruppen gegliedert, optional mit „Ohne“. */
export function SymbolGrid({
  groups,
  value,
  onPick,
  allowNone,
}: {
  groups: SymbolGroup[]
  value?: string
  onPick: (key: string | undefined) => void
  allowNone?: boolean
}) {
  const current = value && LEGACY[value] ? LEGACY[value] : value
  const tone = (active: boolean) => (active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted')
  const cell = (active: boolean) => `grid size-11 place-items-center rounded-full border transition active:scale-95 ${tone(active)}`
  return (
    <div className="space-y-3">
      {allowNone && (
        <button type="button" onClick={() => onPick(undefined)} className={`h-11 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${tone(!value)}`}>
          Ohne Symbol
        </button>
      )}
      {groups.map((g, i) => (
        <div key={g.label ?? i}>
          {g.label && <p className="mb-1.5 px-1 text-xs font-medium tracking-wider text-muted uppercase">{g.label}</p>}
          <div className="flex flex-wrap gap-2">
            {Object.entries(g.symbols).map(([key, { icon: Icon, label }]) => (
              <button key={key} type="button" aria-label={label} title={label} aria-pressed={current === key} onClick={() => onPick(key)} className={cell(current === key)}>
                <Icon size={19} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
