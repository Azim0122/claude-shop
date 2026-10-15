// «О нас»: шёлковый WebGL-hero, манифест, горизонтальный «путь вещи»,
// цифры, доставка с рисующейся линией, карточка с живым шумом.
import { gsap, ScrollTrigger, $, $$, reduced, mm, scramble, countUp, onIntro, onReducedChange } from "./core.js";
import { createSilk } from "./silk.js";
import { initManifest } from "./manifest.js";

function initHero() {
  const silk = createSilk($("#silk"), { reduced });
  onReducedChange((r) => silk && silk.setReduced(r));
  onIntro(() => {
    scramble($(".shero .kicker"));
    if (reduced()) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } })
      .to(".shero__title .word", { y: 0, rotate: 0, duration: 1.4, stagger: 0.09 })
      .to(".shero .reveal-up", { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, "-=1.0")
      .from(".nav > *", { y: -30, opacity: 0, duration: 1, stagger: 0.08 }, "-=1.1")
      .from(".shero__meta li", { x: 30, opacity: 0, stagger: 0.08, duration: 1 }, "-=1");
    $$(".shero__meta [data-count]").forEach((el) => tl.add(() => countUp(el), 0.5));
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    ScrollTrigger.create({ trigger: ".shero", start: "top top", end: "bottom top", scrub: true, onUpdate: (s) => silk && silk.setScroll(s.progress) });
    gsap.to(".shero__inner", { yPercent: -18, opacity: 0, ease: "none", scrollTrigger: { trigger: ".shero", start: "40% top", end: "bottom top", scrub: true } });
  });
}

// Горизонтальная лента: на десктопе прокрутка вниз двигает её вбок
function initDrop() {
  mm.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 761px)" }, ({ conditions: c }) => {
    const cards = $$(".drop__card");
    if (!c.motion || !c.wide) {
      cards.forEach((el) => el.classList.add("in"));
      gsap.set(".drop__wave path", { strokeDashoffset: 0 });
      return;
    }
    const track = $("#dropTrack");
    const dist = () => track.scrollWidth - innerWidth;
    const move = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: ".drop",
        pin: ".drop__pin",
        start: "top top",
        end: () => "+=" + dist(),
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (s) => gsap.set(".drop__progress i", { scaleX: s.progress }),
      },
    });
    cards.forEach((el) => {
      ScrollTrigger.create({ trigger: el, containerAnimation: move, start: "left 85%", onEnter: () => el.classList.add("in") });
      gsap.fromTo($("img", el), { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: el, containerAnimation: move, start: "left right", end: "right left", scrub: true } });
    });
    gsap.to(".drop__wave path", { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".drop", start: "top 60%", end: "top top", scrub: true } });
    return () => cards.forEach((el) => el.classList.remove("in"));
  });
}

// Доставка: линия маршрута заполняется по прокрутке, точки загораются
function initRoute() {
  const stops = $$(".route__stop");
  if (!stops.length) return;
  if (reduced()) return stops.forEach((s) => s.classList.add("on"));
  mm.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 901px)" }, ({ conditions: c }) => {
    if (!c.motion) return;
    const prop = c.wide ? "scaleX" : "scaleY";
    gsap.set(".route__track i", { scaleX: c.wide ? 0 : 1, scaleY: c.wide ? 1 : 0 });
    ScrollTrigger.create({
      trigger: ".route__body",
      start: "top 75%",
      end: "bottom 55%",
      scrub: true,
      onUpdate: (s) => {
        gsap.set(".route__track i", { [prop]: s.progress });
        stops.forEach((el, i) => el.classList.toggle("on", s.progress >= i / stops.length));
      },
    });
  });
  onReducedChange((r) => r && stops.forEach((s) => s.classList.add("on")));
}

// Живой шум в финальной карточке
function initNoise() {
  const cv = $("#noise");
  if (!cv) return;
  const ctx = cv.getContext("2d"), W = 160, H = 90;
  cv.width = W;
  cv.height = H;
  const img = ctx.createImageData(W, H);
  let on = false, f = 0;
  function frame() {
    const d = img.data;
    f++;
    for (let y = 0; y < H; y++) {
      const band = Math.sin(y * 0.25 + f * 0.15) * 0.5 + 0.5;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, v = Math.random() * 60 * (0.4 + band * 0.6);
        d[i] = v * 1.5;
        d[i + 1] = v * 0.55;
        d[i + 2] = v * 0.35;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    on && setTimeout(() => requestAnimationFrame(frame), 70);
  }
  new IntersectionObserver(([e]) => {
    const was = on;
    on = e.isIntersecting && !reduced();
    on && !was && frame();
  }).observe(cv);
  frame();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.from(".join__card", { y: 80, scale: 0.96, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 80%" } });
  });
}

export function initAbout() {
  initHero();
  initManifest();
  initDrop();
  initRoute();
  initNoise();
}
