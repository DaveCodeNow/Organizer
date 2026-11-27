import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

/**
 * Supabase-Client – nur vorhanden, wenn URL und Key gesetzt sind (.env.local bzw. GitHub-Variablen).
 * Ohne Konfiguration läuft die App wie bisher rein lokal, ohne Anmeldung.
 * Der Key ist der öffentliche „anon“/„publishable“ Key; geschützt werden die Daten per Row Level Security.
 */
export const supabase = url && key ? createClient(url, key) : null
