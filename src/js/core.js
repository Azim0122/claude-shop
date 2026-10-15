// Общее для всех страниц: утилиты, плавный скролл, лоадер и переходы между
// страницами, шапка и меню, курсор, магнитные кнопки, анимации появления.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import Lenis from "lenis";
import { px } from "./data.js";

gsap.registerPlugin(ScrollTrigger, Flip);
// На телефонах адресная строка меняет высоту экрана при прокрутке:
// не пересчитываем анимации из-за этого, иначе всё дёргается.
ScrollTrigger.config({ ignoreMobileResize: true });
export { gsap, ScrollTrigger, Flip };

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const rmQuery = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = () => rmQuery.matches;
export const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
export const mm = gsap.matchMedia();

export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

// Картинка с Pexels; если не загрузилась, родитель показывает подпись-заглушку
export function setImg(img, id, w = 900) {
  const box = img.parentElement;
  box.dataset.fallback = img.alt || "CLAUDE SHOP";
  img.addEventListener("error", () => box.classList.add("noimg"), { once: true });
  img.src = px(id, w);
}

/* ---------- Плавный скролл ---------- */
let lenis = null;
const locks = new Set();
const raf = (t) => lenis && lenis.raf(t * 1000);
export function startLenis() {
  if (lenis || reduced() || !finePointer) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  if (locks.size) lenis.stop();
}
function stopLenis() {
  if (!lenis) return;
  gsap.ticker.remove(raf);
  lenis.destroy();
  lenis = null;
}
// Блокировка прокрутки, пока открыты меню, корзина или окна
export function lock(key, on) {
  on ? locks.add(key) : locks.delete(key);
  if (lenis) locks.size ? lenis.stop() : lenis.start();
  document.documentElement.classList.toggle("is-locked", locks.size > 0);
}
export function scrollToEl(el, offset = -70) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
}

/* ---------- Тост ---------- */
let toastTimer;
export function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Текст: разбивка на слова и «шифровка» ---------- */
export function splitWords(el, cls = "split") {
  el.innerHTML = el.textContent
    .trim()
    .split(/\s+/)
    .map((w) => (cls === "split" ? `<span class="sw"><span class="si">${w}</span></span>` : `<span class="mw">${w}</span>`))
    .join(" ");
}
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/";
export function scramble(el) {
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  if (reduced()) {
    el.textContent = final;
    return;
  }
  let f = 0;
  const steps = 22;
  (function tick() {
    el.textContent = final
      .split("")
      .map((ch, i) => (ch === " " || i < (f / steps) * final.length ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
      .join("");
    ++f <= steps ? requestAnimationFrame(tick) : (el.textContent = final);
  })();
}

/* ---------- Интро страницы (после лоадера или шторки) ---------- */
const introFns = [];
let introDone = false;
export function onIntro(fn) {
  introDone ? fn() : introFns.push(fn);
}
function runIntro() {
  if (introDone) return;
  introDone = true;
  document.documentElement.classList.remove("is-return");
  document.body.classList.remove("is-loading");
  startLenis();
  ScrollTrigger.refresh();
  introFns.forEach((fn) => fn());
}

/* ---------- Лоадер (первый визит) и шторка (переходы) ---------- */
const VISIT = "cs-visited";
function boot() {
  const loader = $(".loader");
  const curtain = $(".pt");
  const returning = document.documentElement.classList.contains("is-return");
  try {
    sessionStorage.setItem(VISIT, "1");
  } catch {}

  if (reduced()) {
    loader && loader.remove();
    curtain && gsap.set(curtain, { yPercent: 100 });
    runIntro();
    return;
  }
  if (returning || !loader) {
    loader && loader.remove();
    gsap.timeline()
      .set(curtain, { yPercent: 0 })
      .to(".pt__logo", { yPercent: -120, opacity: 0, duration: 0.45, ease: "power3.in" }, 0.05)
      .to(curtain, { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 0.15)
      .add(runIntro, 0.5)
      .set(curtain, { yPercent: 100 })
      .set(".pt__logo", { yPercent: 0, opacity: 1 });
    return;
  }
  const num = $("#loaderNum"), bar = $(".loader__bar i");
  const p = { v: 0 };
  const draw = () => {
    num.textContent = String(Math.round(p.v)).padStart(2, "0");
    bar.style.transform = `scaleX(${p.v / 100})`;
  };
  const tl = gsap.timeline();
  tl.to(p, { v: 82, duration: 1.3, ease: "power2.inOut", onUpdate: draw });
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    tl.to(p, { v: 100, duration: 0.5, ease: "power2.out", onUpdate: draw })
      .to(".loader__word span", { yPercent: -115, stagger: 0.03, duration: 0.6, ease: "power3.in" })
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "-=.2")
      .add(() => {
        loader.remove();
        runIntro();
      }, "-=.45");
  });
}

