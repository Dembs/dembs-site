export const APPS = Object.freeze([
  {
    id: "streetpark", name: "StreetPark", tag: "street workout",
    description: "La carte des spots de street workout, notés par ceux qui s’y entraînent.",
    icon: "assets/icons/streetpark.png", pixel: false,
    background: "#B6B3FF", foreground: "#17142B",
    badgeBackground: "#17142B", badgeForeground: "#EAFF54",
    status: "published", statusLabel: "Disponible",
    appStore: "https://apps.apple.com/fr/app/streetpark-street-workout/id6760240703",
    playStore: "https://play.google.com/store/apps/details?id=com.streetpark.app"
  },
  {
    id: "civi", name: "Civi", tag: "examen civique 2026",
    description: "L’examen civique révisé sans panique, un quiz par jour jusqu’au jour J.",
    icon: "assets/icons/civi.png?v=20260901", pixel: false,
    background: "#1B2A4A", foreground: "#F2F0EA",
    badgeBackground: "#C5A55A", badgeForeground: "#1B2A4A",
    status: "published", statusLabel: "Disponible",
    appStore: "https://apps.apple.com/fr/app/civi-examen-civique-2026/id6772965126",
    playStore: "https://play.google.com/store/apps/details?id=fr.civiapp.app"
  },
  {
    id: "last-rep", name: "Last Rep", tag: "jeu d’arcade pixel",
    description: "Annonce ton contrat de tractions, puis sécurise ou risque tout.",
    icon: "assets/icons/last-rep.png", pixel: true,
    background: "#0B0F14", foreground: "#F2F0EA",
    badgeBackground: "#F5B82E", badgeForeground: "#0B0F14",
    status: "beta", statusLabel: "Bêta, bientôt sur les stores",
    appStore: null, playStore: null
  },
  {
    id: "bascule", name: "Bascule", tag: "jeu narratif",
    description: "Vis ta première année à ton compte en France, une décision au swipe.",
    icon: "assets/icons/bascule.png", pixel: true,
    background: "#1A1524", foreground: "#F2F0EA",
    badgeBackground: "#E8A24B", badgeForeground: "#1A1524",
    status: "development", statusLabel: "En développement",
    appStore: null, playStore: null
  }
].map(Object.freeze));

export const CAMPAIGNS = Object.freeze({
  "guide-stores": Object.freeze({
    eyebrow: "Vu dans ma dernière vidéo",
    title: "Publier sans se faire recaler",
    description: "Les erreurs qui coûtent des semaines sur l’App Store et Google Play.",
    cta: "Lire le guide gratuit",
    url: "https://ressources.dembs.fr/guide",
    affiliate: false
  })
});

function isCompleteCampaign(value) {
  if (!value || typeof value !== "object") return false;
  const textFields = ["eyebrow", "title", "description", "cta"];
  if (!textFields.every((key) => typeof value[key] === "string" && value[key].trim())) return false;
  try {
    return new URL(value.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveCampaign(focus) {
  if (typeof focus !== "string" || !Object.hasOwn(CAMPAIGNS, focus)) return null;
  const campaign = CAMPAIGNS[focus];
  return isCompleteCampaign(campaign) ? campaign : null;
}
