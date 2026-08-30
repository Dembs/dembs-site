import { APPS, resolveCampaign } from "./content.js";

export function initMenu(root = document) {
  const button = root.querySelector("[data-menu-toggle]");
  const panel = root.querySelector("#site-menu");
  const scrim = root.querySelector("[data-menu-close]");
  if (!button || !panel || !scrim) return;

  const close = () => {
    panel.hidden = true;
    scrim.hidden = true;
    button.setAttribute("aria-expanded", "false");
    root.body.classList.remove("menu-open");
    button.focus();
  };
  const open = () => {
    panel.hidden = false;
    scrim.hidden = false;
    button.setAttribute("aria-expanded", "true");
    root.body.classList.add("menu-open");
    panel.querySelector("a")?.focus();
  };

  button.addEventListener("click", () => panel.hidden ? open() : close());
  scrim.addEventListener("click", close);
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
    if (event.key !== "Tab" || panel.hidden) return;
    const links = [...panel.querySelectorAll("a[href]")];
    const first = links[0];
    const last = links.at(-1);
    if (event.shiftKey && root.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && root.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

export function renderFocusCampaign(root = document, search = location.search) {
  const container = root.querySelector("#campaign");
  if (!container) return;
  const campaign = resolveCampaign(new URLSearchParams(search).get("focus"));
  if (!campaign) {
    container.hidden = true;
    return;
  }
  container.querySelector("[data-campaign-eyebrow]").textContent = campaign.eyebrow;
  container.querySelector("[data-campaign-title]").textContent = campaign.title;
  container.querySelector("[data-campaign-description]").textContent = campaign.description;
  const link = container.querySelector("[data-campaign-link]");
  link.textContent = campaign.cta;
  link.href = campaign.url;
  container.querySelector("[data-campaign-affiliate]").hidden = !campaign.affiliate;
  container.hidden = false;
}

if (typeof document !== "undefined") {
  initMenu();
  renderFocusCampaign();
}
