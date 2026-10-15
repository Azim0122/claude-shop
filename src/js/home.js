// Главная: глобус, категории, новинки, коллекции, чат-заказ, лупа, манифест,
// лукбук, каталог с фильтрами.
import Swiper from "swiper";
import { Navigation, FreeMode, Mousewheel, Keyboard } from "swiper/modules";
import { gsap, ScrollTrigger, Flip, $, $$, reduced, mm, setImg, scramble, scrollToEl, onIntro, onReducedChange } from "./core.js";
import { cardHTML, hydrateCards, registerSwiper, cart, onCartChange, orderText, ICON_ARROW } from "./shop.js";
import { CATS, PRODUCTS, CITIES, LOOK_WEAR, LOOK_SNEAKERS, byId, rub } from "./data.js";
import { createGlobe } from "./globe.js";
import { createRing } from "./ring.js";
import { initManifest } from "./manifest.js";

const LUX = ["Chanel", "Louis Vuitton", "Gucci", "Prada", "Dior"];
const brandMatch = (p, b) => b === "all" || (b === "lux" ? LUX.includes(p.brand) : p.brand === b || p.name.includes(b));

/* ---------- Hero: глобус и города ---------- */
function initHero() {
  const globe = createGlobe($("#globe"), $("#globeLabels"), { reduced });
  const box = $("#cities");
  box.innerHTML = CITIES.map((c, i) => `<button class="city" role="tab" data-i="${i}" aria-selected="false">${c.name}</button>`).join("");
  let cur = -1, timer = 0;
  function pick(i, byUser) {
    cur = i;
    const c = CITIES[i];
    $$(".city", box).forEach((b, k) => {
      b.classList.toggle("is-on", k === i);
      b.setAttribute("aria-selected", String(k === i));
    });
    $("#ciRoute").textContent = `${c.name} → Фергана`;
    $("#ciBrands").textContent = c.brands;
    $("#ciNote").textContent = c.note;
    $("#ciDays").textContent = c.days;
    const info = $(".cityinfo");
    info.classList.remove("swap");
    void info.offsetWidth;
    info.classList.add("swap");
    globe && globe.focus(i, gsap);
    if (byUser) stopTour();
  }
  const stopTour = () => {
    clearInterval(timer);
    timer = -1;
  };
  const tour = () => {
    if (timer || reduced()) return;
    pick((cur + 1) % CITIES.length);
    timer = setInterval(() => pick((cur + 1) % CITIES.length), 5200);
  };
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".city");
    b && pick(+b.dataset.i, true);
  });
  if (globe) globe.onTouch = stopTour;
  onReducedChange((r) => globe && globe.setReduced(r));

  onIntro(() => {
    scramble($(".hero .kicker"));
    globe && globe.go();
    if (!reduced()) setTimeout(tour, 2800);
    if (reduced()) return;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .to(".hero__title .word", { y: 0, duration: 1.3, stagger: 0.1 })
      .to(".hero .reveal-up", { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.4)
      .from(".nav > *", { y: -24, opacity: 0, duration: 1, stagger: 0.08 }, 0.5);
  });
}

/* ---------- Категории ---------- */
function initCats() {
  $("#catsGrid").innerHTML = CATS.map((c) => {
    const n = PRODUCTS.filter((p) => p.cat === c.id).length;
    return `<button class="tile" data-go-cat="${c.id}" data-view aria-label="${c.name}, ${n} моделей"><img alt="${c.name}" loading="lazy"><span class="tile__n">${n} моделей</span><span class="tile__name">${c.name}</span><span class="tile__go">${ICON_ARROW}</span></button>`;
  }).join("");
  $$(".tile").forEach((t, i) => setImg($("img", t), CATS[i].img, 800));
}

