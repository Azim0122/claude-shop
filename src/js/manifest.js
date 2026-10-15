import { gsap, ScrollTrigger, $, $$, mm, splitWords } from "./core.js";

/* ---------- Манифест: слова «зажигаются» по мере прокрутки ---------- */
export function initManifest() {
  const el = $("#manifest");
  if (!el) return;
  splitWords(el, "words");
  const words = $$(".mw", el);
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    ScrollTrigger.create({
      trigger: ".manifest",
      start: "top 70%",
      end: "bottom 60%",
      scrub: true,
      onUpdate: (s) => {
        const k = Math.round(s.progress * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < k));
      },
    });
    gsap.fromTo(".manifest__img img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".manifest", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(".stitch path", { strokeDashoffset: 400 }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".stitch", start: "top 90%", end: "top 50%", scrub: true } });
  });
}
