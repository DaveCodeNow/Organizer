# Haushalt-App

Persönliche Haushalts- und Produktivitäts-PWA, primär fürs Handy. Aktuell ein Nutzer, alle Daten lokal im Browser. Erstes Modul: Einkaufsliste mit Rezepten und gespeicherten Listen. Weitere Module (z. B. Aufgaben, Putzplan, Budget) folgen.

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
- `src/components/ui.tsx` – gemeinsame Bausteine (PageHeader, Button, IconButton, Sheet, EmptyState, inputClass)
- `src/lib/db.ts` – Datenbankschema und Aktionen; Schemaänderungen immer über eine neue `db.version(n)`
- `src/lib/categories.ts` – Supermarkt-Kategorien + automatische Zuordnung per Schlüsselwort

## Design
- Hell, ruhig, modern: Hintergrund `bg`, weiße Karten `surface` mit `shadow-card`, große Rundungen (`rounded-3xl` Karten, `rounded-2xl` Inputs/Buttons)
- Akzentfarbe Grün (`brand`, `brand-soft`, `brand-ink`) – keine neuen Farben ohne Token
- Mobile first: max. Breite `max-w-lg`, Bottom-Tab-Bar, Bottom Sheets statt Modals, Safe-Area-Insets beachten
- Touch-Ziele mindestens 40px
