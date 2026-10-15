// Бегущие ленты. Разметка: <div class="tape" data-words="Nike|Jordan" data-pics="4277507|2225727" data-dir="-1">.
// Слова чередуются заливкой и контуром, между ними вращающиеся звёзды и фото-капсулы.
// Лента разгоняется от скорости прокрутки и меняет направление вместе с ней,
// при наведении плавно замедляется почти до остановки.
import { gsap, ScrollTrigger, $$, reduced, finePointer } from "./core.js";
import { px } from "./data.js";

const STAR = '<svg class="tape__star" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 0l4.2 14.2L38 8.6 27.6 20 38 31.4l-13.8-5.6L20 40l-4.2-14.2L2 31.4 12.4 20 2 8.6l13.8 5.6z"/></svg>';

function chunk(words, pics) {
  return words
    .map((w, i) => {
      const pic = pics.length ? `<span class="tape__pic"><img src="${px(pics[i % pics.length], 240)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : "";
      return `<span class="tape__w${i % 2 ? " is-out" : ""}">${w}</span>${i % 2 ? pic : STAR}`;
    })
    .join("");
}

export function initTapes() {
  const tapes = $$(".tape[data-words]");
  if (!tapes.length) return;
  const loops = [];
  tapes.forEach((tape) => {
    const words = tape.dataset.words.split("|").map((s) => s.trim()).filter(Boolean);
    const pics = (tape.dataset.pics || "").split("|").filter(Boolean);
    const dir = +(tape.dataset.dir || -1);
    const track = document.createElement("div");
    track.className = "tape__track";
    const half = document.createElement("div");
    half.className = "tape__half";
    half.innerHTML = chunk(words, pics);
    track.appendChild(half);
    tape.innerHTML = "";
    tape.appendChild(track);
    // Половина ленты должна быть шире экрана, иначе будет видна «дырка»
    let guard = 0;
    while (half.scrollWidth < innerWidth * 1.4 && guard++ < 8) half.innerHTML += chunk(words, pics);
    track.appendChild(half.cloneNode(true));

    if (reduced()) return;
    const loop = { tape, track, half, dir, x: 0, v: 1, hover: 1, w: half.offsetWidth, pps: +(tape.dataset.speed || 90), on: true };
    loops.push(loop);
    if (finePointer) {
      tape.addEventListener("pointerenter", () => gsap.to(loop, { hover: 0.12, duration: 0.8, ease: "power3.out" }));
      tape.addEventListener("pointerleave", () => gsap.to(loop, { hover: 1, duration: 0.8, ease: "power3.out" }));
    }
    // Не крутим ленты, которых не видно
    new IntersectionObserver(([e]) => (loop.on = e.isIntersecting)).observe(tape);
  });
  if (!loops.length) return;
  addEventListener("resize", () => loops.forEach((l) => (l.w = l.half.offsetWidth)));
  const remeasure = () => loops.forEach((l) => (l.w = l.half.offsetWidth));
  addEventListener("load", remeasure);
  document.fonts && document.fonts.ready.then(remeasure);

  // Скорость прокрутки → ускорение, направление прокрутки → направление лент
  let boost = 0, sign = 1;
  ScrollTrigger.create({
    onUpdate: (s) => {
      const v = s.getVelocity();
      sign = s.direction;
      boost = Math.max(boost, Math.min(6, Math.abs(v) / 400));
    },
  });
  gsap.ticker.add((_, dtMs) => {
    const dt = Math.min(dtMs, 50) / 1000;
    boost *= 0.92;
    loops.forEach((l) => {
      if (!l.on || !l.w) return;
      const target = sign * (1 + boost) * l.hover;
      l.v += (target - l.v) * 0.12;
      const w = l.w;
      l.x = (((l.x + l.dir * l.v * l.pps * dt) % w) - w) % w; // всегда в диапазоне (-w, 0]
      l.track.style.transform = `translate3d(${l.x.toFixed(2)}px,0,0)`;
      l.tape.style.setProperty("--skew", `${gsap.utils.clamp(-8, 8, -boost * sign * l.dir * 2.2).toFixed(2)}deg`);
    });
  });
}
