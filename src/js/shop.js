// Карточки товаров, корзина, быстрый просмотр, таблица размеров и заказ в Telegram.
import Swiper from "swiper";
import { Pagination, Keyboard } from "swiper/modules";
import { gsap, ScrollTrigger, $, $$, reduced, finePointer, store, setImg, toast, lock, closeMenu, scrollToEl } from "./core.js";
import { PRODUCTS, byId, fullName, rub, priceText, px } from "./data.js";

const ICON_TG =
  '<svg class="tgi" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 3.5 2.8 10.7c-1 .4-1 1.8.1 2.1l4.6 1.4 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.6 3.4c.8.6 1.9.1 2.1-.8L23 4.9c.2-1-.7-1.8-1.5-1.4Z"/></svg>';
const ICON_BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2L5 8zM9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
export const ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
export { ICON_TG };

export const productUrl = (p) => `product.html?id=${p.id}`;

/* ---------- Карточка ---------- */
export function cardHTML(p) {
  const sizes =
    p.sizes.length > 1
      ? `<div class="card__sizes"><p class="mono">В корзину, размер:</p>${p.sizes.map((s) => `<button data-qsize="${s}" aria-label="Добавить размер ${s}">${s}</button>`).join("")}</div>`
      : "";
  return `<article class="card" data-id="${p.id}" data-cat="${p.cat}" data-g="${p.g}" data-brand="${p.brand}">
    <div class="card__media" data-view role="button" tabindex="0" aria-label="Подробнее: ${fullName(p)}">
      ${p.tag ? `<span class="card__tag ${p.hot ? "card__tag--hot" : ""}">${p.tag}</span>` : ""}
      <img class="main" alt="${fullName(p)}, ${p.color}" loading="lazy" decoding="async">
      ${p.img[1] ? '<img class="alt" alt="" loading="lazy" decoding="async">' : ""}
      <span class="card__glare" aria-hidden="true"></span>${sizes}
    </div>
    <div class="card__info">
      <div>${p.brand ? `<p class="card__brand mono">${p.brand}</p>` : ""}<h3 class="card__name"><a href="${productUrl(p)}">${p.name}</a></h3><p class="card__cat">${p.color}</p></div>
      <span class="card__price">${p.from ? "<small>от</small>" : ""}${rub(p.price)}</span>
    </div>
    <div class="card__act">
      <button class="card__order" data-order aria-label="Заказать ${fullName(p)} в Telegram">${ICON_TG}<span>Заказать</span></button>
      <button class="card__cart" data-quick aria-label="Добавить ${fullName(p)} в корзину">${ICON_BAG}</button>
    </div>
  </article>`;
}
export function hydrateCards(root = document) {
  $$(".card", root).forEach((el) => {
    if (el.dataset.ready) return;
    el.dataset.ready = "1";
    const p = byId(el.dataset.id), main = $("img.main", el), alt = $("img.alt", el);
    setImg(main, p.img[0], 700);
    if (alt) {
      alt.src = px(p.img[1], 700);
      alt.addEventListener("error", () => alt.remove(), { once: true });
    }
  });
}

/* ---------- Telegram ---------- */
const TG = (document.body.dataset.tg || "claudeshop").replace(/^@/, "").trim();
export const ASK_TEXT = "Здравствуйте! Ищу вещь под заказ. Пришлю фото или ссылку:";
function line(item, n) {
  const p = byId(item.id);
  const size = item.size ? (p.sizes.length === 1 ? p.sizes[0] : "размер " + item.size) : "размер уточню";
  return `${n}. ${fullName(p)} (${p.color}), ${size}, ${item.qty} шт., ${priceText(p)}${item.qty > 1 && !p.from ? " за шт." : ""}`;
}
export function orderText(items) {
  if (!items.length) return "Здравствуйте! Хочу заказать вещь, помогите подобрать.";
  const sum = items.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
  const from = items.some((i) => byId(i.id).from);
  return ["Здравствуйте! Хочу заказать:", "", ...items.map((it, k) => line(it, k + 1)), "", `Итого на сайте: ${from ? "от " : ""}${rub(sum)}`, "", "Заказ с сайта CLAUDE SHOP"].join("\n");
}
export function openTelegram(text) {
  const url = `https://t.me/${TG}?text=${encodeURIComponent(text)}`;
  try {
    navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {});
  } catch {}
  toast("Открываем Telegram. Текст заказа уже скопирован");
  // Ссылка с target=_blank: сайт остаётся на месте, Telegram открывается отдельно.
  // (window.open с noopener всегда возвращает null, из-за этого раньше
  // уходила и сама вкладка сайта, а при возврате висела шторка.)
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------- Корзина ---------- */
const KEY = "claude-cart-v3";
export const cart = { items: store.get(KEY, []).filter((i) => byId(i.id)) };
const save = () => store.set(KEY, cart.items);
const cartListeners = [];
export const onCartChange = (fn) => cartListeners.push(fn);
const onlySize = (p) => (p.sizes.length === 1 ? p.sizes[0] : null);

