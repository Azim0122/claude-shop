// 3D-кольцо лукбука: вращается само, тянется мышью/пальцем, стрелками
// с клавиатуры, наклоняется при въезде в экран и разгоняется от скорости прокрутки.
import { gsap, ScrollTrigger, $, $$, reduced, setImg } from "./core.js";

export function createRing(stage, items) {
  const ring = $(".look__ring", stage);
  const cap = stage.parentElement.querySelector(".look__caption");
  let figs = [], n = 0, radius = 0;
  let angle = 0, vel = 0, drag = false, lastX = 0, visible = false, raf = 0, shown = -1;
  const tilt = { v: -6 };

  function build(list) {
    items = list;
    n = items.length;
    shown = -1;
    ring.innerHTML = items.map(([, label]) => `<figure class="look__item"><img alt="${label}" draggable="false"></figure>`).join("");
    figs = $$(".look__item", ring);
    figs.forEach((f, i) => setImg($("img", f), items[i][0], 600));
    layout();
    draw();
  }
  function layout() {
    const w = Math.max(150, Math.min(280, innerWidth * 0.2));
    radius = Math.round((w * 1.08 * n) / (2 * Math.PI));
    figs.forEach((f, i) => {
      f.style.setProperty("--w", w + "px");
      f.dataset.a = (360 / n) * i;
    });
  }
  function draw() {
    const lift = radius * Math.sin((-tilt.v * Math.PI) / 180);
    ring.style.transform = `translateY(${-lift}px) translateZ(${-radius}px) rotateX(${tilt.v}deg) rotateY(${angle}deg)`;
    let best = 0, max = -2;
    figs.forEach((f, i) => {
      const a = +f.dataset.a;
      f.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
      const c = Math.cos(((a + angle) * Math.PI) / 180);
      f.style.filter = `brightness(${(0.3 + 0.7 * Math.max(0, c)).toFixed(2)})`;
      if (c > max) {
        max = c;
        best = i;
      }
    });
    if (best !== shown && cap) {
      shown = best;
      cap.textContent = `${String(best + 1).padStart(2, "0")} · ${items[best][1]}`;
    }
  }
  function loop() {
    if (!drag) {
      vel *= 0.95;
      angle += vel + (reduced() ? 0 : -0.06);
    }
    draw();
    if (visible) raf = requestAnimationFrame(loop);
  }

  addEventListener("resize", layout);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) raf = requestAnimationFrame(loop);
  }).observe(stage);
  stage.addEventListener("pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    vel = 0;
    stage.classList.add("is-drag");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const d = (e.clientX - lastX) * 0.25;
    angle += d;
    vel = d;
    lastX = e.clientX;
  });
  const up = () => {
    drag = false;
    stage.classList.remove("is-drag");
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.tabIndex = 0;
  stage.setAttribute("role", "region");
  stage.setAttribute("aria-label", "Лукбук, стрелки влево и вправо вращают кольцо");
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") vel = 4;
    if (e.key === "ArrowRight") vel = -4;
  });
  if (!reduced()) {
    gsap.fromTo(tilt, { v: -35 }, { v: -6, ease: "none", scrollTrigger: { trigger: stage, start: "top bottom", end: "center center", scrub: true } });
    ScrollTrigger.create({ trigger: stage, start: "top bottom", end: "bottom top", onUpdate: (s) => (vel += s.getVelocity() * -4e-5) });
  }
  build(items);

  return {
    // Смена набора фото с «вспышкой»: кольцо сжимается, меняется и раскрывается
    swap(list) {
      if (reduced()) return build(list);
      gsap.timeline()
        .to(stage, { opacity: 0, scale: 0.85, duration: 0.35, ease: "power2.in" })
        .add(() => {
          build(list);
          vel = -6;
        })
        .to(stage, { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out", clearProps: "scale" });
    },
  };
}