/* ---------- Новинки: слайдер с 3D-наклоном от скорости ---------- */
function initNew() {
  $("#newTrack").innerHTML = PRODUCTS.filter((p) => p.isNew || p.top)
    .slice(0, 12)
    .map((p) => `<div class="swiper-slide">${cardHTML(p)}</div>`)
    .join("");
  const sw = new Swiper(".new__swiper", {
    modules: [Navigation, FreeMode, Mousewheel, Keyboard],
    slidesPerView: "auto",
    spaceBetween: 24,
    grabCursor: true,
    freeMode: { enabled: true, momentumRatio: 0.7 },
    mousewheel: { forceToAxis: true },
    keyboard: { enabled: true, onlyInViewport: true },
    navigation: { prevEl: "#newPrev", nextEl: "#newNext" },
    breakpoints: { 0: { spaceBetween: 14 }, 760: { spaceBetween: 24 } },
    on: { progress: (_, p) => ($("#newBar").style.transform = `scaleX(${Math.max(0.1, Math.min(1, p))})`) },
  });
  registerSwiper(sw);
  let prev = sw.translate, v = 0, raf = 0;
  function tick() {
    const t = sw.translate;
    v += (t - prev - v) * 0.2;
    prev = t;
    const deg = reduced() ? 0 : gsap.utils.clamp(-12, 12, v * 0.25);
    sw.slides.forEach((s) => (s.style.transform = `perspective(900px) rotateY(${deg}deg)`));
    if (Math.abs(v) > 0.05 || Math.abs(t - prev) > 0.05) raf = requestAnimationFrame(tick);
    else {
      sw.slides.forEach((s) => (s.style.transform = ""));
      raf = 0;
    }
  }
  sw.on("setTranslate", () => raf || (raf = requestAnimationFrame(tick)));
}

/* ---------- Коллекции: стопка карточек ---------- */
function initCollections() {
  const panels = $$(".panel");
  panels.forEach((p, i) => p.style.setProperty("--i", i));
  mm.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 821px)" }, ({ conditions: c }) => {
    if (!c.motion) return;
    panels.forEach((p) =>
      gsap.fromTo($(".panel__img img", p), { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: true } }),
    );
    if (c.wide)
      panels.forEach((p, i) => {
        const next = panels[i + 1];
        next && gsap.to(p, { scale: 0.93, opacity: 0.55, ease: "none", scrollTrigger: { trigger: next, start: "top 85%", end: "top 100px", scrub: true } });
      });
    gsap.from(".cta__title", { yPercent: 30, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".cta", start: "top 70%" } });
    ScrollTrigger.batch(".tile", {
      start: "top 90%",
      once: true,
      onEnter: (els) =>
        gsap.fromTo(els, { y: 70, opacity: 0, clipPath: "inset(12% 0% 0% 0%)" }, { y: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.out", stagger: 0.08 }),
    });
    ScrollTrigger.batch("#grid .card", {
      start: "top 92%",
      once: true,
      onEnter: (els) => gsap.fromTo(els, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.07, overwrite: true }),
    });
  });
}

/* ---------- Как заказать: переписка в «телефоне» ---------- */
function initFlow() {
  const chat = $("#chat"), steps = $$("#flowSteps li");
  let step = 0, msgs = [];
  function build() {
    const items = cart.items.length ? cart.items : [{ id: "c23", size: "42", qty: 1 }, { id: "c25", size: "43", qty: 1 }];
    const sum = items.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    const total = (items.some((i) => byId(i.id).from) ? "от " : "") + rub(sum);
    msgs = [
      { step: 0, who: "me", text: orderText(items), t: "14:02" },
      { step: 1, who: "shop", html: `Привет! Всё нашли, наличие подтверждено.<br>Цена зафиксирована: <b>${total}</b><br>Срок: 16 дней. Размеры подходят?`, t: "14:04" },
      { step: 1, who: "me", text: "Да, беру", t: "14:05" },
      { step: 2, who: "shop", html: "Выкупили и проверили:<ul><li>Бирки и коды</li><li>Швы и строчка</li><li>Фурнитура</li><li>Коробка и чек</li></ul>Это оригинал, едет к тебе.", t: "14:31" },
      { step: 3, who: "shop", html: 'Отправили! Трек: <b>UZ 4821 7730 19</b><div class="track"><i></i></div>', t: "14:40" },
      { step: 3, who: "me", text: "Спасибо, жду!", t: "14:41" },
    ].map((m) => {
      const el = document.createElement("div");
      el.className = `msg msg--${m.who}`;
      el.dataset.step = m.step;
      m.text ? (el.textContent = m.text) : (el.innerHTML = m.html);
      const time = document.createElement("time");
      time.textContent = m.t;
      el.appendChild(time);
      return el;
    });
  }
  function show(i, instant) {
    step = i;
    steps.forEach((li, k) => li.classList.toggle("on", k === i));
    let d = 0;
    msgs.forEach((m) => {
      const want = +m.dataset.step <= i, has = m.parentNode === chat;
      if (want && !has) {
        chat.appendChild(m);
        if (!instant && !reduced())
          gsap.fromTo(m, { opacity: 0, y: 18, scale: 0.92, transformOrigin: m.classList.contains("msg--me") ? "right bottom" : "left bottom" }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "expo.out", delay: d++ * 0.45 });
      } else if (!want && has) m.remove();
    });
  }
  onCartChange(() => {
    chat.innerHTML = "";
    build();
    show(step, true);
  });
  build();
  show(reduced() ? 3 : 0, true);
  mm.add("(min-width: 821px) and (prefers-reduced-motion: no-preference)", () => {
    const st = ScrollTrigger.create({
      trigger: ".flow__pin",
      start: "top top",
      end: "+=260%",
      pin: true,
      onUpdate: (s) => {
        const i = Math.min(3, Math.floor(s.progress * 4));
        i !== step && show(i);
      },
    });
    return () => st.kill();
  });
  mm.add("(max-width: 820px)", () => show(3, true));
  onReducedChange((r) => r && show(3, true));
}

