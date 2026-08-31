"use strict";

/* ============================================================
   Stepford County Railway — app.js
   IndexedDB-gestützte Streckendatenbank + Domino-Streckenplaner
   Datenbasis: reale Routen & Betreiber aus dem SCR-Netz (Version 2.3)
   Mehrsprachig: Deutsch / Englisch (siehe I18N weiter unten)
   ============================================================ */

const DB_NAME = "StepfordCountyRailwayDB";
const DB_VERSION = 2;
const STORE_NAME = "routes";
const SHIFT_LOG_STORE = "shiftLog";
const SETTINGS_STORE = "settings";

// ---- Betreiber (Operator) mit offiziellem Farbschema ----
// Namen sind Eigennamen aus dem Spiel und werden nicht übersetzt.
const OPERATORS = {
  CONNECT: { name: "Stepford Connect", color: "#0096EE", colorDark: "#090D2B", textOn: "#ffffff" },
  METRO: { name: "Metro", color: "#EE4044", colorDark: "#DBF3FF", textOn: "#1a0505" },
  WATERLINE: { name: "Waterline", color: "#34495E", colorDark: "#B2BBC8", textOn: "#ffffff" },
  AIRLINK: { name: "AirLink", color: "#EC7D33", colorDark: "#FFFFFF", textOn: "#241000" },
  EXPRESS: { name: "Stepford Express", color: "#FF0080", colorDark: "#1F1B36", textOn: "#ffffff" }
};

