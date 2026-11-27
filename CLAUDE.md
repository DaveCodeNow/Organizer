# HomeMind (Haushalt-App)

Persönliche Haushalts- und Produktivitäts-PWA, primär fürs Handy. Aktuell ein Nutzer, alle Daten lokal im Browser.

Module (Tabs):
- **Übersicht** (`features/overview`) – Fixkosten pro Monat, Verträge (Miete mit Kalt/Nebenkosten, Strom/Gas mit Tarif: Grundpreis, Arbeitspreis, Jahresverbrauch → Abschlagsprüfung, Internet) mit Kündigungsfrist-Warnung, weitere Fixkosten, Kurzinfos aus den anderen Modulen
- **Einkauf** (`features/shopping`) – Einkaufsliste; Rezepte und gespeicherte Listen werden über Buttons im Header als Bottom Sheets verwaltet. Alle eingegebenen Produkte werden in der Tabelle `products` gemerkt (ID aus dem Namen, `productId`), daraus kommen Vorschläge beim Tippen, die Rückfrage „Meintest du …?“ bei Tippfehlern (`lib/products.ts`) und die Produktauswahl (`ProductsSheet`)
- **Ziele & To-dos** (`features/goals`) – To-dos mit Zeithorizont (Heute/Diese Woche/Nächste Woche/Monat/Jahr/eigenes Datum; gespeichert wird nur das Fälligkeitsdatum, die Gruppe wird daraus berechnet – „Nächste Woche“ rutscht so am Montag von selbst in „Diese Woche“), Ziele mit Unterzielen, Habits (täglich oder x-mal pro Woche, Wochenleiste Mo–So, Serien); je höchstens eine frei anlegbare Kategorie mit Symbol (`goals/categories.tsx`, Tabelle `goalCategories`, verwaltet in `CategoryManager.tsx`) und Kategorie-Filter (nur bei Zielen und Habits; To-dos werden über den Button „Neues To-do“ im Bottom Sheet angelegt und sind nach Zeitraum gruppiert). Ziele werden nach Kategorie gruppiert; Symbole gibt es nur an Kategorien, nicht an Zielen. Optionales Punktesystem für To-dos (Schalter im Drei-Punkte-Menü, Einstellung synchronisiert in Tabelle `settings`): Stufen Leicht/Mittel/Wichtig, Stufe wird beim Anlegen gewählt, Standard ist „keine Punkte“; gespeichert wird nur die Stufe (`todo.level`), Punktwerte zentral in `LEVEL_POINTS` (`goals/points.ts`) – Änderungen gelten rückwirkend. Wochenziel gesamt und pro Kategorie, Wochenrückblick (`PointsUI.tsx`); Punktestand bewusst dezent (eine Textzeile, kein Karten-Element). Erledigte To-dos werden beim „Entfernen“ nur archiviert (`archived`), damit die Rückblicke stimmen. (Tags/`tagMeta` sind veraltet, in DB v5 migriert.)

UI-Texte sind auf Deutsch.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (Design-Tokens in `src/index.css` unter `@theme`)
- Dexie (IndexedDB) für lokale Speicherung, `useLiveQuery` für reaktive Daten
- vite-plugin-pwa (installierbar, offline-fähig)
- lucide-react für Icons

## Befehle
- `npm run dev` – Entwicklungsserver (mit `--host`, also auch im WLAN vom Handy erreichbar)
- `npm run build` – Typecheck + Produktions-Build
- Deployment: Push auf `main` → GitHub Action (`.github/workflows/deploy.yml`) → GitHub Pages unter `/<repo>/` (`BASE_PATH`)

