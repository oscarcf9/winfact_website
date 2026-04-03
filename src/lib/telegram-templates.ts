// ============================================================
// Template selection — picks a random template, avoids repeats
// ============================================================

const recentTemplates: Map<string, number[]> = new Map();

export function getRandomTemplate(
  category: "free_pick" | "vip_teaser" | "vip_update" | "general_update",
  language: "en" | "es"
): string {
  const key = `${category}_${language}`;
  const pool = TEMPLATES[category][language];

  const recent = recentTemplates.get(key) || [];

  let index: number;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (recent.includes(index) && pool.length > 5);

  recent.push(index);
  if (recent.length > 5) recent.shift();
  recentTemplates.set(key, recent);

  return pool[index];
}

// ============================================================
// Variables:
//   {sport}        — "NBA", "MLB", etc.
//   {matchup}      — "Lakers vs Celtics" (FREE PICKS ONLY)
//   {pickText}     — "Lakers -3.5" (FREE PICKS ONLY)
//   {odds}         — "-110" or "+150" (FREE PICKS ONLY)
//   {dashboardUrl} — link to dashboard
//   {pricingUrl}   — link to pricing
// ============================================================

const TEMPLATES = {

  // ============================================================
  // CATEGORY 1: FREE PICK — Full details posted to group
  // ============================================================
  free_pick: {
    en: [
      `Free play for the crew!\n\n{sport}: {matchup}\n{pickText}\n\nLet's eat!`,
      `Free pick alert!\n\n{sport} — {matchup}\n{pickText}\n\nRide with us`,
      `Here's one on the house\n\n{sport}: {matchup}\n{pickText}\n\nGood luck fam!`,
      `Free play incoming!\n\n{matchup} — {sport}\n{pickText}\n\nLet's get this bread`,
      `Free pick just dropped\n\n{sport}: {matchup}\n{pickText}\n\nWho's riding?`,
      `One for the group!\n\n{matchup}\n{pickText} ({sport})\n\nLock it in`,
      `Free pick of the day\n\n{sport} — {matchup}\n{pickText}\n\nLet's cash`,
      `No VIP needed for this one\n\n{matchup}\n{pickText} — {sport}\n\nBOL everyone!`,
      `Freebie time!\n\n{sport}: {matchup}\n{pickText}\n\nTail it or fade it — your call`,
      `Community play\n\n{matchup} ({sport})\n{pickText}\n\nLet's ride together`,
      `Free pick — don't sleep on this\n\n{sport}: {matchup}\n{pickText}\n\nShoot your shot`,
      `Here we go! Free play loaded\n\n{matchup}\n{pickText} — {sport}\n\nLet's make it count`,
      `Your free pick for today\n\n{sport} | {matchup}\n{pickText}\n\nGood vibes only`,
      `Giving this one away!\n\n{matchup}\n{pickText} ({sport})\n\nLet's see what happens`,
      `Free pick loaded up\n\n{sport}: {matchup}\n{pickText}\n\nSmash that bet slip`,
      `We like this one — sharing with the group\n\n{matchup} — {sport}\n{pickText}\n\nBOL!`,
      `One for the people!\n\n{sport}: {matchup}\n{pickText}\n\nLet's eat tonight`,
      `Free play time\n\n{matchup}\n{pickText} ({sport})\n\nWho's on it?`,
      `Data says this one's got value — free pick\n\n{sport}: {matchup}\n{pickText}\n\nRide with the model`,
      `Fresh free pick just came through\n\n{matchup} — {sport}\n{pickText}\n\nLet's go!`,
    ],

    es: [
      `Pick gratis para la familia!\n\n{sport}: {matchup}\n{pickText}\n\nA romperla!`,
      `Pronostico gratis del dia!\n\n{sport} — {matchup}\n{pickText}\n\nBuena suerte!`,
      `Aqui tienen uno gratis\n\n{sport}: {matchup}\n{pickText}\n\nVamos con todo!`,
      `Pick gratuito listo\n\n{matchup} — {sport}\n{pickText}\n\nA cobrar!`,
      `Uno para el grupo!\n\n{matchup}\n{pickText} ({sport})\n\nSuerte fam!`,
      `Free play para ustedes\n\n{sport}: {matchup}\n{pickText}\n\nDale que dale!`,
      `Pronostico gratis — no se lo pierdan\n\n{matchup}\n{pickText} — {sport}\n\nExito!`,
      `Aca va el pick gratis!\n\n{sport}: {matchup}\n{pickText}\n\nQuien se monta?`,
      `Regalito del dia\n\n{matchup} ({sport})\n{pickText}\n\nVamos a ganar!`,
      `Pick gratis cargado\n\n{sport} — {matchup}\n{pickText}\n\nMetanle!`,
      `Esto es para todos — pick gratis!\n\n{matchup}\n{pickText} ({sport})\n\nBuena suerte familia!`,
      `El modelo dice que hay valor aqui — gratis\n\n{sport}: {matchup}\n{pickText}\n\nConfien en los datos!`,
      `Nuevo pick gratuito acaba de salir\n\n{matchup} — {sport}\n{pickText}\n\nArriba!`,
      `Sin VIP necesario para este\n\n{sport}: {matchup}\n{pickText}\n\nA darle!`,
      `Hoy les traemos un pick gratis\n\n{matchup}\n{pickText} — {sport}\n\nSuerte a todos!`,
      `Pick gratis recien salido!\n\n{sport}: {matchup}\n{pickText}\n\nVamos familia!`,
      `Este va por la casa\n\n{matchup} ({sport})\n{pickText}\n\nBOL!`,
      `Free pick listo — quien se apunta?\n\n{sport}: {matchup}\n{pickText}\n\nA ganar!`,
      `Uno gratis para arrancar!\n\n{matchup}\n{pickText} — {sport}\n\nCon fe!`,
      `Pronostico del dia — cortesia de WinFact\n\n{sport} — {matchup}\n{pickText}\n\nExito!`,
    ],
  },

  // ============================================================
  // CATEGORY 2: VIP TEASER — No pick details, create curiosity
  // ============================================================
  vip_teaser: {
    en: [
      `New VIP pick just went live — {sport} action.\n\nVIP members, your dashboard is updated.\n{dashboardUrl}\n\nNot a member yet?\n{pricingUrl}`,
      `VIP play locked in\n\n{sport} edge detected by our model. Details on your dashboard.\n{dashboardUrl}\n\nWant access? {pricingUrl}`,
      `Our analysts just pulled the trigger on a {sport} play\n\nVIP members — check your dashboard.\n{dashboardUrl}\n\nUpgrade: {pricingUrl}`,
      `New VIP pick is up\n\nWe found value in today's {sport} slate. VIP members, you know where to look.\n{dashboardUrl}`,
      `{sport} VIP pick just dropped\n\nThe edge is there. VIP members, go check it.\n{dashboardUrl}\n\nJoin VIP: {pricingUrl}`,
      `VIP alert — {sport}\n\nAnother one from the model. Dashboard updated.\n{dashboardUrl}`,
      `VIP play loaded — {sport}\n\nMembers, your picks are ready.\n{dashboardUrl}\n\nNot VIP yet? You're missing out: {pricingUrl}`,
      `We just locked in a {sport} play for VIP\n\nDashboard updated with full analysis.\n{dashboardUrl}`,
      `New VIP pick available — {sport}\n\nModel found an edge. Full breakdown on your dashboard.\n{dashboardUrl}\n\nGet access: {pricingUrl}`,
      `{sport} VIP pick is live.\n\nAnalysis + odds + model edge — all on your dashboard.\n{dashboardUrl}`,
      `VIP members, we just dropped a {sport} pick\n\nCheck the dashboard for details.\n{dashboardUrl}`,
      `Another VIP play in the books — {sport}\n\nFull analysis waiting on your dashboard.\n{dashboardUrl}\n\nWant in? {pricingUrl}`,
      `The model found something in {sport} today\n\nVIP pick live now.\n{dashboardUrl}`,
      `{sport} edge locked in for VIP\n\nGo get your pick.\n{dashboardUrl}\n\nUpgrade for full access: {pricingUrl}`,
      `Fresh VIP play — {sport}\n\nDashboard updated. Members, let's ride.\n{dashboardUrl}`,
      `VIP pick alert — {sport}\n\nWe like this one. Full details on the dashboard.\n{dashboardUrl}\n\nJoin: {pricingUrl}`,
      `{sport} play just went live for VIP members\n\nDon't miss it.\n{dashboardUrl}`,
      `New one for the VIP crew — {sport}\n\nAnalysis is up.\n{dashboardUrl}`,
      `VIP dashboard just got updated with a {sport} pick\n\nGo check it out.\n{dashboardUrl}\n\nNot a member? {pricingUrl}`,
      `Our {sport} model is cooking today\n\nNew VIP pick live now.\n{dashboardUrl}`,
    ],

    es: [
      `Nuevo pick VIP — {sport}\n\nMiembros VIP, su dashboard esta actualizado.\n{dashboardUrl}\n\nAun no eres VIP?\n{pricingUrl}`,
      `Pick VIP cargado — {sport}\n\nNuestro modelo detecto valor. Detalles en el dashboard.\n{dashboardUrl}\n\nQuiero acceso: {pricingUrl}`,
      `Nuestros analistas acaban de fijar un pick de {sport}\n\nMiembros VIP — revisen su dashboard.\n{dashboardUrl}`,
      `Nuevo pick VIP disponible\n\nHay valor en la pizarra de {sport} de hoy. VIP, ya saben donde buscar.\n{dashboardUrl}`,
      `Pick VIP de {sport} acaba de salir\n\nEl edge esta ahi. VIP, a revisar.\n{dashboardUrl}\n\nUnete a VIP: {pricingUrl}`,
      `Alerta VIP — {sport}\n\nOtro pick del modelo. Dashboard actualizado.\n{dashboardUrl}`,
      `Pick VIP listo — {sport}\n\nMiembros, sus picks estan listos.\n{dashboardUrl}\n\nNo eres VIP? Te lo estas perdiendo: {pricingUrl}`,
      `Acabamos de fijar un pick de {sport} para VIP\n\nDashboard actualizado con analisis completo.\n{dashboardUrl}`,
      `Nuevo pick VIP — {sport}\n\nEl modelo encontro valor. Analisis completo en tu dashboard.\n{dashboardUrl}\n\nObten acceso: {pricingUrl}`,
      `Pick VIP de {sport} en vivo.\n\nAnalisis + odds + edge del modelo — todo en tu dashboard.\n{dashboardUrl}`,
      `Miembros VIP, nuevo pick de {sport}\n\nRevisen el dashboard.\n{dashboardUrl}`,
      `Otro pick VIP listo — {sport}\n\nAnalisis esperandote en el dashboard.\n{dashboardUrl}\n\nQuieres entrar? {pricingUrl}`,
      `El modelo encontro algo en {sport} hoy\n\nPick VIP en vivo.\n{dashboardUrl}`,
      `Edge de {sport} asegurado para VIP\n\nVe por tu pick.\n{dashboardUrl}\n\nUnete para acceso completo: {pricingUrl}`,
      `Pick VIP fresco — {sport}\n\nDashboard actualizado. Miembros, vamos.\n{dashboardUrl}`,
      `Alerta de pick VIP — {sport}\n\nNos gusta este. Detalles en el dashboard.\n{dashboardUrl}\n\nUnete: {pricingUrl}`,
      `Pick de {sport} en vivo para miembros VIP\n\nNo se lo pierdan.\n{dashboardUrl}`,
      `Uno nuevo para el crew VIP — {sport}\n\nAnalisis listo.\n{dashboardUrl}`,
      `El dashboard VIP se actualizo con un pick de {sport}\n\nRevisalo.\n{dashboardUrl}\n\nNo eres miembro? {pricingUrl}`,
      `Nuestro modelo de {sport} esta on fire hoy\n\nNuevo pick VIP en vivo.\n{dashboardUrl}`,
    ],
  },

  // ============================================================
  // CATEGORY 3: VIP UPDATE — Batch / general "picks are up"
  // ============================================================
  vip_update: {
    en: [
      `VIP update! Fresh picks just dropped`,
      `New VIP picks are live — go check your dashboard`,
      `Dashboard updated with today's VIP plays`,
      `VIP members, new analysis just went up`,
      `Today's VIP slate is ready — dashboard updated`,
      `Just loaded new picks for VIP — let's ride`,
      `VIP picks for today are in`,
      `New VIP content just dropped — check the dashboard`,
      `VIP dashboard refreshed with today's edges`,
      `Fresh batch of VIP picks just went live`,
      `Picks are up for VIP — multiple plays today`,
      `VIP update — your picks for today are ready`,
      `We've been grinding the data — new VIP picks are up`,
      `Multiple VIP plays just went live`,
      `VIP crew, today's picks are loaded`,
      `Dashboard updated — VIP plays ready to roll`,
      `New edges found — VIP dashboard updated`,
      `The model has spoken — VIP picks are live`,
      `Today's VIP analysis is up — go get it`,
      `VIP picks loaded and locked — check the dashboard`,
    ],

    es: [
      `Actualizacion VIP! Picks frescos acaban de salir`,
      `Nuevos picks VIP en vivo — revisen su dashboard`,
      `Dashboard actualizado con los picks VIP de hoy`,
      `Miembros VIP, nuevo analisis disponible`,
      `La pizarra VIP de hoy esta lista — dashboard actualizado`,
      `Acabamos de cargar nuevos picks VIP — vamos`,
      `Picks VIP del dia listos`,
      `Nuevo contenido VIP acaba de salir — revisen el dashboard`,
      `Dashboard VIP actualizado con los edges de hoy`,
      `Nueva tanda de picks VIP en vivo`,
      `Picks disponibles para VIP — varios picks hoy`,
      `Actualizacion VIP — tus picks de hoy estan listos`,
      `Estuvimos analizando los datos — nuevos picks VIP arriba`,
      `Multiples picks VIP acaban de salir`,
      `Crew VIP, los picks de hoy estan cargados`,
      `Dashboard actualizado — picks VIP listos`,
      `Nuevos edges encontrados — dashboard VIP actualizado`,
      `El modelo ha hablado — picks VIP en vivo`,
      `El analisis VIP de hoy esta arriba — a buscarlo`,
      `Picks VIP cargados y listos — revisen el dashboard`,
    ],
  },

  // ============================================================
  // CATEGORY 4: GENERAL UPDATE — Free content / daily update
  // ============================================================
  general_update: {
    en: [
      `Today's picks are up!`,
      `Fresh picks just loaded — check them out`,
      `We just updated today's slate`,
      `New picks available now`,
      `Picks for today are in — let's have a day`,
      `Dashboard updated with today's plays`,
      `Just dropped today's analysis`,
      `New picks are live — good luck everyone!`,
      `Today's board is set — picks are up`,
      `Picks loaded for today — let's go!`,
      `The daily slate is ready`,
      `Just posted today's picks — BOL!`,
      `Updated picks for today's games`,
      `New content just went live — check it out`,
      `Today's picks are ready to roll`,
    ],

    es: [
      `Los picks de hoy estan listos!`,
      `Picks frescos cargados — revisenlos`,
      `Acabamos de actualizar la pizarra de hoy`,
      `Nuevos picks disponibles ahora`,
      `Picks del dia listos — vamos con todo!`,
      `Dashboard actualizado con los picks de hoy`,
      `Acabamos de soltar el analisis del dia`,
      `Nuevos picks en vivo — buena suerte a todos!`,
      `La pizarra de hoy esta lista — picks arriba`,
      `Picks cargados para hoy — dale!`,
      `La pizarra del dia esta lista`,
      `Picks de hoy publicados — BOL!`,
      `Picks actualizados para los juegos de hoy`,
      `Nuevo contenido en vivo — revisenlo`,
      `Los picks de hoy listos para salir`,
    ],
  },

} as const;