// ---- Streckendaten: [Code, Betreiber, Von, Nach, Stops, Dauer(min), Variante, Einschränkung] ----
// Quelle: von der Community gepflegtes SCR-Streckenblatt (Stand Version 2.3)
// Von/Nach sind echte Stationsnamen aus dem Spiel (nicht übersetzt).
// Einschränkung/Variante sind von uns verfasste Beschreibungstexte und werden
// unten über RESTRICTION_TRANSLATIONS / VARIANT_TRANSLATIONS ins Englische übersetzt.
const ROUTE_ROWS = [
  // --- Stepford Connect (41) ---
  ["R001", "CONNECT", "Stepford Central", "Stepford Airport Central", 10, 18, "", "Alle außer Class 68 und 156"],
  ["R003", "CONNECT", "Stepford Central", "Leighton City", 14, 25, "", "Alle außer 156"],
  ["R004", "CONNECT", "St Helens Bridge", "Edgemead", 10, 19, "", "Alle außer 156"],
  ["R005", "CONNECT", "Stepford Victoria", "Stepford Airport Central", 11, 21, "", "Alle außer 68 und 156"],
  ["R007", "CONNECT", "Stepford Central", "Hampton Hargate", 7, 14, "", "Alle außer 156"],
  ["R009", "CONNECT", "Stepford Victoria", "Edgemead", 14, 28, "", "Alle außer 156"],
  ["R020", "CONNECT", "Stepford Central", "Whitefield", 6, 10, "", "Diesel-Strecke; Class 156 beschränkt"],
  ["R022", "CONNECT", "Beechley", "Whitefield", 6, 10, "", "Diesel-Strecke; Class 156 beschränkt"],
  ["R024", "CONNECT", "Stepford Central", "Llyn-by-the-Sea", 20, 44, "", "Alle außer 156"],
  ["R025", "CONNECT", "St Helens Bridge", "Westwyvern", 17, 35, "", "Alle außer 156"],
  ["R026", "CONNECT", "Stepford Victoria", "Llyn-by-the-Sea", 17, 44, "via Port Benton", "Nur Class 68, 185, 350/1, 380, 385, 730"],
  ["R032", "CONNECT", "Willowfield", "Port Benton", 9, 17, "", "Alle außer 156"],
  ["R033", "CONNECT", "Beechley", "Stepford Airport Central", 10, 19, "", "Alle außer 156"],
  ["R035", "CONNECT", "Willowfield", "Westwyvern", 18, 39, "", "Alle außer 156"],
  ["R036", "CONNECT", "Willowfield", "Llyn-by-the-Sea", 18, 45, "", "Nur Class 68"],
  ["R037", "CONNECT", "Leighton City", "Llyn-by-the-Sea", 8, 20, "", ""],
  ["R038", "CONNECT", "Leighton City", "Westwyvern", 7, 16, "", ""],
  ["R039", "CONNECT", "Benton", "Leighton City", 8, 14, "", ""],
  ["R040", "CONNECT", "Edgemead", "Llyn-by-the-Sea", 9, 22, "", ""],
  ["R041", "CONNECT", "Leighton West", "Edgemead", 2, 4, "", ""],
  ["R042", "CONNECT", "Leighton West", "Llyn-by-the-Sea", 9, 22, "", ""],
  ["R043", "CONNECT", "Leighton West", "Leighton City", 2, 4, "", ""],
  ["R044", "CONNECT", "Benton", "Leighton West", 9, 15, "", ""],
  ["R045", "CONNECT", "Stepford Victoria", "Leighton City", 14, 26, "", "Alle außer 156"],
  ["R046", "CONNECT", "Stepford Victoria", "Airport Terminal 2", 12, 23, "", "Alle außer 68 und 156"],
  ["R048", "CONNECT", "St Helens Bridge", "Airport Terminal 2", 8, 16, "", "Alle außer 156"],
  ["R049", "CONNECT", "Rayleigh Bay", "Edgemead", 4, 5, "", "Diesel-Strecke"],
  ["R050", "CONNECT", "Rayleigh Bay", "Llyn-by-the-Sea", 12, 21, "", "Diesel-Strecke"],
  ["R100", "CONNECT", "Rayleigh Bay", "Leighton West", 5, 7, "", "Diesel-Strecke"],
  ["R101", "CONNECT", "Rayleigh Bay", "Leighton City", 5, 7, "", "Diesel-Strecke"],
  ["R102", "CONNECT", "Rayleigh Bay", "Westwyvern", 9, 18, "", "Nur Class 156"],
  ["R103", "CONNECT", "Willowfield", "Whitefield", 8, 14, "", "Diesel-Strecke; Class 156 beschränkt"],
  ["R104", "CONNECT", "Stepford Central", "Llyn-by-the-Sea", 15, 34, "Semi-Fast", "Nur Class 68, 185, 350/1, 380, 385, 700, 730"],
  ["R105", "CONNECT", "Stepford Central", "Westwyvern", 13, 27, "Semi-Fast", "Nur Class 68, 185, 350/1, 380, 385, 700, 730"],
  ["R106", "CONNECT", "Stepford Central", "Rayleigh Bay", 13, 26, "Semi-Fast", "Nur Class 68, 185"],
  ["R107", "CONNECT", "Stepford Central", "Leighton West", 11, 22, "Semi-Fast", "Nur Class 68, 185, 350/1, 380, 385, 700, 730"],
  ["R108", "CONNECT", "Stepford Airport Central", "Westwyvern", 6, 21, "", "Nur Class 68, 185, 350/1, 380, 385, 700, 730"],
  ["R109", "CONNECT", "Stepford Airport Central", "Leighton West", 7, 16, "", "Nur Class 68, 185, 350/1, 380, 385, 700, 730"],
  ["R110", "CONNECT", "Rayleigh Bay", "Northshore", 11, 22, "", "Nur Class 156"],
  ["R111", "CONNECT", "Esterfield", "Leighton City", 5, 8, "", "Nur Class 43; Diesel-Strecke"],
  ["R112", "CONNECT", "Esterfield", "Llyn-by-the-Sea", 15, 33, "via Leighton West", "Diesel-Strecke; ausgenommen 2+6-Wagen-Einheit Class 68 und Class 93"],

  // --- Metro (26) ---
  ["R002", "METRO", "Stepford Central", "Port Benton", 10, 17, "", ""],
  ["R006", "METRO", "Stepford Victoria", "Port Benton", 13, 21, "", ""],
  ["R008", "METRO", "Stepford Victoria", "Berrily", 12, 19, "", ""],
  ["R021", "METRO", "Stepford Central", "Stepford UFC", 6, 8, "", ""],
  ["R023", "METRO", "Stepford Victoria", "Stepford UFC", 9, 14, "", ""],
  ["R027", "METRO", "Stepford Central", "Berrily", 9, 13, "", ""],
  ["R028", "METRO", "Stepford Victoria", "Willowfield", 5, 8, "", ""],
  ["R029", "METRO", "Stepford Victoria", "Beechley", 3, 4, "", ""],
  ["R030", "METRO", "Willowfield", "Berrily", 14, 21, "via Barton", ""],
  ["R031", "METRO", "Willowfield", "Stepford UFC", 10, 16, "", ""],
  ["R034", "METRO", "Beechley", "Morganstown", 14, 21, "via Elsemere Junction", ""],
  ["R047", "METRO", "St Helens Bridge", "Port Benton", 6, 10, "", ""],
  ["R130", "METRO", "Stepford Central", "Morganstown", 12, 17, "via Barton", ""],
  ["R131", "METRO", "St Helens Bridge", "Morganstown", 8, 11, "via Barton", ""],
  ["R132", "METRO", "Stepford Central", "Barton", 9, 13, "Barton-Ring · im Uhrzeigersinn", ""],
  ["R133", "METRO", "Willowfield", "Barton", 13, 22, "Barton-Ring · im Uhrzeigersinn", ""],
  ["R134", "METRO", "St Helens Bridge", "Barton", 5, 7, "Barton-Ring · im Uhrzeigersinn", ""],
  ["R135", "METRO", "Beechley", "Barton", 11, 18, "Barton-Ring · gegen den Uhrzeigersinn", ""],
  ["R136", "METRO", "Stepford Victoria", "Barton", 12, 20, "Barton-Ring · gegen den Uhrzeigersinn", ""],
  ["R137", "METRO", "Stepford Victoria", "Morganstown", 15, 25, "via Port Benton", "Nur Class 756"],
  ["R139", "METRO", "Greenslade", "Stepford Bay", 15, 23, "via Elsemere Junction", "Nur Class 398, 756"],
  ["R140", "METRO", "Beechley", "Stepford Bay", 3, 4, "", "Nur Class 398, 756"],
  ["R141", "METRO", "Willowfield", "Stepford Bay", 5, 8, "", "Nur Class 398, 756"],
  ["R142", "METRO", "Whitney Green", "Stepford Bay", 18, 26, "via Barton", "Nur Class 398"],
  ["R143", "METRO", "Stepford Central", "Whitney Green", 13, 18, "via Elsemere Junction", "Nur Class 398"],
  ["R144", "METRO", "Stepford Victoria", "Greenslade", 15, 24, "via Barton", "Nur Class 398"],

  // --- Waterline (11) ---
  ["R010", "WATERLINE", "Newry", "Greenslade", 9, 11, "", ""],
  ["R011", "WATERLINE", "Newry", "Connolly", 8, 11, "", ""],
  ["R012", "WATERLINE", "Newry Harbour", "Connolly", 9, 13, "", ""],
  ["R013", "WATERLINE", "Benton", "Greenslade", 4, 5, "", ""],
  ["R014", "WATERLINE", "Newry", "Esterfield", 9, 16, "", ""],
  ["R015", "WATERLINE", "Benton", "Morganstown", 4, 5, "Morganstown Shuttle", "Nur Class 143, 165, 166, 171, 195"],
  ["R016", "WATERLINE", "Benton", "Esterfield", 7, 10, "", ""],
  ["R017", "WATERLINE", "Newry", "Airport Terminal 2", 8, 14, "", ""],
  ["R018", "WATERLINE", "Newry Harbour", "Farleigh", 10, 16, "", ""],
  ["R019", "WATERLINE", "Benton", "Connolly", 4, 5, "", ""],
  ["R120", "WATERLINE", "Newry Harbour", "Morganstown", 9, 13, "", ""],

  // --- AirLink (11) ---
  ["R051", "AIRLINK", "Stepford Central", "Stepford Airport Central", 2, 8, "Express (E)", "Alle außer 345"],
  ["R052", "AIRLINK", "Stepford Central", "Airport Terminal 2", 4, 13, "Express (E)", "Alle außer 345"],
  ["R053", "AIRLINK", "Stepford Central", "Airport Terminal 2", 7, 16, "Stopper (S)", "Alle außer 345"],
  ["R054", "AIRLINK", "Stepford Central", "Stepford Airport Central", 5, 11, "Stopper (S)", "Alle außer 345"],
  ["R055", "AIRLINK", "Stepford Central", "Airport Terminal 3", 6, 16, "", "Alle außer 345"],
  ["R056", "AIRLINK", "Stepford Airport Central", "Leighton Stepford Road", 3, 8, "", "Alle außer 345"],
  ["R057", "AIRLINK", "Airport Terminal 3", "Leighton Stepford Road", 4, 13, "", "Alle außer 345"],
  ["R058", "AIRLINK", "Stepford Central", "Airport Terminal 3", 6, 13, "via Terminal 1", ""],
  ["R059", "AIRLINK", "Stepford Central", "Airport Terminal 2", 6, 14, "", ""],
  ["R060", "AIRLINK", "Morganstown", "Airport Terminal 2", 6, 12, "Terminals-Morganstown Shuttle", "Nur Class 345"],
  ["R063", "AIRLINK", "Hampton Hargate", "Airport Terminal 2", 6, 13, "Terminals-Hampton-Hargate Shuttle", "Nur Class 345"],

  // --- Stepford Express (17) ---
  ["R075", "EXPRESS", "Stepford Central", "Benton", 2, 6, "Benton Express (fast)", ""],
  ["R076", "EXPRESS", "Stepford Central", "Leighton City", 5, 13, "via Benton · Leighton Express", ""],
  ["R077", "EXPRESS", "Stepford Central", "Llyn-by-the-Sea", 9, 23, "via Benton", ""],
  ["R078", "EXPRESS", "Stepford Central", "Llyn-by-the-Sea", 6, 22, "via Benton (fast)", ""],
  ["R079", "EXPRESS", "Stepford Central", "Benton", 3, 6, "Benton Express", ""],
  ["R080", "EXPRESS", "Stepford Central", "Llyn-by-the-Sea", 8, 20, "via Morganstown (fast)", ""],
  ["R081", "EXPRESS", "Stepford Central", "Llyn-by-the-Sea", 3, 17, "super fast", ""],
  ["R082", "EXPRESS", "Stepford Central", "Westwyvern", 7, 19, "Westwyvern Express", ""],
  ["R083", "EXPRESS", "Newry", "Llyn-by-the-Sea", 8, 24, "via Morganstown", "Diesel-Strecke"],
  ["R084", "EXPRESS", "Newry Harbour", "Llyn-by-the-Sea", 7, 27, "via Benton", "Diesel-Strecke; Doppel-180/221/800 beschränkt"],
  ["R085", "EXPRESS", "Benton", "Llyn-by-the-Sea", 6, 20, "", ""],
  ["R086", "EXPRESS", "Newry", "Leighton City", 5, 14, "via Benton", "Nur Class 220, 221, 800 (Einzel-/5-Wagen-Einheit)"],
  ["R087", "EXPRESS", "Rayleigh Bay", "Llyn-by-the-Sea", 5, 17, "Rayleigh Bay Express", ""],
  ["R088", "EXPRESS", "Stepford Central", "Llyn-by-the-Sea", 9, 24, "via Benton · Westercoast Express", ""],
  ["R090", "EXPRESS", "Leighton City", "Llyn-by-the-Sea", 3, 10, "", ""],
  ["R091", "EXPRESS", "Esterfield", "Llyn-by-the-Sea", 6, 19, "", "Nur Class 180, 220, 221, 800/2 (Einzel-/5-Wagen-Einheit), Class 43 (2+4)"],
  ["R092", "EXPRESS", "Stepford Central", "Esterfield", 4, 14, "via Morganstown", "Nur Class 180, 220, 221, 800/2 (Einzel-/5-Wagen-Einheit), Class 43 (2+4)"]
];