/* ---------- Подлинность: лупа и штамп ---------- */
function initAuth() {
  const box = $("#loupe"), lens = $("#lens"), img = box.querySelector(":scope > img"), zoom = $("img", lens);
  const Z = 2.6;
  let w = 1, h = 1, L = 170, auto = true, idle = 0, seen = false, x = 0, y = 0;
  zoom.src = img.src;
  zoom.addEventListener("error", () => zoom.remove(), { once: true });
  function size() {
    const r = box.getBoundingClientRect();
    w = r.width;
    h = r.height;
    L = Math.round(Math.min(230, Math.max(130, w * 0.28)));
    lens.style.setProperty("--L", L + "px");
    zoom.style.width = w * Z + "px";
    zoom.style.height = h * Z + "px";
    move(x || w / 2, y || h / 2);
  }
  function move(nx, ny) {
    x = nx;
    y = ny;
    lens.style.transform = `translate(${nx - L / 2}px,${ny - L / 2}px)`;
    zoom.style.transform = `translate(${-(nx * Z - L / 2)}px,${-(ny * Z - L / 2)}px)`;
  }
  size();
  addEventListener("resize", size);
  box.addEventListener("pointermove", (e) => {
    const r = box.getBoundingClientRect();
    auto = false;
    clearTimeout(idle);
    idle = setTimeout(() => (auto = true), 2500);
    move(e.clientX - r.left, e.clientY - r.top);
  });
  new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(box);
  gsap.ticker.add((t) => auto && seen && !reduced() && move(w * (0.5 + 0.3 * Math.sin(t * 0.7)), h * (0.5 + 0.28 * Math.sin(t * 1.1 + 1))));

  const checks = $$("#checks li");
  const stamp = () => gsap.set("#stamp", { scale: 1, opacity: 1, rotate: -12 });
  function run() {
    if (reduced()) {
      checks.forEach((c) => c.classList.add("ok"));
      return stamp();
    }
    checks.forEach((c, i) => gsap.delayedCall(0.5 + i * 0.75, () => c.classList.add("ok")));
    gsap.fromTo("#stamp", { scale: 2.4, opacity: 0, rotate: -26 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.7, ease: "back.out(2)", delay: 0.5 + checks.length * 0.75 });
  }
  new IntersectionObserver((e, o) => e[0].isIntersecting && (run(), o.disconnect()), { threshold: 0.45 }).observe($("#auth"));
  onReducedChange((r) => r && (checks.forEach((c) => c.classList.add("ok")), stamp()));
}

