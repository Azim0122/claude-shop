// Глобус в hero главной: точки суши, дуги маршрутов из городов в Фергану,
// пульсирующие кольца и HTML-подписи, привязанные к 3D-точкам.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, SphereGeometry, MeshBasicMaterial,
  BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial, PointsMaterial, Points,
  ShaderMaterial, BackSide, AdditiveBlending, Color, RingGeometry, DoubleSide,
  QuadraticBezierCurve3, Line, Vector3,
} from "three";
import { LAND } from "./land.js";
import { CITIES, HOME_CITY } from "./data.js";

const DEG = Math.PI / 180;
const toVec = (lat, lon, r = 1) =>
  new Vector3(r * Math.cos(lat * DEG) * Math.sin(lon * DEG), r * Math.sin(lat * DEG), r * Math.cos(lat * DEG) * Math.cos(lon * DEG));

// Сфера Фибоначчи из 14 000 точек, битовая маска LAND говорит, где суша
function landPoints() {
  const bits = atob(LAND);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const out = [];
  for (let n = 0; n < 14000; n++) {
    if (!(bits.charCodeAt(n >> 3) & (1 << (n & 7)))) continue;
    const lat = Math.asin(1 - (n / 13999) * 2) / DEG;
    const lon = ((((n * golden) / DEG + 180) % 360) + 360) % 360 - 180;
    const v = toVec(lat, lon, 1.004);
    out.push(v.x, v.y, v.z);
  }
  return new Float32Array(out);
}