function buildSeedData() {
  return ROUTE_ROWS.map((row, i) => ({
    id: i + 1,
    code: row[0],
    operator: row[1],
    from: row[2],
    to: row[3],
    stops: row[4],
    duration: row[5],
    variant: row[6],
    restriction: row[7]
  }));
}

// ============================================================
// Übersetzung von Einschränkungs-/Varianten-Text (Datenfelder, kein UI-Text)
// ============================================================

const RESTRICTION_TRANSLATIONS = {
  "Alle außer 156": "All except Class 156",
  "Alle außer 345": "All except Class 345",
  "Alle außer 68 und 156": "All except Class 68 and 156",
  "Alle außer Class 68 und 156": "All except Class 68 and 156",
  "Diesel-Strecke": "Diesel route",
  "Diesel-Strecke; Class 156 beschränkt": "Diesel route; Class 156 restricted",
  "Diesel-Strecke; Doppel-180/221/800 beschränkt": "Diesel route; double 180/221/800 restricted",
  "Nur Class 143, 165, 166, 171, 195": "Class 143, 165, 166, 171, 195 only",
  "Nur Class 156": "Class 156 only",
  "Nur Class 220, 221, 800 (Einzel-/5-Wagen-Einheit)": "Class 220, 221, 800 only (single/5-car unit)",
  "Nur Class 345": "Class 345 only",
  "Nur Class 398": "Class 398 only",
  "Nur Class 398, 756": "Class 398, 756 only",
  "Nur Class 68": "Class 68 only",
  "Nur Class 68, 185": "Class 68, 185 only",
  "Nur Class 68, 185, 350/1, 380, 385, 700, 730": "Class 68, 185, 350/1, 380, 385, 700, 730 only",
  "Nur Class 68, 185, 350/1, 380, 385, 730": "Class 68, 185, 350/1, 380, 385, 730 only",
  "Nur Class 756": "Class 756 only",
  "Nur Class 43; Diesel-Strecke": "Class 43 only; diesel route",
  "Diesel-Strecke; ausgenommen 2+6-Wagen-Einheit Class 68 und Class 93": "Diesel route; excludes 2+6-car Class 68 and Class 93 units",
  "Nur Class 180, 220, 221, 800/2 (Einzel-/5-Wagen-Einheit), Class 43 (2+4)": "Class 180, 220, 221, 800/2 only (single/5-car unit), Class 43 (2+4) only"
};

const VARIANT_TRANSLATIONS = {
  "Barton-Ring · im Uhrzeigersinn": "Barton Loop · clockwise",
  "Barton-Ring · gegen den Uhrzeigersinn": "Barton Loop · anticlockwise"
};

function localizeRestriction(text) {
  if (!text) return text;
  if (currentLang === "en" && RESTRICTION_TRANSLATIONS[text]) return RESTRICTION_TRANSLATIONS[text];
  return text;
}

function localizeVariant(text) {
  if (!text) return text;
  if (currentLang === "en" && VARIANT_TRANSLATIONS[text]) return VARIANT_TRANSLATIONS[text];
  return text;
}

// ============================================================
// UI-Übersetzungen (Deutsch / Englisch)
// ============================================================

