// Точка входа: общее ядро и магазин, затем модуль текущей страницы (body[data-page]).
// Каждый шаг в своём try: если в одном блоке что-то сломается, страница всё равно
// откроется (лоадер и шторка уйдут), а не зависнет на «CLAUDE SHOP».
import { initCore, boot, $$, setImg } from "./core.js";
import { initShop } from "./shop.js";
import { initHome } from "./home.js";
import { initAbout } from "./about.js";
import { initBrands } from "./brands.js";
import { initProduct } from "./product.js";
import { initTapes } from "./tape.js";

const pages = { home: initHome, about: initAbout, brands: initBrands, product: initProduct };
const safe = (name, fn) => {
  try {
    fn();
  } catch (e) {
    console.error(`[CLAUDE SHOP] ${name}:`, e);
  }
};

safe("images", () => $$("img[data-px]").forEach((img) => setImg(img, img.dataset.px, 1100)));
safe("shop", initShop);
safe("page", pages[document.body.dataset.page] || (() => {}));
safe("core", initCore);
safe("tapes", initTapes);
boot();