let drawer;
function openCart() {
  $("#toast").classList.remove("show");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  lock("cart", true);
  setTimeout(() => $(".drawer__head .round").focus(), 300);
}
function closeCart() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  lock("cart", false);
}

export function addToCart(id, size, fromEl) {
  const p = byId(id);
  size = size || onlySize(p);
  const same = cart.items.find((i) => i.id === id && i.size === size);
  same ? same.qty++ : cart.items.push({ id, size, qty: 1 });
  save();
  renderCart();
  if (fromEl && !reduced()) flyToCart(fromEl, p);
  const count = $("#cartCount");
  count.classList.remove("bump");
  void count.offsetWidth;
  count.classList.add("bump");
  if (!drawer.classList.contains("is-open"))
    toast(`${fullName(p)} в корзине${size ? (p.sizes.length > 1 ? ", размер " + size : "") : ". Размер выберешь в корзине"}`);
}
function flyToCart(from, p) {
  const a = from.getBoundingClientRect(), b = $("#cartBtn").getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "fly";
  el.innerHTML = `<img src="${px(p.img[0], 200)}" alt="">`;
  document.body.appendChild(el);
  gsap.set(el, { x: a.left + a.width / 2 - 35, y: a.top + a.height / 2 - 45 });
  gsap.timeline({ onComplete: () => el.remove() })
    .to(el, { x: b.left + b.width / 2 - 35, duration: 0.9, ease: "power2.inOut" }, 0)
    .to(el, { y: b.top - 30, duration: 0.9, ease: "back.in(1.2)" }, 0)
    .to(el, { scale: 0.2, opacity: 0, rotate: 20, duration: 0.35, ease: "power2.in" }, 0.6);
}

export function renderCart() {
  const list = $("#cartList");
  const qty = cart.items.reduce((s, i) => s + i.qty, 0);
  const sum = cart.items.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
  const from = cart.items.some((i) => byId(i.id).from);
  $("#cartCount").textContent = qty;
  const fab = $("#fabCount");
  fab.textContent = qty;
  fab.classList.toggle("zero", !qty);
  $("#cartTotal").textContent = (from ? "от " : "") + rub(sum);
  $$("[data-cart-hint]").forEach(
    (el) => (el.textContent = qty ? `В корзине ${qty} шт. на ${from ? "от " : ""}${rub(sum)}. Всё уйдёт одним сообщением` : "Корзина пуста? Просто напиши, что ищешь"),
  );
  list.innerHTML = cart.items.length
    ? cart.items
        .map((it, k) => {
          const p = byId(it.id);
          const size =
            p.sizes.length === 1
              ? `<p>${p.sizes[0]}</p>`
              : `<label class="ci__size"><span class="sr">Размер</span><select data-size>${it.size ? "" : '<option value="" selected>Размер?</option>'}${p.sizes.map((s) => `<option ${s === it.size ? "selected" : ""}>${s}</option>`).join("")}</select></label>`;
          return `<li class="ci" data-k="${k}"><a class="ci__img" href="${productUrl(p)}"><img src="${px(p.img[0], 200)}" alt=""></a>
      <div><h4>${fullName(p)}</h4><p>${p.color}</p>${size}<div class="qty"><button data-q="-1" aria-label="Меньше">−</button><span>${it.qty}</span><button data-q="1" aria-label="Больше">+</button></div></div>
      <div class="ci__price">${p.from ? "от " : ""}${rub(p.price * it.qty)}<button class="ci__rm" data-rm>Убрать</button></div></li>`;
        })
        .join("")
    : '<li class="drawer__empty">Пока пусто. Загляни в <a href="index.html#catalog" data-go style="text-decoration:underline">каталог</a> или напиши нам, что ищешь.</li>';
  $("#msgWrap").hidden = !cart.items.length;
  $("#msgPreview").textContent = orderText(cart.items);
  $("#checkout span").textContent = cart.items.length ? "Заказать в Telegram" : "Написать в Telegram";
  cartListeners.forEach((fn) => fn());
}