const I18N = {
  de: {
    page_title: "Stepford County Railway — Streckennetz & Planer",
    brand_sub: "Transport for Stepford  ·  SCR-Streckendatenbank",
    nav_netz: "Streckennetz",
    nav_planer: "Streckenplaner",
    eyebrow: "Fahrplanamt SCR",
    hero_title: "FÜNF BETREIBER. EIN NETZWERK.",
    hero_copy: "Alle 106 aktiven Strecken von Stepford Connect, Metro, Waterline, AirLink und Stepford Express an einem Ort — inklusive Fahrzeit und Fahrzeugbeschränkung. Unten kannst du das Netz nach Betreiber filtern und dir per Domino-Prinzip eine durchgehende Fahrt zusammenstellen lassen: Der Endbahnhof jeder Strecke ist der Startbahnhof der nächsten.",
    stat_stations: "Bahnhöfe",
    stat_routes: "Strecken",
    stat_operators: "Betreiber",
    stat_interchanges: "Umsteigebahnhöfe",
    netz_title: "Streckennetz",
    netz_desc_pre: "Das vollständige Verzeichnis aller aktiven SCR-Routen. Spalten sind sortierbar, über die Betreiber-Schalter filterst du nach Zugkompatibilität, und über das Suchfeld nach Bahnhof oder Routencode. Bahnhofsnamen mit ",
    netz_desc_hint: "Punkt-Markierung",
    netz_desc_post: " sind Umsteigebahnhöfe zwischen mehreren Betreibern — anklicken zeigt alle dortigen Strecken.",
    search_placeholder: "Bahnhof oder Routencode suchen …",
    export_csv: "↓ Als CSV exportieren",
    th_code: "Code",
    th_operator: "Betreiber",
    th_route: "Strecke",
    th_stops: "Stops",
    th_duration: "Dauer",
    th_restriction: "Einschränkung",
    loading_routes: "Lade Streckendaten aus der Datenbank …",
    db_error: "Streckendatenbank konnte nicht geladen werden.",
    no_operator_selected: "Kein Betreiber ausgewählt — bitte oben mindestens einen aktivieren.",
    no_routes_found: "Keine Strecken gefunden — bitte Suchbegriff prüfen.",
    interchange_badge_title: "Umsteigebahnhof: {{ops}}",
    station_link_title: "Alle Strecken dieses Bahnhofs anzeigen",
    quick_filter_title: "Nur {{op}} anzeigen",
    station_detail_close: "✕ Schließen",
    station_detail_interchange: "Umsteigebahnhof · ",
    net_stats_longest: "Längste Strecke",
    net_stats_shortest: "Kürzeste Strecke",
    net_stats_busiest: "Meistbedienter Bahnhof",
    net_stats_routes_suffix: "Strecken",
    planer_title: "Streckenplaner",
    planer_desc: "Wähle, wie viele Strecken die Schicht haben soll, und ob es ein bestimmter Betreiber sein soll. Du bekommst danach eine komplette Schicht vorgeschlagen — mit Haken übernimmst du sie, mit Kreuz schlage ich eine neue vor. Bei Annahme wird die Schicht als Liste angezeigt: Mit „Nächste Strecke“ schließt du eine Strecke ab und bekommst die nächste, bis am Ende „Ende der Schicht“ erscheint.",
    field_chain_operator: "Betreiber der Schicht",
    option_random_operator: "Zufällig (ein Betreiber)",
    field_route_count: "Anzahl Strecken",
    field_start_station: "Startbahnhof",
    option_random_station: "Zufällig",
    plan_btn: "Schicht vorschlagen",
    surprise_btn: "🎲 Überraschungs-Schicht",
    surprise_btn_title: "Betreiber, Länge und Start komplett zufällig würfeln",
    form_note: "Domino-Regel: Endbahnhof der Strecke n = Startbahnhof der Strecke n+1. Jede Strecke wird höchstens einmal verwendet und die ganze Schicht bleibt beim gleichen Betreiber.",
    no_routes_for_operator: "Für diesen Betreiber sind keine Strecken verfügbar.",
    retry_btn: "Erneut versuchen",
    no_chain_found: "Von diesem Startbahnhof aus konnte bei {{op}} keine Schicht gefunden werden. Bitte einen anderen Startbahnhof oder Betreiber wählen.",
    proposal_count: "{{count}} von {{desired}} gewünschten Strecken",
    proposal_duration: "{{min}} min Gesamtfahrzeit",
    proposal_shortfall: "Das Netzwerk erlaubte ab diesem Startbahnhof keine durchgehende Schicht der vollen Länge. Vorschlag mit der längstmöglichen Schicht ({{count}} Strecken).",
    accept_chain: "✓ Schicht übernehmen",
    reject_chain: "✗ Neue Schicht vorschlagen",
    start_tag: "Start",
    transfer_tag: "Umstieg",
    destination_tag: "Ziel",
    shift_progress: "{{done}} von {{total}} Strecken erledigt",
    shift_total_duration: "{{min}} min Gesamtfahrzeit der Schicht",
    next_leg_btn: "Nächste Strecke",
    shift_end_label: "Ende der Schicht",
    shift_end_rest: "alle {{count}} Strecken erledigt, {{min}} min Gesamtfahrzeit.",
    copy_shift_btn: "Als Text kopieren",
    copy_shift_done: "Kopiert ✓",
    new_shift_btn: "Neue Schicht vorschlagen",
    shift_history_title: "Schicht-Verlauf",
    clear_history: "Verlauf löschen",
    shift_history_empty: "Noch keine Schicht abgeschlossen.",
    shift_history_total: "Insgesamt {{shifts}} Schichten · {{routes}} Strecken · {{min}} min Gesamtfahrzeit",
    shift_history_routes_suffix: "Strecken",
    footer_line1: "Stepford County Railway — Streckendaten lokal in IndexedDB gespeichert.",
    footer_line2: "Inoffizielles Fan-Tool, basierend auf öffentlichen SCR-Netzdaten (Version 2.3).",
    copy_shift_header: "Stepford County Railway — Schicht ({{op}})",
    copy_shift_summary: "{{count}} Strecken · {{min}} min Gesamtfahrzeit",
    locale: "de-DE"
  },
  en: {
    page_title: "Stepford County Railway — Route Network & Planner",
    brand_sub: "Transport for Stepford  ·  SCR route database",
    nav_netz: "Route Network",
    nav_planer: "Route Planner",
    eyebrow: "SCR Timetabling Office",
    hero_title: "FIVE OPERATORS. ONE NETWORK.",
    hero_copy: "All 106 active routes from Stepford Connect, Metro, Waterline, AirLink and Stepford Express in one place — including journey time and rolling-stock restriction. Below you can filter the network by operator and have a through journey put together for you, domino-style: the terminus of each route is the starting point of the next.",
    stat_stations: "Stations",
    stat_routes: "Routes",
    stat_operators: "Operators",
    stat_interchanges: "Interchanges",
    netz_title: "Route Network",
    netz_desc_pre: "The complete directory of all active SCR routes. Columns are sortable, the operator switches filter by rolling-stock compatibility, and the search box filters by station or route code. Station names with a ",
    netz_desc_hint: "dot marker",
    netz_desc_post: " are interchanges between several operators — click one to see every route serving it.",
    search_placeholder: "Search station or route code …",
    export_csv: "↓ Export as CSV",
    th_code: "Code",
    th_operator: "Operator",
    th_route: "Route",
    th_stops: "Stops",
    th_duration: "Time",
    th_restriction: "Restriction",
    loading_routes: "Loading route data from the database …",
    db_error: "The route database could not be loaded.",
    no_operator_selected: "No operator selected — please enable at least one above.",
    no_routes_found: "No routes found — please check your search term.",
    interchange_badge_title: "Interchange: {{ops}}",
    station_link_title: "Show all routes serving this station",
    quick_filter_title: "Show only {{op}}",
    station_detail_close: "✕ Close",
    station_detail_interchange: "Interchange · ",
    net_stats_longest: "Longest route",
    net_stats_shortest: "Shortest route",
    net_stats_busiest: "Busiest station",
    net_stats_routes_suffix: "routes",
    planer_title: "Route Planner",
    planer_desc: "Choose how many routes the shift should have, and whether it should stick to a specific operator. You'll then be offered a complete shift — accept it with the tick, or get a new one with the cross. Once accepted, the shift shows as a list: use “Next route” to finish one route and get the next, until “End of shift” appears at the end.",
    field_chain_operator: "Shift operator",
    option_random_operator: "Random (one operator)",
    field_route_count: "Number of routes",
    field_start_station: "Starting station",
    option_random_station: "Random",
    plan_btn: "Suggest a shift",
    surprise_btn: "🎲 Surprise shift",
    surprise_btn_title: "Randomise operator, length and starting station completely",
    form_note: "Domino rule: the terminus of route n is the starting point of route n+1. Each route is used at most once, and the whole shift stays with the same operator.",
    no_routes_for_operator: "No routes are available for this operator.",
    retry_btn: "Try again",
    no_chain_found: "No shift could be found for {{op}} from this starting station. Please choose a different starting station or operator.",
    proposal_count: "{{count}} of {{desired}} requested routes",
    proposal_duration: "{{min}} min total journey time",
    proposal_shortfall: "The network didn't allow a through shift of the full length from this starting station. Showing the longest possible shift ({{count}} routes).",
    accept_chain: "✓ Accept shift",
    reject_chain: "✗ Suggest a new shift",
    start_tag: "Start",
    transfer_tag: "Change",
    destination_tag: "Destination",
    shift_progress: "{{done}} of {{total}} routes done",
    shift_total_duration: "{{min}} min total shift journey time",
    next_leg_btn: "Next route",
    shift_end_label: "End of shift",
    shift_end_rest: "all {{count}} routes done, {{min}} min total journey time.",
    copy_shift_btn: "Copy as text",
    copy_shift_done: "Copied ✓",
    new_shift_btn: "Suggest a new shift",
    shift_history_title: "Shift history",
    clear_history: "Clear history",
    shift_history_empty: "No shift completed yet.",
    shift_history_total: "Total {{shifts}} shifts · {{routes}} routes · {{min}} min total journey time",
    shift_history_routes_suffix: "routes",
    footer_line1: "Stepford County Railway — route data stored locally in IndexedDB.",
    footer_line2: "Unofficial fan tool, based on public SCR network data (Version 2.3).",
    copy_shift_header: "Stepford County Railway — Shift ({{op}})",
    copy_shift_summary: "{{count}} routes · {{min}} min total journey time",
    locale: "en-GB"
  }
};

let currentLang = "de";

function t(key, vars) {
  const dict = I18N[currentLang] || I18N.de;
  let text = dict[key] ?? I18N.de[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
    });
  }
  return text;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (key === "netz_desc") {
      el.innerHTML = `${t("netz_desc_pre")}<span class="interchange-hint" data-i18n="netz_desc_hint">${t("netz_desc_hint")}</span>${t("netz_desc_post")}`;
    } else if (key === "form_note") {
      el.innerHTML = t("form_note")
        .replace(/\bn\+1\b/, "<em>n+1</em>")
        .replace(/route n\b/, "route <em>n</em>")
        .replace(/Strecke n\b/, "Strecke <em>n</em>");
    } else if (key !== "netz_desc_hint") {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });
  document.title = t("page_title");

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

async function setLanguage(lang) {
  if (lang !== "de" && lang !== "en") return;
  currentLang = lang;
  applyStaticTranslations();
  flapText(document.getElementById("heroTitle"), t("hero_title"), { cycles: 5, stepMs: 40 });

  renderStats();
  renderNetStats();
  renderOperatorLegend();
  renderRouteTable();
  populateChainOperatorSelect();
  populateStartStationSelect();
  renderShiftHistory();

  const panel = document.getElementById("stationDetail");
  if (panel && !panel.hidden) panel.hidden = true;

  try { await saveSetting("language", lang); } catch (err) { /* nicht kritisch */ }
}

function setupLanguageSwitch() {
  const el = document.getElementById("langSwitch");
  if (!el) return;
   
  el.addEventListener("change", () => {
    setLanguage(el.value);
  });
}