export { TEMPLATES };

// ============================================================
// MESSAGE FORMATTERS
// ============================================================

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Format a free pick message for Telegram.
 * Returns bilingual message (EN + ES with different random templates).
 */
export function formatFreePickMessage(pick: {
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
}): string {
  const en = getRandomTemplate("free_pick", "en");
  const es = getRandomTemplate("free_pick", "es");

  const fill = (tpl: string) =>
    tpl
      .replace(/\{sport\}/g, pick.sport)
      .replace(/\{matchup\}/g, pick.matchup)
      .replace(/\{pickText\}/g, pick.pickText)
      .replace(/\{odds\}/g, pick.odds ? formatOdds(pick.odds) : "")
      .replace(/\{units\}/g, pick.units?.toString() || "")
      .replace(/\{confidence\}/g, pick.confidence || "");

  return `${fill(en)}\n\n---\n\n${fill(es)}`;
}

/**
 * Format a VIP teaser message for Telegram.
 * NO pick details — just sport and links. Bilingual.
 */
export function formatVipTeaserMessage(pick: {
  sport: string;
}): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";
  const en = getRandomTemplate("vip_teaser", "en");
  const es = getRandomTemplate("vip_teaser", "es");

  const fill = (tpl: string) =>
    tpl
      .replace(/\{sport\}/g, pick.sport)
      .replace(/\{dashboardUrl\}/g, `${siteUrl}/dashboard`)
      .replace(/\{pricingUrl\}/g, `${siteUrl}/pricing`);

  return `${fill(en)}\n\n---\n\n${fill(es)}`;
}

/**
 * Format a VIP batch update message. Bilingual.
 */
export function formatVipUpdateMessage(): string {
  const en = getRandomTemplate("vip_update", "en");
  const es = getRandomTemplate("vip_update", "es");
  return `${en}\n\n---\n\n${es}`;
}

/**
 * Format a general update message. Bilingual.
 */
export function formatGeneralUpdateMessage(): string {
  const en = getRandomTemplate("general_update", "en");
  const es = getRandomTemplate("general_update", "es");
  return `${en}\n\n---\n\n${es}`;
}
