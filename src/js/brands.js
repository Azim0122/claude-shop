// «Бренды»: кинетический заголовок, индекс брендов с превью за курсором,
// фильтр по городам, витрина по брендам и кольцо кроссовок.
import { gsap, ScrollTrigger, Flip, $, $$, reduced, finePointer, mm, scramble, onIntro, setImg } from "./core.js";
import { cardHTML, hydrateCards } from "./shop.js";
import { BRANDS, PRODUCTS, CITIES, LOOK_SNEAKERS } from "./data.js";
import { createRing } from "./ring.js";

const LUX = ["Chanel", "Louis Vuitton"];
const items = (b) => PRODUCTS.filter((p) => p.brand === b || p.name.includes(b));

function initHero() {
  const title = $(".bhero__title");
  title.innerHTML = [...title.textContent.trim()].map((ch) => `<span class="ch"><span>${ch}</span></span>`).join("");
  onIntro(() => {
    scramble($(".bhero .kicker"));
    if (reduced()) return;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .fromTo(".bhero__title .ch > span", { yPercent: 115, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.05 })
      .to(".bhero .reveal-up", { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.3)
      .from(".nav > *", { y: -24, opacity: 0, duration: 1, stagger: 0.08 }, 0.4)
      .from(".bhero__orb", { scale: 0, duration: 1.6 }, 0.2);
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // Буквы расходятся по высоте при прокрутке
    $$(".bhero__title .ch").forEach((ch, i) =>
      gsap.to(ch, { yPercent: (i % 2 ? -1 : 1) * (20 + i * 6), ease: "none", scrollTrigger: { trigger: ".bhero", start: "top top", end: "bottom top", scrub: true } }),
    );
    gsap.to(".bhero__orb", { yPercent: 60, scale: 1.4, ease: "none", scrollTrigger: { trigger: ".bhero", start: "top top", end: "bottom top", scrub: true } });
  });
}

/* ---------- Индекс брендов ---------- */
function initIndex() {
  const list = $("#brandList");
  list.innerHTML = BRANDS.map((b, i) => {
    const n = items(b.name).length;
    const href = n ? `index.html?brand=${encodeURIComponent(b.name)}#catalog` : "#";
    const attrs = n ? `href="${href}" data-cursor="Каталог"` : `href="#" data-tg-ask="${b.name}" data-cursor="Запрос"`;
    return `<li class="brow" data-city="${b.from}" data-i="${i}">
      <a class="brow__link" ${attrs}>
        <span class="brow__n mono">${String(i + 1).padStart(2, "0")}</span>
        <span class="brow__thumb">${b.img ? `<img alt="" loading="lazy">` : `<b>${b.name[0]}</b>`}</span>
        <span class="brow__name">${b.name}</span>
        <span class="brow__what">${b.what}</span>
        <span class="brow__city mono">${b.from}</span>
        <span class="brow__count mono">${n ? n + " шт." : "запрос"}</span>
      </a></li>`;
  }).join("");
  $$(".brow").forEach((row) => {
    const b = BRANDS[+row.dataset.i], img = $(".brow__thumb img", row);
    img && setImg(img, b.img, 300);
  });

  // Фильтр по городам
  const cities = ["Все", ...CITIES.map((c) => c.name)];
  $("#cityFilter").innerHTML = cities
    .map((c, i) => `<button class="chip ${i ? "" : "is-on"}" data-city="${i ? c : "all"}" role="tab" aria-selected="${!i}">${c}<sup>${i ? BRANDS.filter((b) => b.from === c).length : BRANDS.length}</sup></button>`)
    .join("");
  $("#cityFilter").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$(".chip", $("#cityFilter")).forEach((c) => {
      c.classList.toggle("is-on", c === chip);
      c.setAttribute("aria-selected", String(c === chip));
    });
    const rows = $$(".brow");
    const st = Flip.getState(rows);
    rows.forEach((r) => r.classList.toggle("is-hidden", chip.dataset.city !== "all" && r.dataset.city !== chip.dataset.city));
    Flip.from(st, {
      duration: reduced() ? 0 : 0.7,
      ease: "expo.inOut",
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out", stagger: 0.04 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, x: 40, duration: 0.35 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    ScrollTrigger.batch(".brow", {
      start: "top 92%",
      once: true,
      onEnter: (els) =>
        gsap.timeline()
          .fromTo(els, { "--line": 0 }, { "--line": 1, duration: 1.2, ease: "expo.out", stagger: 0.06 }, 0)
          .fromTo(els.map((e) => $(".brow__link", e)), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.06 }, 0.1),
    });
  });

  // Превью за курсором: картинка или монограмма, наклон от скорости
  if (!finePointer) return;
  const pv = $("#preview"), pImg = $("img", pv), pMono = $(".preview__mono", pv);
  const toX = gsap.quickTo(pv, "x", { duration: 0.6, ease: "power3" });
  const toY = gsap.quickTo(pv, "y", { duration: 0.6, ease: "power3" });
  const toR = gsap.quickTo(pv, "rotate", { duration: 0.8, ease: "power3" });
  let lastX = 0, cur = -1;
  list.addEventListener("pointermove", (e) => {
    toX(e.clientX);
    toY(e.clientY);
    toR(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6));
    lastX = e.clientX;
    const row = e.target.closest(".brow");
    if (!row || +row.dataset.i === cur) return;
    cur = +row.dataset.i;
    const b = BRANDS[cur];
    pv.classList.toggle("is-mono", !b.img);
    if (b.img) pImg.src = $(".brow__thumb img", row).src;
    pMono.textContent = b.name;
    if (!reduced()) gsap.fromTo(pv.firstElementChild, { scale: 1.15, filter: "blur(6px)" }, { scale: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out" });
  });
  list.addEventListener("pointerenter", () => pv.classList.add("is-on"));
  list.addEventListener("pointerleave", () => {
    pv.classList.remove("is-on");
    cur = -1;
  });
}

/* ---------- Витрина по брендам ---------- */
function initShowcase() {
  const tabs = [["Nike"], ["Jordan"], ["Adidas"], ["New Balance"], LUX];
  const grid = $("#showGrid");
  const pick = (names) => PRODUCTS.filter((p) => names.some((n) => p.brand === n)).slice(0, 8);
  function render(k, animate) {
    const list = pick(tabs[k]);
    const old = $$(".card", grid);
    const put = () => {
      grid.innerHTML = list.map(cardHTML).join("");
      hydrateCards(grid);
      if (animate && !reduced())
        gsap.fromTo($$(".card", grid), { y: 50, opacity: 0, rotateX: -12 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, onComplete: () => ScrollTrigger.refresh() });
    };
    if (animate && old.length && !reduced()) gsap.to(old, { y: -30, opacity: 0, duration: 0.3, stagger: 0.02, ease: "power2.in", onComplete: put });
    else put();
  }
  $("#showTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".seg__b");
    if (!b || b.classList.contains("is-on")) return;
    $$(".seg__b", $("#showTabs")).forEach((x) => {
      x.classList.toggle("is-on", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    render(+b.dataset.k, true);
  });
  render(0, false);
}

export function initBrands() {
  initHero();
  initIndex();
  initShowcase();
  createRing($("#ringStage"), LOOK_SNEAKERS);
}
