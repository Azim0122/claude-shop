// Страница товара: product.html?id=c23. Галерея с раскрытием и параллаксом,
// липкая панель с размерами, похожие товары.
import Swiper from "swiper";
import { FreeMode, Mousewheel, Keyboard, Navigation } from "swiper/modules";
import { gsap, ScrollTrigger, $, $$, reduced, mm, onIntro, setImg, splitWords } from "./core.js";
import { cardHTML, hydrateCards, registerSwiper, addToCart, openTelegram, orderText, needSize } from "./shop.js";
import { PRODUCTS, CATS, byId, fullName, priceText } from "./data.js";

export function initProduct() {
  const id = new URLSearchParams(location.search).get("id");
  const p = byId(id) || PRODUCTS[0];
  const cat = CATS.find((c) => c.id === p.cat);
  document.title = `${fullName(p)} · CLAUDE SHOP`;
  if (p.cat === "shoes") document.body.dataset.shoes = "1";

  $("#crumbCat").textContent = cat ? cat.name : "Каталог";
  $("#crumbCat").href = `index.html?cat=${p.cat}#catalog`;
  $("#crumbName").textContent = p.name;
  $("#pBrand").textContent = (p.brand || "Под заказ") + (p.tag ? " · " + p.tag : "");
  $("#pTitle").textContent = p.name;
  splitWords($("#pTitle"));
  $("#pPrice").textContent = priceText(p);
  $("#pColor").textContent = p.color;
  $("#pDesc").textContent = p.desc;
  $("#pLabel").textContent = p.cat === "shoes" ? "Размер, EU" : "Размер";
  $("#pTape").dataset.words = [fullName(p), "Оригинал", p.color, "Доставка в Фергану"].join("|");
  $("#pTape").dataset.pics = p.img.join("|");

  // Галерея: у товара 1–2 фото; добавляем крупный план из того же снимка
  const shots = [...p.img];
  const gal = $("#gallery");
  gal.innerHTML = shots.map((_, i) => `<figure class="pg__item"><img alt="${fullName(p)}, фото ${i + 1}" data-parallax="6"></figure>`).join("") +
    `<figure class="pg__item pg__item--zoom"><img alt="${fullName(p)}, крупный план"></figure>`;
  $$(".pg__item img", gal).forEach((img, i) => setImg(img, shots[i] || shots[0], 1400));
  $("#gDots").innerHTML = $$(".pg__item", gal).map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("");

  // Размеры
  let size = p.sizes.length === 1 ? p.sizes[0] : null;
  $("#pSizes").innerHTML = p.sizes.map((s) => `<button class="size ${size === s ? "is-on" : ""}">${s}</button>`).join("");
  $("#pSizes").addEventListener("click", (e) => {
    const b = e.target.closest(".size");
    if (!b) return;
    $$(".size", $("#pSizes")).forEach((x) => x.classList.toggle("is-on", x === b));
    size = b.textContent;
    $("#pChosen").textContent = "Выбран: " + size;
  });
  $("#pAdd").addEventListener("click", () => !needSize($("#pSizes"), size) && addToCart(p.id, size, $("#pAdd")));
  $("#pOrder").addEventListener("click", () => !needSize($("#pSizes"), size) && openTelegram(orderText([{ id: p.id, size, qty: 1 }])));

  // Похожие: та же категория, затем тот же бренд
  const related = [...PRODUCTS.filter((x) => x.id !== p.id && x.cat === p.cat), ...PRODUCTS.filter((x) => x.id !== p.id && x.cat !== p.cat && x.brand && x.brand === p.brand)].slice(0, 10);
  $("#relTrack").innerHTML = related.map((x) => `<div class="swiper-slide">${cardHTML(x)}</div>`).join("");
  hydrateCards($("#relTrack"));
  registerSwiper(new Swiper(".rel__swiper", {
    modules: [FreeMode, Mousewheel, Keyboard, Navigation],
    slidesPerView: "auto",
    spaceBetween: 20,
    grabCursor: true,
    freeMode: { enabled: true, momentumRatio: 0.7 },
    mousewheel: { forceToAxis: true },
    keyboard: { enabled: true, onlyInViewport: true },
    navigation: { prevEl: "#relPrev", nextEl: "#relNext" },
  }));

  // Мобильная галерея листается вбок: точки показывают текущее фото
  gal.addEventListener("scroll", () => {
    const k = Math.round(gal.scrollLeft / gal.clientWidth);
    $$("#gDots i").forEach((d, i) => d.classList.toggle("on", i === k));
  }, { passive: true });

  onIntro(() => {
    if (reduced()) return;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(".nav > *", { y: -24, opacity: 0, duration: 1, stagger: 0.08 }, 0)
      .fromTo(".pg__item", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, stagger: 0.12 }, 0)
      .fromTo(".pg__item img", { scale: 1.25 }, { scale: 1, duration: 1.8, stagger: 0.12 }, 0)
      .to("#pTitle .si", { y: 0, duration: 1.2, stagger: 0.06 }, 0.2)
      .fromTo(".pinfo > *:not(h1)", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.05 }, 0.3);
  });
  mm.add("(prefers-reduced-motion: no-preference) and (min-width: 901px)", () => {
    // Крупный план: фото увеличивается, пока его прокручиваешь
    gsap.fromTo(".pg__item--zoom img", { scale: 1.1 }, { scale: 2, ease: "none", scrollTrigger: { trigger: ".pg__item--zoom", start: "top bottom", end: "bottom top", scrub: true } });
    ScrollTrigger.create({
      trigger: "#gallery",
      start: "top 80%",
      end: "bottom 30%",
      onToggle: (s) => $("#gDots").classList.toggle("is-on", s.isActive),
      onUpdate: (s) => {
        const k = Math.min(shots.length, Math.floor(s.progress * (shots.length + 1)));
        $$("#gDots i").forEach((d, i) => d.classList.toggle("on", i === k));
      },
    });
  });
}