/* ---------- Лукбук: два набора, переключатель ---------- */
function initLook() {
  const ring = createRing($("#ringStage"), LOOK_WEAR);
  const tabs = $$("[data-look]");
  tabs.forEach((b) =>
    b.addEventListener("click", () => {
      if (b.classList.contains("is-on")) return;
      tabs.forEach((t) => {
        t.classList.toggle("is-on", t === b);
        t.setAttribute("aria-pressed", String(t === b));
      });
      ring.swap(b.dataset.look === "sneakers" ? LOOK_SNEAKERS : LOOK_WEAR);
    }),
  );
}

/* ---------- Каталог ---------- */
function initCatalog() {
  const grid = $("#grid");
  grid.innerHTML = PRODUCTS.map(cardHTML).join("");
  hydrateCards(document);

  const q = new URLSearchParams(location.search);
  const state = {
    cat: CATS.some((c) => c.id === q.get("cat")) ? q.get("cat") : "all",
    g: "all",
    sort: "def",
    brand: q.get("brand") || "all",
  };
  const brandSel = $("#brand");
  if (state.brand !== "all" && ![...brandSel.options].some((o) => o.value === state.brand)) brandSel.add(new Option(state.brand, state.brand));
  brandSel.value = state.brand;

  const gender = (p) => state.g === "all" || p.g === state.g || p.g === "u";
  const fits = (p) => gender(p) && brandMatch(p, state.brand) && (state.cat === "all" || p.cat === state.cat);
  function chips() {
    const count = (id) => PRODUCTS.filter((p) => gender(p) && brandMatch(p, state.brand) && (id === "all" || p.cat === id)).length;
    $("#filters").innerHTML = [{ id: "all", name: "Всё" }, ...CATS]
      .map((c) => `<button class="chip ${state.cat === c.id ? "is-on" : ""}" data-f="${c.id}" role="tab" aria-selected="${state.cat === c.id}">${c.name}<sup>${count(c.id)}</sup></button>`)
      .join("");
  }
  function apply(instant) {
    const cards = $$(".card", grid);
    const key = { def: (p) => PRODUCTS.indexOf(p), new: (p) => (p.isNew ? 0 : 1) * 100 + PRODUCTS.indexOf(p), asc: (p) => p.price, desc: (p) => -p.price }[state.sort];
    const flip = Flip.getState(cards);
    [...cards].sort((a, b) => key(byId(a.dataset.id)) - key(byId(b.dataset.id))).forEach((c) => grid.appendChild(c));
    let shown = 0;
    cards.forEach((c) => {
      const ok = fits(byId(c.dataset.id));
      c.classList.toggle("is-hidden", !ok);
      ok && shown++;
      gsap.set(c, { opacity: 1, y: 0 });
    });
    $("#empty").hidden = shown > 0;
    $("#found").textContent = `${shown} ${plural(shown, "модель", "модели", "моделей")}`;
    if (instant) return;
    Flip.from(flip, {
      duration: reduced() ? 0 : 0.8,
      ease: "expo.inOut",
      scale: true,
      absolute: true,
      stagger: 0.02,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, ease: "expo.out" }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }
  const setCat = (id, scroll) => {
    state.cat = id;
    chips();
    apply();
    scroll && scrollToEl($("#catalog"));
  };
  chips();
  apply(true);

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    b && setCat(b.dataset.f);
  });
  $("#gender").addEventListener("click", (e) => {
    const b = e.target.closest(".seg__b");
    if (!b) return;
    $$(".seg__b", $("#gender")).forEach((x) => {
      x.classList.toggle("is-on", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    state.g = b.dataset.g;
    chips();
    apply();
  });
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    apply();
  });
  brandSel.addEventListener("change", () => {
    state.brand = brandSel.value;
    chips();
    apply();
  });
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go-cat]");
    if (go) {
      e.preventDefault();
      setCat(go.dataset.goCat, true);
    }
  });
  // Переход с другой страницы: index.html?brand=Nike#catalog
  if (location.hash === "#catalog" || q.has("brand") || q.has("cat"))
    onIntro(() => setTimeout(() => scrollToEl($("#catalog")), 150));
}
const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);

export function initHome() {
  initHero();
  initCats();
  initNew();
  initCatalog();
  initCollections();
  initFlow();
  initAuth();
  initManifest();
  initLook();
}