// Переход на другую страницу: шторка накрывает экран, затем переходим
function leaveTo(href) {
  const curtain = $(".pt");
  if (reduced() || !curtain) {
    location.href = href;
    return;
  }
  leaving = true;
  lock("leave", true);
  // Если переход не случился (отмена, медленная сеть), через 4 с открываем страницу обратно
  setTimeout(() => leaving && clearCurtain(), 4000);
  gsap.timeline({ onComplete: () => (location.href = href) })
    .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: "expo.inOut" })
    .fromTo(".pt__logo", { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 0.4);
}
// Шторка и лоадер никогда не должны оставаться на экране.
// Убираем их при возврате на страницу (кнопка «Назад», возврат из Telegram,
// разворачивание вкладки) и по таймеру, если анимация почему-то не доиграла.
let leaving = false;
export function clearCurtain() {
  leaving = false;
  const curtain = $(".pt"), loader = $(".loader");
  if (curtain) {
    gsap.killTweensOf([curtain, ".pt__logo"]);
    gsap.set(curtain, { yPercent: 100 });
    gsap.set(".pt__logo", { yPercent: 0, opacity: 1 });
  }
  loader && loader.remove();
  lock("leave", false);
  runIntro();
}
addEventListener("pageshow", (e) => e.persisted && clearCurtain());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !leaving) setTimeout(() => !leaving && introDone && clearCurtain(), 300);
});
setTimeout(() => !leaving && clearCurtain(), 6000);

function initLinks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.hasAttribute("download")) return;
    const raw = a.getAttribute("href");
    if (raw === "#") return;
    let url;
    try {
      url = new URL(a.href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin && location.protocol !== "file:") return;
    if (!/^(https?|file):$/.test(url.protocol)) return;
    const samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage && url.hash) {
      const target = url.hash.length > 1 && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) {
        e.preventDefault();
        closeMenu();
        scrollToEl(target);
      }
      return;
    }
    if (samePage) return;
    e.preventDefault();
    closeMenu();
    leaveTo(a.href);
  });
}

/* ---------- Шапка и мобильное меню ---------- */
let menu, burger;
export function closeMenu() {
  if (!menu || !menu.classList.contains("is-open")) return;
  menu.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-hidden", "true");
  lock("menu", false);
}
function initNav() {
  const head = $("#nav");
  // Меню находим до первого вызова onScroll: при возврате на страницу
  // браузер восстанавливает прокрутку, и onScroll срабатывает сразу
  menu = $("#mmenu");
  burger = $("#burger");
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    head.classList.toggle("is-solid", y > 40);
    head.classList.toggle("is-hidden", y > 500 && y > lastY && !menu.classList.contains("is-open"));
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  burger.addEventListener("click", () => {
    const open = !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    lock("menu", open);
  });

  // Подсветка текущей страницы
  const page = document.body.dataset.page;
  $$(`[data-nav="${page}"]`).forEach((a) => a.setAttribute("aria-current", "page"));
}

/* ---------- Курсор и магнитные кнопки ---------- */
function initCursor() {
  if (!finePointer) return;
  const c = $(".cursor"), label = $(".cursor__label");
  const toX = gsap.quickTo(c, "x", { duration: 0.45, ease: "power3" });
  const toY = gsap.quickTo(c, "y", { duration: 0.45, ease: "power3" });
  addEventListener("pointermove", (e) => {
    toX(e.clientX);
    toY(e.clientY);
    c.classList.add("is-on");
  }, { passive: true });
  document.addEventListener("pointerleave", () => c.classList.remove("is-on"));
  document.addEventListener("pointerover", (e) => {
    const view = e.target.closest("[data-view], [data-cursor], .look__stage, .panel__img");
    const hot = e.target.closest("a:not([data-cursor]), button:not([data-view]):not([data-cursor]), summary, input, select, label");
    c.classList.toggle("is-view", !!view && !hot);
    c.classList.toggle("is-hover", !!hot);
    if (view) label.textContent = view.dataset.cursor || (view.closest(".look__stage") ? "Тяни" : view.classList.contains("tile") ? "Открыть" : "Смотреть");
  });
  $$("[data-magnetic]").forEach(magnetic);
}
export function magnetic(el) {
  if (!finePointer) return;
  const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1,.4)" });
  const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1,.4)" });
  el.addEventListener("pointermove", (e) => {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    x((e.clientX - r.left - r.width / 2) * 0.3);
    y((e.clientY - r.top - r.height / 2) * 0.35);
  });
  el.addEventListener("pointerleave", () => {
    x(0);
    y(0);
  });
}

