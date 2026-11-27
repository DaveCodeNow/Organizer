# Haushalt-App

Persönliche Haushalts- und Produktivitäts-PWA, primär fürs Handy. Aktuell ein Nutzer, alle Daten lokal im Browser.

Module (Tabs):
- **Übersicht** (`features/overview`) – Fixkosten pro Monat, Strom-/Gas-/Internetvertrag mit Kündigungsfrist-Warnung, weitere Fixkosten, Kurzinfos aus den anderen Modulen
- **Einkauf** (`features/shopping`) – Einkaufsliste; Rezepte und gespeicherte Listen werden über Buttons im Header als Bottom Sheets verwaltet
- **Ziele & To-dos** (`features/goals`) – To-dos mit Zeithorizont (Heute/Woche/Monat/Jahr/Datum), Ziele mit Unterzielen; je höchstens eine frei anlegbare Kategorie mit Symbol (`goals/categories.tsx`, Tabelle `goalCategories`, verwaltet in `CategoryManager.tsx`) und gemeinsamem Kategorie-Filter. Ziele haben zusätzlich ein eigenes Symbol und werden nach Kategorie gruppiert. (Tags/`tagMeta` sind veraltet, in DB v5 migriert.)

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

## Struktur
- `src/features/<modul>/` – ein Ordner pro Feature; neuer Tab in `TABS` in `src/App.tsx`
- `src/components/ui.tsx` – gemeinsame Bausteine (PageHeader, Button, IconButton, Sheet, EmptyState, Field, Segmented, Chips, CheckCircle, SectionTitle, inputClass/fieldClass)
- `src/lib/dates.ts` – Datumshilfen, immer lokales `YYYY-MM-DD` (nie `toISOString`)
- `src/lib/nav.ts` – `navigate(tabId)` wechselt von überall den Tab
- `src/lib/db.ts` – Datenbankschema und Aktionen; Schemaänderungen immer über eine neue `db.version(n)`
- `src/lib/categories.ts` – Supermarkt-Kategorien + automatische Zuordnung per Schlüsselwort

## Design
- Hell, ruhig, modern: Hintergrund `bg`, weiße Karten `surface` mit `shadow-card`, große Rundungen (`rounded-3xl` Karten, `rounded-2xl` Inputs/Buttons)
- Akzentfarbe Grün (`brand`, `brand-soft`, `brand-ink`) – keine neuen Farben ohne Token
- Mobile first: max. Breite `max-w-lg`, Bottom-Tab-Bar, Bottom Sheets statt Modals, Safe-Area-Insets beachten
- Touch-Ziele mindestens 40px
- Tailwind-Falle: Klassen, die dieselbe Eigenschaft setzen (z. B. `w-24` zu `inputClass` mit `w-full`, `h-10` zu `Button` mit `h-11`), überschreiben sich nicht nach Reihenfolge im className, sondern nach Reihenfolge im CSS. Stattdessen Wrapper nutzen oder `fieldClass` als Basis nehmen.