## Konto & Sync (Supabase)
- Local-first: Dexie bleibt die Datenquelle der UI; `src/lib/sync.ts` gleicht im Hintergrund mit der Supabase-Tabelle `records` ab (Schema: `supabase/schema.sql`, RLS pro Nutzer).
- Konfiguration per `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` (lokal `.env.local`, siehe `.env.example`; online GitHub-Repo-Variablen). Ohne sie läuft die App rein lokal ohne Login.
- Neue Datensätze brauchen Text-IDs aus `newId()` (kein `++id`), sonst kollidieren Geräte. Neue Tabellen in `SYNC_TABLES` eintragen.
- Kein `table.clear()` für Nutzeraktionen – löst keine Hooks aus, der Sync bekommt das Löschen nicht mit. Stattdessen `toCollection().delete()`.

## Struktur
- `src/features/<modul>/` – ein Ordner pro Feature; neuer Tab in `TABS` in `src/App.tsx`
- `src/components/ui.tsx` – gemeinsame Bausteine (PageHeader, Button, IconButton, Sheet, EmptyState, Field, Segmented, Chips, CheckCircle, SectionTitle, inputClass/fieldClass)
- `src/lib/dates.ts` – Datumshilfen, immer lokales `YYYY-MM-DD` (nie `toISOString`)
- `src/lib/nav.ts` – `navigate(tabId)` wechselt von überall den Tab
- `src/lib/db.ts` – Datenbankschema und Aktionen; Schemaänderungen immer über eine neue `db.version(n)`
- `src/features/account/` – Login-Bildschirm und Konto-Sheet (Wolken-Symbol in der Übersicht)
- `src/lib/categories.ts` – Supermarkt-Kategorien + automatische Zuordnung per Schlüsselwort

## Design
- Charakter: warm, ruhig, wohnlich – eher gemütliches Zuhause als Produktivitäts-Tool. Viel Luft, weiche Formen, gedeckte Naturtöne. Keine grellen Töne, keine Verläufe, keine Schatten, **keine Emojis**.
- Farben nur über Tokens in `src/index.css`: `bg` (Creme), `surface` (Elfenbein, auch Text auf Akzent), `sand` (= `brand-soft`, gedämpfte Hervorhebung), `ink`, `muted`, `line`, `brand` (Salbeigrün, einzige kräftige Farbe, pro Ansicht nur ein dominanter Einsatz), `caramel` (dezente Markierungen), `warn`/`warn-soft` (Terrakotta, sparsam: Warnungen, Löschen). Kein `text-muted` auf `sand` (Kontrast < 4.5).
- Tiefe über Farbabstufung (Creme → Elfenbein) statt Schatten; feine Linien in `line`.
- Schrift: `font-serif` (Fraunces, 400 oder `font-[600]`, Zeilenhöhe ~1.1) nur für Überschriften/Titel; sonst DM Sans (400/500/700 – `font-semibold` ist auf 500 gemappt). Betonte Wörter in Überschriften als `<em>` → kursiv in Akzentfarbe (PageHeader-`title` nimmt ReactNode).
- Formen: Karten `rounded-3xl` (= 1.75rem), Buttons/Inputs/Chips in Pillenform (`rounded-full`), Textareas über `fieldClass`.
- Icons: lucide-react, Linienstil. Symbole von Kategorien/Rezepten über `components/icons.tsx` (`SymbolIcon`, `SymbolGrid`); im Datenfeld `emoji` steht ein Symbol-Schlüssel, alte Emoji-Werte werden dort auf Icons abgebildet.
- Mobile first: max. Breite `max-w-lg`, Bottom-Tab-Bar, Bottom Sheets statt Modals, Safe-Area-Insets beachten
- Touch-Ziele mindestens 40px
- Keine Browser-Dialoge (`confirm`, `alert`, `prompt`) – die werden in eingebetteten Vorschauen unterdrückt. Rückfragen über `confirmDialog()` aus `src/components/Confirm.tsx`.
- Tailwind-Falle: Klassen, die dieselbe Eigenschaft setzen (z. B. `w-24` zu `inputClass` mit `w-full`, `h-10` zu `Button` mit `h-11`), überschreiben sich nicht nach Reihenfolge im className, sondern nach Reihenfolge im CSS. Stattdessen Wrapper nutzen oder `fieldClass` als Basis nehmen.