function initCart() {
  drawer = $("#drawer");
  $("#cartBtn").addEventListener("click", openCart);
  $$("[data-close]", drawer).forEach((b) => b.addEventListener("click", closeCart));
  $("#cartList").addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) {
      const cat = $("#catalog");
      if (cat) {
        e.preventDefault();
        e.stopPropagation();
        closeCart();
        scrollToEl(cat);
      } else closeCart();
      return;
    }
    const row = e.target.closest(".ci");
    if (!row) return;
    const it = cart.items[+row.dataset.k];
    const q = e.target.closest("[data-q]");
    if (q) {
      it.qty += +q.dataset.q;
      if (it.qty < 1) cart.items.splice(+row.dataset.k, 1);
    } else if (e.target.closest("[data-rm]")) cart.items.splice(+row.dataset.k, 1);
    else return;
    save();
    renderCart();
  });
  $("#cartList").addEventListener("change", (e) => {
    const sel = e.target.closest("[data-size]");
    if (!sel) return;
    const k = +sel.closest(".ci").dataset.k, it = cart.items[k];
    const twin = cart.items.find((o, j) => j !== k && o.id === it.id && o.size === sel.value);
    if (twin) {
      twin.qty += it.qty;
      cart.items.splice(k, 1);
    } else it.size = sel.value;
    save();
    renderCart();
  });
  renderCart();
}

/* ---------- Быстрый просмотр ---------- */
let qv, qvSwiper = null, current = null, chosen = null, returnFocus = null;
export function openQuick(id) {
  const p = byId(id);
  current = p;
  chosen = onlySize(p);
  returnFocus = document.activeElement;
  $("#qvCat").textContent = (p.brand || "Под заказ") + (p.tag ? " · " + p.tag : "");
  $("#qvTitle").textContent = p.name;
  $("#qvPrice").textContent = priceText(p) + " · " + p.color;
  $("#qvDesc").textContent = p.desc;
  $("#qvLabel").textContent = p.cat === "shoes" ? "Размер, EU" : "Размер";
  $("#qvSizes").innerHTML = p.sizes.map((s) => `<button class="size ${chosen === s ? "is-on" : ""}">${s}</button>`).join("");
  $("#qvSlides").innerHTML = p.img.map((i) => `<div class="swiper-slide"><img src="${px(i, 1000)}" alt="${fullName(p)}"></div>`).join("");
  $("#qvPage").href = productUrl(p);
  qvSwiper && qvSwiper.destroy(true, true);
  qvSwiper = new Swiper(".qv__swiper", { modules: [Pagination, Keyboard], speed: 700, grabCursor: true, keyboard: { enabled: true }, pagination: { el: ".qv__pag", clickable: true } });
  $(".qv__pag").style.display = p.img.length > 1 ? "" : "none";
  qv.classList.add("is-open");
  qv.setAttribute("aria-hidden", "false");
  lock("qv", true);
  setTimeout(() => $(".qv__x", qv).focus(), 200);
}
function closeQuick() {
  qv.classList.remove("is-open");
  qv.setAttribute("aria-hidden", "true");
  lock("qv", false);
  returnFocus && returnFocus.focus && returnFocus.focus();
}
export function needSize(box, hasSize) {
  if (hasSize) return false;
  box.classList.remove("need");
  void box.offsetWidth;
  box.classList.add("need");
  toast("Сначала выбери размер");
  return true;
}
function initQuick() {
  qv = $("#qv");
  $$("[data-qclose]", qv).forEach((b) => b.addEventListener("click", closeQuick));
  $("#qvSizes").addEventListener("click", (e) => {
    const b = e.target.closest(".size");
    if (!b) return;
    $$(".size", qv).forEach((x) => x.classList.toggle("is-on", x === b));
    chosen = b.textContent;
  });
  $("#qvAdd").addEventListener("click", () => {
    if (needSize($("#qvSizes"), chosen)) return;
    addToCart(current.id, chosen, $("#qvAdd"));
    closeQuick();
  });
  $("#qvOrder").addEventListener("click", () => {
    if (needSize($("#qvSizes"), chosen)) return;
    openTelegram(orderText([{ id: current.id, size: chosen, qty: 1 }]));
  });
}