/* ---------- Вопросы-ответы с плавным раскрытием ---------- */
function initQA() {
  $$(".qa").forEach((qa) => {
    const sum = $("summary", qa), body = $(".qa__a", qa);
    sum.addEventListener("click", (e) => {
      if (reduced()) return;
      e.preventDefault();
      if (qa.open)
        gsap.to(body, { height: 0, duration: 0.5, ease: "expo.inOut", onComplete: () => ((qa.open = false), (body.style.height = "")) });
      else {
        qa.open = true;
        gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.7, ease: "expo.out", onComplete: () => (body.style.height = "") });
      }
    });
  });
}

/* ---------- Счётчики ---------- */
export function countUp(el, delay = 0) {
  const to = +el.dataset.count;
  if (reduced()) {
    el.textContent = to;
    return;
  }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.8, delay, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v)) });
}

/* ---------- Анимации при прокрутке (общие) ---------- */
function initScroll() {
  $$(".split").forEach((el) => splitWords(el));
  const scr = new IntersectionObserver((list) => list.forEach((e) => e.isIntersecting && (scramble(e.target), scr.unobserve(e.target))), { threshold: 1 });
  $$("[data-scramble]").forEach((el) => scr.observe(el));

  // Счётчики вне hero запускаются, когда попадают в экран
  const cnt = new IntersectionObserver((list) => list.forEach((e) => e.isIntersecting && (countUp(e.target), cnt.unobserve(e.target))), { threshold: 0.6 });
  $$("[data-count]:not([data-count-intro])").forEach((el) => cnt.observe(el));

  // Карточки с рисующимися иконками
  const draw = new IntersectionObserver((list) => list.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), draw.unobserve(e.target))), { threshold: 0.35 });
  $$(".perk, [data-in]").forEach((el) => draw.observe(el));

  mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, ({ conditions }) => {
    if (!conditions.motion) return;
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => gsap.set(".progress i", { scaleX: s.progress }) });
    $$(".split").forEach((el) =>
      gsap.to($$(".si", el), { y: 0, duration: 1.2, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: el, start: "top 88%" } }),
    );
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: (els) => gsap.fromTo(els, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: true }),
    });
    ScrollTrigger.batch("[data-reveal-clip]", {
      start: "top 88%",
      once: true,
      onEnter: (els) =>
        gsap.fromTo(els, { clipPath: "inset(14% 8% 14% 8% round 14px)", scale: 1.06 }, { clipPath: "inset(0% 0% 0% 0% round 6px)", scale: 1, duration: 1.4, ease: "expo.out", stagger: 0.1 }),
    });
    $$("[data-parallax]").forEach((el) => {
      const k = +el.dataset.parallax || 10;
      gsap.fromTo(el, { yPercent: -k }, { yPercent: k, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    // Бегущие строки наклоняются от скорости прокрутки
    const tracks = $$(".brands__track, .cta__track, .marquee__track");
    if (tracks.length) {
      const skew = gsap.quickTo(tracks, "skewX", { duration: 0.5, ease: "power3" });
      ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-10, 10, s.getVelocity() / -260)) });
    }
    if ($(".footer__big"))
      gsap.from(".footer__big", { yPercent: 40, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 92%" } });
  });
}

/* ---------- Уменьшение движения ---------- */
const rmHandlers = [];
export function onReducedChange(fn) {
  rmHandlers.push(fn);
}
function applyReduced() {
  document.documentElement.classList.add("rm");
  $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count));
  $$(".perk, [data-in]").forEach((el) => el.classList.add("in"));
}

export function initCore() {
  initLinks();
  initNav();
  initCursor();
  initQA();
  initScroll();
  document.addEventListener("visibilitychange", () => document.body.classList.toggle("paused", document.hidden));
  rmQuery.addEventListener("change", (e) => {
    if (e.matches) {
      applyReduced();
      stopLenis();
    } else {
      document.documentElement.classList.remove("rm");
      startLenis();
    }
    rmHandlers.forEach((fn) => fn(e.matches));
    ScrollTrigger.refresh();
  });
  if (reduced()) applyReduced();
  addEventListener("load", () => ScrollTrigger.refresh());
}
export { boot };
