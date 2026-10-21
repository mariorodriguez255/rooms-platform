import type { Database } from "@/types/database";

// Autonomous communities and cities (ISO 3166-2:ES), in the order of their
// Spanish names. Written as an object so that TypeScript fails if one of
// the database enum values is missing.
export type SpanishRegion = Database["public"]["Enums"]["spanish_region"];

const REGIONS = {
  "ES-AN": true, // Andalucía
  "ES-AR": true, // Aragón
  "ES-CN": true, // Canarias
  "ES-CB": true, // Cantabria
  "ES-CL": true, // Castilla y León
  "ES-CM": true, // Castilla-La Mancha
  "ES-CT": true, // Cataluña
  "ES-CE": true, // Ceuta
  "ES-MD": true, // Comunidad de Madrid
  "ES-NC": true, // Comunidad Foral de Navarra
  "ES-VC": true, // Comunitat Valenciana
  "ES-EX": true, // Extremadura
  "ES-GA": true, // Galicia
  "ES-IB": true, // Illes Balears
  "ES-RI": true, // La Rioja
  "ES-ML": true, // Melilla
  "ES-PV": true, // País Vasco
  "ES-AS": true, // Principado de Asturias
  "ES-MC": true, // Región de Murcia
} as const satisfies Record<SpanishRegion, true>;

export const SPANISH_REGIONS = Object.keys(REGIONS) as SpanishRegion[];

export function isSpanishRegion(value: unknown): value is SpanishRegion {
  return typeof value === "string" && Object.hasOwn(REGIONS, value);
}