// ============================================================
// IndexedDB helpers
// ============================================================

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("from", "from", { unique: false });
        store.createIndex("to", "to", { unique: false });
        store.createIndex("operator", "operator", { unique: false });
      }
      if (!db.objectStoreNames.contains(SHIFT_LOG_STORE)) {
        db.createObjectStore(SHIFT_LOG_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllRoutes(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Schreibt die Streckendaten aus dem Code immer vollständig in die Datenbank
// (statt nur beim allerersten Laden). So kommen neue/geänderte Strecken auch
// bei wiederkehrenden Besuchern an, statt dass die alte, einmal gespeicherte
// Version für immer bestehen bleibt.
async function syncRoutes(db) {
  const seed = buildSeedData();
  await withStore(db, "readwrite", (store) => {
    store.clear();
    seed.forEach(route => store.put(route));
  });
  return seed;
}

// ---- Schicht-Verlauf ----
let dbHandle = null;

function addShiftLogEntry(entry) {
  return new Promise((resolve, reject) => {
    const tx = dbHandle.transaction(SHIFT_LOG_STORE, "readwrite");
    tx.objectStore(SHIFT_LOG_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getShiftLog() {
  return new Promise((resolve, reject) => {
    const tx = dbHandle.transaction(SHIFT_LOG_STORE, "readonly");
    const req = tx.objectStore(SHIFT_LOG_STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
    req.onerror = () => reject(req.error);
  });
}

function clearShiftLogStore() {
  return new Promise((resolve, reject) => {
    const tx = dbHandle.transaction(SHIFT_LOG_STORE, "readwrite");
    tx.objectStore(SHIFT_LOG_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Gemerkte Planer-Einstellungen ----
function saveSetting(key, value) {
  return new Promise((resolve, reject) => {
    const tx = dbHandle.transaction(SETTINGS_STORE, "readwrite");
    tx.objectStore(SETTINGS_STORE).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadSettings() {
  return new Promise((resolve, reject) => {
    const tx = dbHandle.transaction(SETTINGS_STORE, "readonly");
    const req = tx.objectStore(SETTINGS_STORE).getAll();
    req.onsuccess = () => {
      const map = {};
      req.result.forEach(row => { map[row.key] = row.value; });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

// ============================================================
// Split-flap text effect (Solari-Board Signature-Element)
// ============================================================

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,–'";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function flapText(el, finalText, opts = {}) {
  const cycles = opts.cycles ?? 6;
  const stepMs = opts.stepMs ?? 45;

  if (prefersReducedMotion) {
    el.textContent = finalText;
    return;
  }

  const chars = finalText.split("");
  el.innerHTML = "";
  const spans = chars.map(ch => {
    const span = document.createElement("span");
    span.className = "flap-char";
    span.textContent = ch === " " ? "\u00A0" : ch;
    el.appendChild(span);
    return { span, final: ch };
  });

  spans.forEach(({ span, final }, index) => {
    let tick = 0;
    const totalTicks = cycles + Math.floor(index / 2);
    const interval = setInterval(() => {
      tick++;
      if (tick >= totalTicks) {
        span.textContent = final === " " ? "\u00A0" : final;
        clearInterval(interval);
      } else {
        const rand = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        span.textContent = rand === " " ? "\u00A0" : rand;
      }
    }, stepMs);
  });
}

// ============================================================
// Rendering: Streckennetz-Tabelle
// ============================================================

let allRoutes = [];
let sortState = { key: "operator", desc: false };
let activeOperatorFilter = new Set(Object.keys(OPERATORS));
let searchQuery = "";
let stationOperators = new Map(); // Station -> Set(Betreiber-Keys), für Umsteigebahnhof-Markierung

function computeStationOperators() {
  stationOperators = new Map();
  allRoutes.forEach(r => {
    [r.from, r.to].forEach(st => {
      if (!stationOperators.has(st)) stationOperators.set(st, new Set());
      stationOperators.get(st).add(r.operator);
    });
  });
}

function isInterchange(station) {
  const ops = stationOperators.get(station);
  return !!ops && ops.size > 1;
}

function stationTitle(station) {
  const ops = stationOperators.get(station);
  if (!ops) return "";
  return [...ops].map(k => OPERATORS[k].name).join(" · ");
}

function operatorBadge(key, clickable) {
  const op = OPERATORS[key];
  if (!op) return key;
  if (clickable) {
    return `<button type="button" class="op-badge op-badge-clickable" data-op-filter="${key}" style="--op-color:${op.color}; --op-text:${op.textOn}" title="${t("quick_filter_title", { op: op.name })}">${op.name}</button>`;
  }
  return `<span class="op-badge" style="--op-color:${op.color}; --op-text:${op.textOn}">${op.name}</span>`;
}

function setCssOperatorVars() {
  const root = document.documentElement.style;
  Object.entries(OPERATORS).forEach(([key, op]) => {
    root.setProperty(`--op-${key.toLowerCase()}`, op.color);
  });
}

function filteredRoutes() {
  const q = searchQuery.trim().toLowerCase();
  return allRoutes.filter(r => {
    if (!activeOperatorFilter.has(r.operator)) return false;
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.from.toLowerCase().includes(q) ||
      r.to.toLowerCase().includes(q)
    );
  });
}

function stationLink(station) {
  const interchange = isInterchange(station);
  const title = interchange ? t("interchange_badge_title", { ops: stationTitle(station) }) : t("station_link_title");
  return `<button type="button" class="station-link${interchange ? " interchange" : ""}" data-station="${station}" title="${title}">${station}</button>`;
}

function renderRouteTable() {
  const tbody = document.getElementById("routeTableBody");
  const rows = filteredRoutes();

  const sorted = [...rows].sort((a, b) => {
    let av = a[sortState.key];
    let bv = b[sortState.key];
    if (sortState.key === "operator") { av = OPERATORS[a.operator].name; bv = OPERATORS[b.operator].name; }
    if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return sortState.desc ? 1 : -1;
    if (av > bv) return sortState.desc ? -1 : 1;
    return 0;
  });

  if (sorted.length === 0) {
    const reason = activeOperatorFilter.size === 0 ? t("no_operator_selected") : t("no_routes_found");
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">${reason}</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(r => `
    <tr>
      <td class="route-code mono">${r.code}</td>
      <td>${operatorBadge(r.operator, true)}</td>
      <td class="route-name">${stationLink(r.from)} <span class="arrow">&harr;</span> ${stationLink(r.to)}${r.variant ? `<span class="variant">${localizeVariant(r.variant)}</span>` : ""}</td>
      <td class="align-right mono">${r.stops}</td>
      <td class="duration-cell align-right">${r.duration} min</td>
      <td class="restriction-cell">${r.restriction ? localizeRestriction(r.restriction) : "<span class=\"none\">—</span>"}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".timetable th[data-sort]").forEach(th => {
    th.classList.toggle("sorted", th.dataset.sort === sortState.key);
    th.classList.toggle("desc", th.dataset.sort === sortState.key && sortState.desc);
  });

  tbody.querySelectorAll(".station-link").forEach(btn => {
    btn.addEventListener("click", () => showStationDetail(btn.dataset.station));
  });

  tbody.querySelectorAll(".op-badge-clickable").forEach(btn => {
    btn.addEventListener("click", () => quickFilterOperator(btn.dataset.opFilter));
  });
}

// Klick auf ein Betreiber-Badge in der Tabelle: nur diesen Betreiber anzeigen.
// Erneuter Klick (wenn er schon der einzige aktive ist) setzt wieder auf "alle" zurück.
function quickFilterOperator(key) {
  const isOnlyThisOne = activeOperatorFilter.size === 1 && activeOperatorFilter.has(key);
  activeOperatorFilter = isOnlyThisOne ? new Set(Object.keys(OPERATORS)) : new Set([key]);

  document.querySelectorAll('#operatorLegend input[type="checkbox"]').forEach(input => {
    input.checked = activeOperatorFilter.has(input.value);
  });

  renderRouteTable();
  populateStartStationSelect();
}

function setupSearch() {
  const input = document.getElementById("routeSearch");
  if (!input) return;
  input.addEventListener("input", () => {
    searchQuery = input.value;
    renderRouteTable();
  });
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportRoutesCsv() {
  const rows = filteredRoutes();
  const header = [t("th_code"), t("th_operator"), "Von/From", "Nach/To", "Variante/Variant", t("th_stops"), t("th_duration") + " (min)", t("th_restriction")];
  const lines = [header.map(csvEscape).join(";")];
  rows.forEach(r => {
    lines.push([
      r.code, OPERATORS[r.operator].name, r.from, r.to, localizeVariant(r.variant) || "", r.stops, r.duration, localizeRestriction(r.restriction) || ""
    ].map(csvEscape).join(";"));
  });
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scr-streckennetz.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setupCsvExport() {
  const btn = document.getElementById("exportCsvBtn");
  if (!btn) return;
  btn.addEventListener("click", exportRoutesCsv);
}

function showStationDetail(station) {
  const panel = document.getElementById("stationDetail");
  const serving = allRoutes.filter(r => r.from === station || r.to === station);
  const ops = stationOperators.get(station) || new Set();

  panel.hidden = false;
  panel.innerHTML = `
    <div class="station-detail-head">
      <div>
        <div class="station-detail-title">${station}</div>
        <div class="station-detail-sub">${ops.size > 1 ? t("station_detail_interchange") : ""}${[...ops].map(k => operatorBadge(k)).join(" ")}</div>
      </div>
      <button type="button" class="btn btn-ghost" id="stationDetailClose">${t("station_detail_close")}</button>
    </div>
    <ol class="shift-list">
      ${serving.map(r => `
        <li class="shift-item done">
          <span class="shift-index mono">${r.code}</span>
          <div class="shift-info">
            <div class="shift-route">${r.from} <span class="arrow">&rarr;</span> ${r.to}${r.variant ? `<span class="variant">${localizeVariant(r.variant)}</span>` : ""}</div>
            <div class="shift-meta">
              ${operatorBadge(r.operator)}
              <span class="mono">${r.duration} min</span>
              ${r.restriction ? `<span class="shift-restriction">${localizeRestriction(r.restriction)}</span>` : ""}
            </div>
          </div>
        </li>
      `).join("")}
    </ol>
  `;
  document.getElementById("stationDetailClose").addEventListener("click", () => { panel.hidden = true; panel.innerHTML = ""; });
  panel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
}

function setupSorting() {
  document.querySelectorAll(".timetable th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortState.key === key) {
        sortState.desc = !sortState.desc;
      } else {
        sortState = { key, desc: false };
      }
      renderRouteTable();
    });
  });
}

function renderOperatorLegend() {
  const legend = document.getElementById("operatorLegend");
  legend.innerHTML = Object.entries(OPERATORS).map(([key, op]) => `
    <label class="op-toggle" style="--op-color:${op.color}; --op-text:${op.textOn}">
      <input type="checkbox" value="${key}" ${activeOperatorFilter.has(key) ? "checked" : ""}>
      <span class="op-toggle-dot"></span>
      <span>${op.name}</span>
      <span class="op-count mono" data-count="${key}"></span>
    </label>
  `).join("");

  legend.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", () => {
      const key = input.value;
      if (input.checked) activeOperatorFilter.add(key);
      else activeOperatorFilter.delete(key);
      renderRouteTable();
      renderOperatorCounts();
      populateStartStationSelect();
    });
  });

  renderOperatorCounts();
}

function renderOperatorCounts() {
  Object.keys(OPERATORS).forEach(key => {
    const el = document.querySelector(`[data-count="${key}"]`);
    if (el) el.textContent = allRoutes.filter(r => r.operator === key).length;
  });
}

function renderNetStats() {
  const panel = document.getElementById("netStats");
  if (!panel || allRoutes.length === 0) return;

  const longest = allRoutes.reduce((a, b) => (b.duration > a.duration ? b : a));
  const shortest = allRoutes.reduce((a, b) => (b.duration < a.duration ? b : a));

  const stationCount = new Map();
  allRoutes.forEach(r => {
    stationCount.set(r.from, (stationCount.get(r.from) || 0) + 1);
    stationCount.set(r.to, (stationCount.get(r.to) || 0) + 1);
  });
  const busiest = [...stationCount.entries()].sort((a, b) => b[1] - a[1])[0];

  panel.innerHTML = `
    <div class="net-stat">
      <span class="net-stat-label">${t("net_stats_longest")}</span>
      <span class="net-stat-value">${longest.code} · ${longest.from} &harr; ${longest.to} <span class="mono">(${longest.duration} min)</span></span>
    </div>
    <div class="net-stat">
      <span class="net-stat-label">${t("net_stats_shortest")}</span>
      <span class="net-stat-value">${shortest.code} · ${shortest.from} &harr; ${shortest.to} <span class="mono">(${shortest.duration} min)</span></span>
    </div>
    <div class="net-stat">
      <span class="net-stat-label">${t("net_stats_busiest")}</span>
      <span class="net-stat-value">${busiest[0]} <span class="mono">(${busiest[1]} ${t("net_stats_routes_suffix")})</span></span>
    </div>
  `;
}

function renderStats() {
  const stations = new Set(allRoutes.flatMap(r => [r.from, r.to]));
  document.getElementById("statStations").textContent = stations.size;
  document.getElementById("statRoutes").textContent = allRoutes.length;
  document.getElementById("statTrains").textContent = Object.keys(OPERATORS).length;
  const interchangeCount = [...stationOperators.values()].filter(ops => ops.size > 1).length;
  document.getElementById("statInterchanges").textContent = interchangeCount;
}

function populateStartStationSelect() {
  const select = document.getElementById("startStation");
  const previous = select.value;
  const operatorKey = document.getElementById("chainOperator")?.value || null;
  const pool = operatorKey ? allRoutes.filter(r => r.operator === operatorKey) : allRoutes;

  select.innerHTML = `<option value="">${t("option_random_station")}</option>`;
  const stations = [...new Set(pool.map(r => r.from))].sort((a, b) => a.localeCompare(b));
  stations.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    select.appendChild(opt);
  });
  if (stations.includes(previous)) select.value = previous;
}

function populateChainOperatorSelect() {
  const select = document.getElementById("chainOperator");
  const previous = select.value;
  select.innerHTML = `<option value="">${t("option_random_operator")}</option>`;
  Object.entries(OPERATORS).forEach(([key, op]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = op.name;
    select.appendChild(opt);
  });
  select.value = previous;
  if (!select._i18nBound) {
    select.addEventListener("change", () => {
      applyPlannerTheme(select.value || null);
      populateStartStationSelect();
    });
    select._i18nBound = true;
  }
}

// Mischt eine Hex-Farbe Richtung Weiß, um einen helleren Hover-/Akzentton zu erzeugen.
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function applyPlannerTheme(operatorKey) {
  const section = document.getElementById("planer");
  const form = document.getElementById("plannerForm");

  if (operatorKey && OPERATORS[operatorKey]) {
    const op = OPERATORS[operatorKey];
    const bright = lightenColor(op.color, 0.35);
    section.style.setProperty("--accent", op.color);
    section.style.setProperty("--accent-bright", bright);
    form.style.borderColor = op.color;
    form.style.background = `color-mix(in srgb, ${op.color} 14%, var(--panel))`;
  } else {
    section.style.removeProperty("--accent");
    section.style.removeProperty("--accent-bright");
    form.style.borderColor = "";
    form.style.background = "";
  }
}

// ============================================================
// Domino-Streckenplaner
// ============================================================

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Jede Strecke wird im Spiel als "A <> B" gefahren, also in beide Richtungen.
// Für die Domino-Schicht wird daher jede Strecke als zwei nutzbare Kanten behandelt
// (A->B und B->A) — dieselbe Strecke darf pro Schicht aber nur einmal vorkommen.
function buildEdgeIndex(routes) {
  const edges = [];
  routes.forEach(r => {
    edges.push({ route: r, from: r.from, to: r.to });
    edges.push({ route: r, from: r.to, to: r.from });
  });
  const byFrom = new Map();
  edges.forEach(e => {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  });
  return { edges, byFrom };
}

// Wählt zufällig genau einen Betreiber aus den vorhandenen Strecken aus
// und gibt dessen Streckenteilmenge zurück, damit die ganze Schicht bei ihm bleibt.
function pickSingleOperatorSubset(routes, operatorKey) {
  if (operatorKey && OPERATORS[operatorKey]) {
    return { operator: operatorKey, routes: routes.filter(r => r.operator === operatorKey) };
  }
  const presentOperators = [...new Set(routes.map(r => r.operator))];
  if (presentOperators.length === 0) return { operator: null, routes: [] };
  const chosen = presentOperators[Math.floor(Math.random() * presentOperators.length)];
  return { operator: chosen, routes: routes.filter(r => r.operator === chosen) };
}

function makeStopNode(name, tag, extraClass) {
  const div = document.createElement("div");
  div.className = `chain-stop ${extraClass}`.trim();
  div.innerHTML = `
    <span class="chain-dot" aria-hidden="true"></span>
    <span class="chain-station" data-final="${name}">${name}</span>
    <span class="chain-tag">${tag}</span>
  `;
  return div;
}

function makeLegNode(route) {
  const op = OPERATORS[route.operator];
  const div = document.createElement("div");
  div.className = "chain-leg";
  div.innerHTML = `
    <div class="chain-leg-line" style="--op-color:${op.color}" aria-hidden="true"></div>
    <div class="chain-leg-name">${route.code} · ${route.from} &harr; ${route.to}</div>
    <div class="chain-leg-meta">${route.duration} min</div>
    <div class="chain-leg-op">${operatorBadge(route.operator)}</div>
    ${route.restriction ? `<div class="chain-leg-restriction">${localizeRestriction(route.restriction)}</div>` : ""}
  `;
  return div;
}

// ============================================================
// Domino-Streckenplaner: komplette Schicht vorschlagen, per Haken/Kreuz
// annehmen oder neu vorschlagen lassen — bei Annahme wird die Schicht
// als Liste angezeigt, die man Strecke für Strecke abschließt.
// ============================================================

let plannerState = null;

function renderPlannerMessage(text, allowRetry) {
  const container = document.getElementById("plannerResult");
  container.innerHTML = `<div class="result-warning">${text}</div>`;
  if (allowRetry) {
    const controls = document.createElement("div");
    controls.className = "planner-controls";
    controls.innerHTML = `<button type="button" class="btn btn-ghost" id="retryBtn">${t("retry_btn")}</button>`;
    container.appendChild(controls);
    document.getElementById("retryBtn").addEventListener("click", generateProposal);
  }
}

// Rekursive Domino-Suche mit Backtracking und begrenztem Suchbudget.
function searchChain(chain, desiredCount, byFrom, usedIds, budget) {
  if (chain.length >= desiredCount) return chain;
  if (budget.calls <= 0) return chain;
  budget.calls--;

  const last = chain[chain.length - 1];
  const candidates = shuffle((byFrom.get(last.to) || []).filter(e => !usedIds.has(e.route.id)));

  let best = chain;
  for (const cand of candidates) {
    usedIds.add(cand.route.id);
    const result = searchChain([...chain, cand], desiredCount, byFrom, usedIds, budget);
    usedIds.delete(cand.route.id);
    if (result.length > best.length) best = result;
    if (best.length >= desiredCount) break;
  }
  return best;
}

function buildDominoChain(routes, desiredCount, startStation) {
  const { edges, byFrom } = buildEdgeIndex(routes);
  const budget = { calls: 12000 };

  let starters = startStation ? edges.filter(e => e.from === startStation) : edges;
  if (starters.length === 0) return [];

  starters = shuffle(starters);
  const attempts = Math.min(starters.length, 80);

  let best = [];
  for (let i = 0; i < attempts; i++) {
    const first = starters[i];
    const usedIds = new Set([first.route.id]);
    const result = searchChain([first], desiredCount, byFrom, usedIds, budget);
    if (result.length > best.length) best = result;
    if (best.length >= desiredCount || budget.calls <= 0) break;
  }
  return best.map(e => ({ ...e.route, from: e.from, to: e.to }));
}

function generateProposal() {
  const desiredCount = Math.max(2, Math.min(30, parseInt(document.getElementById("routeCount").value, 10) || 2));
  const startStationInput = document.getElementById("startStation").value || null;
  const operatorChoice = document.getElementById("chainOperator").value || null;

  saveSetting("lastOperator", operatorChoice || "").catch(() => {});
  saveSetting("lastRouteCount", desiredCount).catch(() => {});
  saveSetting("lastStartStation", startStationInput || "").catch(() => {});

  const subset = pickSingleOperatorSubset(allRoutes, operatorChoice);
  applyPlannerTheme(subset.operator);

  if (subset.routes.length === 0) {
    renderPlannerMessage(t("no_routes_for_operator"), false);
    return;
  }

  const validStart = startStationInput && subset.routes.some(r => r.from === startStationInput || r.to === startStationInput)
    ? startStationInput
    : null;

  const chain = buildDominoChain(subset.routes, desiredCount, validStart);

  if (chain.length === 0) {
    const opName = OPERATORS[subset.operator].name;
    renderPlannerMessage(t("no_chain_found", { op: opName }), true);
    return;
  }

  plannerState = { operator: subset.operator, desiredCount, chain };
  renderProposal();
}

function renderProposal() {
  const container = document.getElementById("plannerResult");
  container.innerHTML = "";
  const { chain, desiredCount, operator } = plannerState;
  const totalDuration = chain.reduce((sum, r) => sum + r.duration, 0);

  const summary = document.createElement("div");
  summary.className = "result-summary";
  summary.innerHTML = `
    <span>${operatorBadge(operator)}</span>
    <span>${t("proposal_count", { count: `<strong>${chain.length}</strong>`, desired: desiredCount })}</span>
    <span>${t("proposal_duration", { min: `<strong>${totalDuration}</strong>` })}</span>
    <span><strong>${chain[0].from}</strong> → <strong>${chain[chain.length - 1].to}</strong></span>
  `;
  container.appendChild(summary);

  if (chain.length < desiredCount) {
    const warn = document.createElement("div");
    warn.className = "result-warning";
    warn.textContent = t("proposal_shortfall", { count: chain.length });
    container.appendChild(warn);
  }

  const chainEl = document.createElement("div");
  chainEl.className = "chain";
  chain.forEach((route, index) => {
    if (index === 0) chainEl.appendChild(makeStopNode(route.from, t("start_tag"), "origin"));
    chainEl.appendChild(makeLegNode(route));
    const isLast = index === chain.length - 1;
    chainEl.appendChild(makeStopNode(route.to, isLast ? t("destination_tag") : t("transfer_tag"), isLast ? "terminus" : ""));
  });
  container.appendChild(chainEl);
  chainEl.querySelectorAll(".chain-station").forEach(el => flapText(el, el.dataset.final, { cycles: 4, stepMs: 35 }));

  const controls = document.createElement("div");
  controls.className = "planner-controls";
  controls.innerHTML = `
    <button type="button" class="btn btn-accept" id="acceptChainBtn">${t("accept_chain")}</button>
    <button type="button" class="btn btn-reject" id="rejectChainBtn">${t("reject_chain")}</button>
  `;
  container.appendChild(controls);
  document.getElementById("acceptChainBtn").addEventListener("click", () => startShift(plannerState.chain, plannerState.operator));
  document.getElementById("rejectChainBtn").addEventListener("click", generateProposal);

  container.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
}

function startShift(chain, operatorKey) {
  renderShift(chain, operatorKey, 0);
}

function renderShift(chain, operatorKey, currentIndex) {
  const container = document.getElementById("plannerResult");
  container.innerHTML = "";
  const totalDuration = chain.reduce((sum, r) => sum + r.duration, 0);
  const isOver = currentIndex >= chain.length;

  const summary = document.createElement("div");
  summary.className = "result-summary";
  summary.innerHTML = `
    <span>${operatorBadge(operatorKey)}</span>
    <span>${t("shift_progress", { done: `<strong>${Math.min(currentIndex, chain.length)}</strong>`, total: chain.length })}</span>
    <span>${t("shift_total_duration", { min: `<strong>${totalDuration}</strong>` })}</span>
  `;
  container.appendChild(summary);

  const list = document.createElement("ol");
  list.className = "shift-list";
  chain.forEach((route, index) => {
    const state = index < currentIndex ? "done" : (index === currentIndex ? "current" : "upcoming");
    const li = document.createElement("li");
    li.className = `shift-item ${state}`;
    li.innerHTML = `
      <span class="shift-index mono">${state === "done" ? "&#10003;" : index + 1}</span>
      <div class="shift-info">
        <div class="shift-route">${route.from} <span class="arrow">&rarr;</span> ${route.to}</div>
        <div class="shift-meta">
          ${operatorBadge(route.operator)}
          <span class="mono">${route.code}</span>
          <span class="mono">${route.duration} min</span>
          ${route.restriction ? `<span class="shift-restriction">${localizeRestriction(route.restriction)}</span>` : ""}
        </div>
      </div>
    `;
    list.appendChild(li);
  });
  container.appendChild(list);

  if (currentIndex > 0 && currentIndex <= chain.length) {
    const currentStationEl = list.querySelectorAll(".shift-item")[Math.min(currentIndex, chain.length - 1)];
    if (currentStationEl) currentStationEl.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  const controls = document.createElement("div");
  controls.className = "planner-controls";

  if (!isOver) {
    controls.innerHTML = `<button type="button" class="btn btn-primary" id="nextLegBtn">${t("next_leg_btn")}</button>`;
    container.appendChild(controls);
    document.getElementById("nextLegBtn").addEventListener("click", () => renderShift(chain, operatorKey, currentIndex + 1));
  } else {
    const endBadge = document.createElement("div");
    endBadge.className = "shift-end-badge";
    endBadge.innerHTML = `<strong>${t("shift_end_label")}</strong> — ${t("shift_end_rest", { count: chain.length, min: totalDuration })}`;
    container.appendChild(endBadge);

    controls.innerHTML = `
      <button type="button" class="btn btn-ghost" id="copyShiftBtn">${t("copy_shift_btn")}</button>
      <button type="button" class="btn btn-ghost" id="restartBtn">${t("new_shift_btn")}</button>
    `;
    container.appendChild(controls);
    document.getElementById("restartBtn").addEventListener("click", generateProposal);
    document.getElementById("copyShiftBtn").addEventListener("click", (e) => copyShiftAsText(chain, operatorKey, e.target));

    logCompletedShift(chain, operatorKey, totalDuration);
  }

  if (currentIndex === 0) {
    container.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }
}

function copyShiftAsText(chain, operatorKey, buttonEl) {
  const totalDuration = chain.reduce((s, r) => s + r.duration, 0);
  const lines = [
    t("copy_shift_header", { op: OPERATORS[operatorKey].name }),
    t("copy_shift_summary", { count: chain.length, min: totalDuration }),
    ""
  ];
  chain.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.code} · ${r.from} → ${r.to} (${r.duration} min)`);
  });
  const text = lines.join("\n");

  const done = () => {
    if (!buttonEl) return;
    const original = buttonEl.textContent;
    buttonEl.textContent = t("copy_shift_done");
    setTimeout(() => { buttonEl.textContent = original; }, 1800);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {});
  }
}

async function logCompletedShift(chain, operatorKey, totalDuration) {
  try {
    await addShiftLogEntry({
      timestamp: Date.now(),
      operator: operatorKey,
      routeCodes: chain.map(r => r.code),
      count: chain.length,
      totalDuration
    });
    await renderShiftHistory();
  } catch (err) {
    console.error("Schicht-Verlauf konnte nicht gespeichert werden:", err);
  }
}

async function renderShiftHistory() {
  const list = document.getElementById("shiftHistoryList");
  const totalEl = document.getElementById("shiftHistoryTotal");
  if (!list || !dbHandle) return;

  let entries = [];
  try {
    entries = await getShiftLog();
  } catch (err) {
    console.error("Schicht-Verlauf konnte nicht geladen werden:", err);
    return;
  }

  if (entries.length === 0) {
    totalEl.textContent = "";
    list.innerHTML = `<p class="shift-history-empty">${t("shift_history_empty")}</p>`;
    return;
  }

  const totalDuration = entries.reduce((s, e) => s + e.totalDuration, 0);
  const totalRoutes = entries.reduce((s, e) => s + e.count, 0);
  totalEl.innerHTML = t("shift_history_total", {
    shifts: `<strong>${entries.length}</strong>`,
    routes: `<strong>${totalRoutes}</strong>`,
    min: `<strong>${totalDuration}</strong>`
  });

  const locale = t("locale");
  list.innerHTML = entries.slice(0, 15).map(e => {
    const date = new Date(e.timestamp);
    const dateStr = date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" }) + " " +
      date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="shift-history-item">
        <span class="shift-history-date mono">${dateStr}</span>
        <div class="shift-history-meta">
          ${operatorBadge(e.operator)}
          <span class="mono">${e.count} ${t("shift_history_routes_suffix")}</span>
          <span class="mono">${e.totalDuration} min</span>
        </div>
      </div>
    `;
  }).join("");
}

function setupShiftHistoryControls() {
  const clearBtn = document.getElementById("clearHistoryBtn");
  if (!clearBtn) return;
  clearBtn.addEventListener("click", async () => {
    await clearShiftLogStore();
    await renderShiftHistory();
  });
}

function setupPlannerForm() {
  const form = document.getElementById("plannerForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    generateProposal();
  });
}

function setupSurpriseButton() {
  const btn = document.getElementById("surpriseBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const operatorSelect = document.getElementById("chainOperator");
    const countInput = document.getElementById("routeCount");
    const startSelect = document.getElementById("startStation");

    const opKeys = Object.keys(OPERATORS);
    operatorSelect.value = opKeys[Math.floor(Math.random() * opKeys.length)];
    applyPlannerTheme(operatorSelect.value);
    populateStartStationSelect();

    countInput.value = String(Math.floor(Math.random() * 7) + 4); // 4–10 Strecken
    startSelect.value = "";

    generateProposal();
  });
}

// Enter bestätigt die aktuell sichtbare "Nächste Strecke", Escape schließt die Bahnhofs-Detailansicht.
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    const isTyping = active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA");

    if (e.key === "Enter" && !isTyping) {
      const nextBtn = document.getElementById("nextLegBtn");
      if (nextBtn) { e.preventDefault(); nextBtn.click(); }
    }
    if (e.key === "Escape") {
      const panel = document.getElementById("stationDetail");
      if (panel && !panel.hidden) { panel.hidden = true; panel.innerHTML = ""; }
    }
  });
}

// ============================================================
// Init
// ============================================================

async function init() {
  setCssOperatorVars();
  setupLanguageSwitch();

  try {
    const db = await openDB();
    dbHandle = db;
    allRoutes = await syncRoutes(db);
  } catch (err) {
    console.error("IndexedDB-Fehler:", err);
    applyStaticTranslations();
    const tbody = document.getElementById("routeTableBody");
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">${t("db_error")}</td></tr>`;
    return;
  }

  // Gespeicherte Sprache laden, bevor irgendetwas gerendert wird.
  let settings = {};
  try {
    settings = await loadSettings();
    if (settings.language === "en" || settings.language === "de") currentLang = settings.language;
  } catch (err) { /* Default bleibt Deutsch */ }

  applyStaticTranslations();
  flapText(document.getElementById("heroTitle"), t("hero_title"), { cycles: 5, stepMs: 40 });

  computeStationOperators();
  renderStats();
  renderNetStats();
  renderOperatorLegend();
  renderRouteTable();
  setupSorting();
  setupSearch();
  setupCsvExport();
  populateChainOperatorSelect();
  populateStartStationSelect();
  setupPlannerForm();
  setupSurpriseButton();
  setupKeyboardShortcuts();
  setupShiftHistoryControls();

  if (settings.lastOperator) {
    document.getElementById("chainOperator").value = settings.lastOperator;
    applyPlannerTheme(settings.lastOperator);
    populateStartStationSelect();
  }
  if (settings.lastRouteCount) {
    document.getElementById("routeCount").value = settings.lastRouteCount;
  }
  if (settings.lastStartStation) {
    const startSelect = document.getElementById("startStation");
    if ([...startSelect.options].some(o => o.value === settings.lastStartStation)) {
      startSelect.value = settings.lastStartStation;
    }
  }

  renderShiftHistory();
}

document.addEventListener("DOMContentLoaded", init);