/* ---------- Таблица размеров ---------- */
let sg;
export function openSizes(tab) {
  sg.classList.add("is-open");
  sg.setAttribute("aria-hidden", "false");
  lock("sg", true);
  const shoes = (current && qv.classList.contains("is-open") && current.cat === "shoes") || document.body.dataset.shoes === "1";
  sizeTab(tab || (shoes ? "shoes" : "wear"));
  setTimeout(() => $(".qv__x", sg).focus(), 200);
}
function closeSizes() {
  sg.classList.remove("is-open");
  sg.setAttribute("aria-hidden", "true");
  lock("sg", false);
}
function sizeTab(t) {
  $$("[data-sgtab]", sg).forEach((b) => {
    b.classList.toggle("is-on", b.dataset.sgtab === t);
    b.setAttribute("aria-selected", String(b.dataset.sgtab === t));
  });
  $$("[data-sgp]", sg).forEach((p) => (p.hidden = p.dataset.sgp !== t));
}
function initSizes() {
  sg = $("#sg");
  $$("[data-sgtab]", sg).forEach((b) => b.addEventListener("click", () => sizeTab(b.dataset.sgtab)));
  $$("[data-sgclose]", sg).forEach((b) => b.addEventListener("click", closeSizes));
}

/* ---------- Делегирование кликов и клавиш ---------- */
// Swiper в процессе перетаскивания запрещает клик; страницы регистрируют свои слайдеры
const swipers = [];
export const registerSwiper = (s) => swipers.push(s);

function initDelegation() {
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-tg-ask]")) {
      e.preventDefault();
      closeMenu();
      closeSizes();
      const brand = t.closest("[data-tg-ask]").dataset.tgAsk;
      openTelegram(brand ? `Здравствуйте! Ищу вещь ${brand}. Пришлю фото или ссылку:` : ASK_TEXT);
      return;
    }
    if (t.closest("[data-tg-cart]")) {
      e.preventDefault();
      openTelegram(orderText(cart.items));
      return;
    }
    if (t.closest("[data-sg-open]")) {
      e.preventDefault();
      openSizes(t.closest("[data-sg-open]").dataset.sgOpen);
      return;
    }
    const qs = t.closest("[data-qsize]");
    if (qs) {
      e.stopPropagation();
      const card = qs.closest(".card");
      addToCart(card.dataset.id, qs.dataset.qsize, qs);
      const btn = $("[data-quick]", card);
      btn.classList.add("added");
      setTimeout(() => btn.classList.remove("added"), 1200);
      return;
    }
    const order = t.closest("[data-order]");
    if (order) {
      openTelegram(orderText([{ id: order.closest(".card").dataset.id, size: null, qty: 1 }]));
      return;
    }
    const quick = t.closest("[data-quick]");
    if (quick) {
      addToCart(quick.closest(".card").dataset.id, null, quick);
      quick.classList.add("added");
      setTimeout(() => quick.classList.remove("added"), 1200);
      return;
    }
    const view = t.closest(".card [data-view]");
    if (view && swipers.every((s) => s.allowClick !== false)) openQuick(view.closest(".card").dataset.id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sg.classList.contains("is-open")) closeSizes();
      else if (qv.classList.contains("is-open")) closeQuick();
      else if (drawer.classList.contains("is-open")) closeCart();
      else closeMenu();
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".card [data-view]")) {
      e.preventDefault();
      openQuick(e.target.closest(".card").dataset.id);
    }
  });
}

/* ---------- Наклон карточек за курсором ---------- */
function initTilt() {
  if (!finePointer) return;
  document.addEventListener("pointermove", (e) => {
    const m = e.target.closest && e.target.closest(".card__media");
    if (!m || reduced()) return;
    const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    m.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 9}deg) rotateX(${(0.5 - y) * 9}deg)`;
    m.style.setProperty("--gx", x * 100 + "%");
    m.style.setProperty("--gy", y * 100 + "%");
  }, { passive: true });
  document.addEventListener("pointerout", (e) => {
    const m = e.target.closest && e.target.closest(".card__media");
    if (m && !m.contains(e.relatedTarget)) gsap.to(m, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "elastic.out(1,.5)", clearProps: "transform" });
  });
}

/* ---------- Плавающая кнопка заказа ---------- */
function initFab() {
  const fab = $("#fab");
  const update = () => {
    const past = scrollY > innerHeight * 0.7;
    const hide = $$("[data-fab-hide]").some((el) => {
      const r = el.getBoundingClientRect();
      return r.top < innerHeight * 0.6 && r.bottom > 0;
    });
    fab.classList.toggle("show", past && !hide);
  };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: update });
  addEventListener("scroll", update, { passive: true });
}

export function initShop() {
  initCart();
  initQuick();
  initSizes();
  initDelegation();
  initTilt();
  initFab();
}
export { PRODUCTS };