export function createGlobe(canvas, labelsEl, { reduced }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none";
    return null;
  }
  const small = innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 2));
  renderer.setClearColor(0, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6);
  const root = new Group();
  scene.add(root);
  const globe = new Group();
  root.add(globe);
  globe.add(new Mesh(new SphereGeometry(0.995, 64, 48), new MeshBasicMaterial({ color: 0x0a0b0e })));

  // Сетка широт и долгот
  const grid = [];
  for (let lat = -60; lat <= 60; lat += 30)
    for (let i = 0; i < 96; i++) {
      const a = toVec(lat, i * 3.75, 1.001), b = toVec(lat, (i + 1) * 3.75, 1.001);
      grid.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  for (let lon = 0; lon < 360; lon += 30)
    for (let i = -24; i < 24; i++) {
      const a = toVec(i * 3.75, lon, 1.001), b = toVec((i + 1) * 3.75, lon, 1.001);
      grid.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  const gridGeo = new BufferGeometry();
  gridGeo.setAttribute("position", new Float32BufferAttribute(grid, 3));
  globe.add(new LineSegments(gridGeo, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })));

  const landGeo = new BufferGeometry();
  landGeo.setAttribute("position", new Float32BufferAttribute(landPoints(), 3));
  globe.add(new Points(landGeo, new PointsMaterial({ color: 0xf1f2ee, size: small ? 0.02 : 0.016, transparent: true, opacity: 0.92, depthWrite: false })));

  // Оранжевое свечение атмосферы
  root.add(new Mesh(
    new SphereGeometry(1.14, 64, 48),
    new ShaderMaterial({
      side: BackSide, transparent: true, blending: AdditiveBlending, depthWrite: false,
      vertexShader: "varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec3 vN;void main(){float i=pow(max(0.,.70-dot(vN,vec3(0.,0.,1.))),3.);gl_FragColor=vec4(1.,.29,.12,1.)*i*.95;}",
    }),
  ));

  const accent = new Color(0xff4b1f), white = new Color(0xffffff);
  const home = toVec(HOME_CITY.lat, HOME_CITY.lon, 1.01);
  const homeDot = new Mesh(new SphereGeometry(0.03, 16, 12), new MeshBasicMaterial({ color: white }));
  homeDot.position.copy(home);
  globe.add(homeDot);

  const rings = [];
  function ring(pos, color, k = 1) {
    const m = new Mesh(new RingGeometry(0.03 * k, 0.036 * k, 48), new MeshBasicMaterial({ color, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }));
    m.position.copy(pos);
    m.lookAt(pos.clone().multiplyScalar(2));
    globe.add(m);
    rings.push(m);
  }
  ring(home, white, 1.4);

  const routes = CITIES.map((c, i) => {
    const p = toVec(c.lat, c.lon, 1.01);
    const dot = new Mesh(new SphereGeometry(0.022, 16, 12), new MeshBasicMaterial({ color: accent }));
    dot.position.copy(p);
    globe.add(dot);
    ring(p, accent);
    const angle = p.angleTo(home);
    const mid = p.clone().add(home).multiplyScalar(0.5).normalize().multiplyScalar(1 + angle * 0.42);
    const pts = new QuadraticBezierCurve3(p, mid, home).getPoints(90);
    const geo = new BufferGeometry().setFromPoints(pts);
    geo.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.35 });
    globe.add(new Line(geo, mat));
    const runner = new Mesh(new SphereGeometry(0.016, 12, 10), new MeshBasicMaterial({ color: 0xffd1c4, transparent: true, opacity: 0 }));
    globe.add(runner);
    return { p, pts, geo, mat, runner, drawn: 0, phase: i * 0.21 };
  });

  const labels = [...CITIES.map((c) => c.name), HOME_CITY.name].map((name, i) => {
    const el = document.createElement("div");
    const isHome = i === CITIES.length;
    el.className = "gl-label" + (isHome ? " gl-label--home" : "");
    el.textContent = isHome ? "Фергана · тебе" : name;
    labelsEl.appendChild(el);
    return { el, pos: isHome ? home : routes[i].p };
  });

  let W = 1, H = 1, active = -1, dragging = false, px = 0, py = 0, vx = 0, vy = 0;
  let running = false, visible = true, raf = 0, last = performance.now(), autoSpin = true;
  let waiting = !reduced(), intro = reduced() ? 1 : 0;
  globe.rotation.set(0.35, -0.65, 0);

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const wide = W / H > 1.05;
    const dist = ((wide ? 1.08 : 1) * 1.35) / Math.tan((camera.fov * DEG) / 2) / (wide ? 1 : Math.min(1, (W / H) * 1.25));
    camera.position.z = Math.max(4.2, dist * (wide ? 0.98 : 1.02));
    const halfW = Math.tan((camera.fov * DEG) / 2) * camera.position.z * camera.aspect;
    root.position.set(wide ? halfW * 0.42 : 0, 0, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const tmp = new Vector3();
  const toCam = new Vector3();
  function placeLabels() {
    toCam.copy(camera.position).sub(root.position).normalize();
    labels.forEach((l, i) => {
      tmp.copy(l.pos);
      globe.localToWorld(tmp);
      const facing = tmp.clone().sub(root.position).normalize().dot(toCam);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      l.el.style.opacity = facing > 0.22 ? (i === active || i === CITIES.length ? 1 : active < 0 ? 0.85 : 0.45) : 0;
      l.el.classList.toggle("is-active", i === active);
    });
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (!waiting && intro < 1) intro = Math.min(1, intro + dt / 2.6);
    const e = 1 - Math.pow(1 - intro, 3);
    root.scale.setScalar(0.7 + 0.3 * e);
    if (!dragging) {
      globe.rotation.y += vx;
      globe.rotation.x += vy;
      vx *= 0.94;
      vy *= 0.94;
      if (autoSpin && Math.abs(vx) < 8e-4) globe.rotation.y -= dt * 0.09;
    }
    globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x));
    if (!waiting && intro < 1) globe.rotation.y += (1 - e) * dt * 3.2;

    routes.forEach((r, i) => {
      const target = Math.min(1, Math.max(0, (intro * 1.6 - 0.5 - i * 0.08) * 1.6));
      r.drawn += (target - r.drawn) * Math.min(1, dt * 4);
      const count = Math.floor(r.drawn * (r.pts.length - 1)) + 1;
      r.geo.setDrawRange(0, count);
      const on = active === i;
      r.mat.opacity += ((on ? 1 : active < 0 ? 0.45 : 0.16) - r.mat.opacity) * Math.min(1, dt * 6);
      const k = (t * 0.22 + r.phase) % 1;
      r.runner.position.copy(r.pts[Math.min(count - 1, Math.floor(k * (r.pts.length - 1)))]);
      r.runner.material.opacity = r.drawn > 0.95 ? (on ? 1 : 0.6) : 0;
    });
    rings.forEach((m, i) => {
      const k = (t * 0.7 + i * 0.37) % 1;
      m.scale.setScalar(1 + k * 2.2);
      m.material.opacity = (1 - k) * 0.7 * Math.min(1, intro * 2);
    });
    renderer.render(scene, camera);
    placeLabels();
    if (running) raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (running || reduced()) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  function still() {
    stop();
    intro = 1;
    routes.forEach((r) => {
      r.drawn = 1;
      r.geo.setDrawRange(0, r.pts.length);
      r.mat.opacity = 0.5;
    });
    root.scale.setScalar(1);
    renderer.render(scene, camera);
    placeLabels();
  }
  const redraw = () => reduced() && (renderer.render(scene, camera), placeLabels());

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible && !document.hidden ? start() : stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : visible && start()));

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    px = e.clientX;
    py = e.clientY;
    vx = vy = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-drag");
    api.onTouch && api.onTouch();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = (e.clientX - px) * 0.006, dy = (e.clientY - py) * 0.006;
    px = e.clientX;
    py = e.clientY;
    globe.rotation.y += dx;
    globe.rotation.x += dy;
    vx = dx * 0.6;
    vy = dy * 0.6;
    redraw();
  });
  const up = () => {
    dragging = false;
    canvas.classList.remove("is-drag");
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  const api = {
    onTouch: null,
    go() {
      waiting = false;
    },
    focus(i, gsap) {
      active = i;
      autoSpin = false;
      vx = vy = 0;
      const c = CITIES[i];
      const y0 = -c.lon * DEG;
      const x = Math.max(-0.9, Math.min(0.9, c.lat * DEG * 0.9));
      const y = y0 + Math.PI * 2 * Math.round((globe.rotation.y - y0) / (Math.PI * 2));
      if (reduced()) {
        globe.rotation.set(x, y, 0);
        redraw();
      } else gsap.to(globe.rotation, { x, y, duration: 1.6, ease: "expo.out" });
    },
    setReduced(r) {
      r ? still() : start();
    },
  };
  reduced() ? still() : start();
  return api;
}
