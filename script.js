(() => {
  "use strict";

  /*
    KAPENG BARAKO — STOREFRONT INTERACTIONS
    GitHub Pages / localStorage version
  */

  const CART_KEY = "kb_cart";
  const ORDER_KEY = "kb_orders";
  const PRODUCT_KEY = "kb_rebuild_products";
  const GALLERY_KEY = "kb_gallery";
  const REVIEWS_KEY = "kb_reviews";
  const CMS_KEY = "kb_cms";
  const SHIPPING_KEY = "kb_shipping_rule";
  const PROMO_KEY = "kb_promos";
  const ADS_KEY = "kb_ads";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const money = value =>
    "₱" + Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  // Production-only catalog: Admin is the sole source of product records.
  // Never seed demo/default products when the catalog is empty.
  const getProducts = () => {
    const saved = read(PRODUCT_KEY, []);
    return Array.isArray(saved) ? saved : [];
  };

  // Production-only gallery: Admin is the sole source of gallery records.
  // Empty gallery means empty slots; never seed demo artwork.
  const getGallery = () => {
    const saved = read(GALLERY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  };

  let catalogChannel=null;
  try{
    if("BroadcastChannel" in window){
      catalogChannel=new BroadcastChannel("kapeng-barako-catalog");
      catalogChannel.addEventListener("message",event=>{
        if(event.data?.type==="products-updated"){
          renderProducts();
          renderFeaturedProduct();
          syncSubscriptionProducts();
          renderCart();
        }
      });
    }
  }catch{}

  let centralOrderModulePromise = null;

  async function createBackendOrder(payload) {
    centralOrderModulePromise ||= import("./js/firebase-backend.js");
    const backend = await centralOrderModulePromise;
    return backend.createCentralOrder(payload);
  }

  let cart = read(CART_KEY, []);
  if (!Array.isArray(cart)) cart = [];

  let brewSeconds = 180;
  let brewTimer = null;
  let brewLastTick = 0;

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(window.__kbToastTimer);
    window.__kbToastTimer = setTimeout(() => {
      element.classList.remove("show");
    }, 2200);
  }

  function lockBody(locked) {
    document.body.classList.toggle("no-scroll", locked);
  }

  function openBox(id) {
    const element = $(id);
    if (!element) return false;
    element.hidden = false;
    lockBody(true);
    return true;
  }

  function closeBox(id) {
    const element = $(id);
    if (!element) return;
    element.hidden = true;
    if (!$("#cartModal") || $("#cartModal").hidden) {
      if (!$("#trackModal") || $("#trackModal").hidden) {
        lockBody(false);
      }
    }
  }

  function cartCount() {
    return cart.reduce((total, item) => total + Math.max(0, Number(item.qty || 0)), 0);
  }

  function cartTotal() {
    const products = getProducts();
    return cart.reduce((total, item) => {
      const product = products.find(candidate => String(candidate.id) === String(item.id));
      if (!product) return total;
      return total + Number(product.price || 0) * Math.max(0, Number(item.qty || 0));
    }, 0);
  }

  function updateCartCounters() {
    const count = cartCount();
    ["#cartCount", "#heroCartCount"].forEach(selector => {
      const element = $(selector);
      if (element) element.textContent = count;
    });
    const total = $("#cartTotal");
    if (total) total.textContent = money(cartTotal());
  }

  function renderCart() {
    const products = getProducts();
    let cartChanged = false;

    cart = cart.filter(item => {
      const product = products.find(p => String(p.id) === String(item.id));
      if (!product) {
        cartChanged = true;
        return false;
      }

      const stock = Math.max(0, Number(product.stock || 0));
      if (stock <= 0) {
        cartChanged = true;
        return false;
      }

      const latestQty = Math.min(Math.max(1, Number(item.qty || 1)), stock);
      const latest = {
        ...item,
        name: product.name,
        size: product.size,
        price: Number(product.price || 0),
        qty: latestQty
      };

      if (
        item.name !== latest.name ||
        item.size !== latest.size ||
        Number(item.price || 0) !== latest.price ||
        Number(item.qty || 1) !== latest.qty
      ) {
        cartChanged = true;
      }

      Object.assign(item, latest);
      return true;
    });

    if (cartChanged) write(CART_KEY, cart);

    updateCartCounters();

    const root = $("#cartItems");
    const checkout = $("#checkoutButton");
    if (!root) return;

    if (!cart.length) {
      root.innerHTML =
        '<div class="empty">Your cart is empty. Choose a Barako coffee to begin.</div>';
      if (checkout) checkout.disabled = true;
      return;
    }

    if (checkout) checkout.disabled = false;

    root.innerHTML = cart.map((item, index) => {
      const qty = Math.max(1, Number(item.qty || 1));
      return (
        '<div class="cart-item">' +
          '<div>' +
            '<h3>' + esc(item.name) + '</h3>' +
            '<small>' +
              esc(item.size || "") + " • " +
              esc(item.roast || "Dark") + " Roast • " +
              esc(item.grind || "Whole") + " Grind" +
            '</small>' +
            '<div class="qty">' +
              '<button type="button" data-minus="' + index + '" aria-label="Decrease quantity">−</button>' +
              '<span>' + qty + '</span>' +
              '<button type="button" data-plus="' + index + '" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<button class="remove-item" type="button" data-remove="' + index + '">REMOVE</button>' +
          '</div>' +
          '<strong class="cart-price">' +
            money(Number(item.price || 0) * qty) +
          '</strong>' +
        '</div>'
      );
    }).join("");
  }

  function renderContactInfo() {
    const settings = {
      businessName: "", email: "", phone: "", location: "", facebook: "", messenger: "", hours: "",
      ...(read("kb_settings", {}) || {})
    };
    const block = $("#footerContactBlock");
    const business = $("[data-kb-business-name]");
    const email = $("[data-kb-email]");
    const phone = $("[data-kb-phone]");
    const location = $("[data-kb-location]");
    const hours = $("[data-kb-hours]");
    const emailLink = $("[data-kb-email-link]");
    const phoneLink = $("[data-kb-phone-link]");
    const facebook = $("[data-kb-facebook]");
    const messenger = $("[data-kb-messenger]");
    if (business) { business.textContent = settings.businessName || ""; business.hidden = !settings.businessName; }
    if (emailLink) { emailLink.hidden = !settings.email; emailLink.href = settings.email ? "mailto:" + settings.email : "pages/contact.html"; }
    if (email) email.textContent = settings.email || "";
    if (phoneLink) { phoneLink.hidden = !settings.phone; phoneLink.href = settings.phone ? "tel:" + settings.phone.replace(/[^+\d]/g, "") : "pages/contact.html"; }
    if (phone) phone.textContent = settings.phone || "";
    if (location) { location.textContent = settings.location || ""; location.hidden = !settings.location; }
    if (hours) { hours.textContent = settings.hours || ""; hours.hidden = !settings.hours; }
    if (facebook) { facebook.hidden = !settings.facebook; facebook.href = settings.facebook || "#"; }
    if (messenger) { messenger.hidden = !settings.messenger; messenger.href = settings.messenger || "#"; }
    if (block) block.hidden = !(settings.businessName || settings.email || settings.phone || settings.location || settings.hours || settings.facebook || settings.messenger);
    const copyrightLocation = $("#footerCopyrightLocation");
    if (copyrightLocation) copyrightLocation.textContent = settings.location ? " — " + settings.location : "";
  }

  function renderAdvertisement() {
    const root = $("#storefront-ad");
    if (!root) return;

    const data = read(ADS_KEY, { link: "", image: "", label: "" }) || {};
    const link = String(data.link || "").trim();
    const savedImage = String(data.image || "").trim();
    const image = savedImage || (/^https?:\/\/.*\.(?:avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i.test(link) ? link : "");
    const label = String(data.label || "Sponsored").trim() || "Sponsored";

    const title = $("#storefront-ad-title");
    const copy = $("#storefront-ad-copy");
    const open = $("#storefront-ad-open");
    const imageEl = $("#storefront-ad-image");

    const hasAd = Boolean(link || image);
    root.classList.toggle("has-link", hasAd);

    if (title) title.textContent = hasAd ? label : "Advertisement";
    if (copy) {
      copy.textContent = hasAd
        ? "Sponsored placement"
        : "Advertisement space";
    }

    if (imageEl) {
      imageEl.hidden = !image;
      imageEl.src = image || "";
      imageEl.alt = label + " advertisement";
      imageEl.onerror = () => {
        imageEl.hidden = true;
      };
    }

    if (open) {
      open.hidden = !link;
      open.href = link || "#";
      open.setAttribute("aria-label", link ? "Open advertisement" : "Advertisement not configured");
    }
  }

  function renderGallery() {
    const items = getGallery();
    const figures = Array.from(document.querySelectorAll("#mainGalleryGrid [data-gallery-slot]"));
    figures.forEach((figure, index) => {
      const item = items[index] || {};
      const image = $("img", figure);
      const caption = $("figcaption", figure);
      const hasImage = Boolean(String(item.image || "").trim());
      figure.classList.toggle("is-empty", !hasImage);
      if (image) {
        image.src = hasImage ? item.image : "";
        image.alt = item.alt || item.title || "Gallery image";
        image.hidden = !hasImage;
      }
      if (caption) {
        caption.textContent = String(index + 1).padStart(2, "0") + (item.title ? " · " + String(item.title).toUpperCase() : "");
      }
    });
  }

  function renderAnnouncement() {
    const bar = $("#kbAnnouncementBar");
    const primary = $("#kbAnnouncementPrimary");
    const secondary = $("#kbAnnouncementSecondary");
    if (!bar) return;
    const cms = read(CMS_KEY, {});
    const announcement = cms && typeof cms === "object" && cms.announcement ? cms.announcement : {};
    const title = String(announcement.title || "").trim();
    const body = String(announcement.body || "").trim();
    const message = [title, body].filter(Boolean).join(" • ");
    let closed = false;
    try { closed = sessionStorage.getItem("kb_announcement_closed") === "1"; } catch {}
    const visible = Boolean(message) && !closed;
    bar.hidden = !visible;
    bar.classList.toggle("is-closed", !visible);
    document.body.classList.toggle("kb-announcement-visible", visible);
    if (primary) primary.textContent = visible ? message : "";
    if (secondary) secondary.textContent = visible ? message : "";
  }

  function renderFeaturedProduct() {
    const products = getProducts();
    const product = products.find(item => item.featured === true) || products[0];
    const card = $(".featured-card");
    if (!card) return;
    card.hidden = !product;
    if (!product) return;
    const name = $("#featuredProductName");
    const meta = $("#featuredProductMeta");
    const price = $("#featuredProductPrice");
    const image = $("#featuredProductImage");
    const fallback = $("#featuredProductFallback");
    if (name) name.textContent = product.name || "";
    const metaParts = [product.roastLevel || product.roast, product.size || product.netWeight].filter(Boolean);
    if (meta) meta.textContent = metaParts.join(" • ") || "Catalog details";
    if (price) price.textContent = money(product.price);
    if (image && fallback) {
      const src = String(product.image || "").trim();
      image.hidden = !src;
      image.src = src || "";
      image.alt = product.name ? product.name + " product photo" : "Product photo";
      fallback.hidden = Boolean(src);
    }
  }

  function syncSubscriptionProducts() {
    const select = $("#subscriptionProduct");
    if (!select) return;
    const products = getProducts().filter(product => Number(product.stock || 0) > 0);
    const current = select.value;
    const saved = read("kb_subscription_preference", {});
    const preferred = String(current || saved?.product || "");
    select.innerHTML = products.map(product =>
      '<option value="' + esc(product.id) + '">' + esc(product.name || product.id) +
      (product.size ? " · " + esc(product.size) : "") + '</option>'
    ).join("");
    const exists = products.some(product => String(product.id) === preferred);
    if (exists) select.value = preferred;
    else if (products[0]) select.value = products[0].id;
  }

  function renderReviews() {
    const section = $("#reviews");
    const root = $("#reviewsList");
    if (!section || !root) return;
    const saved = read(REVIEWS_KEY, []);
    const reviews = Array.isArray(saved) ? saved.filter(review => review && review.verified === true && review.published !== false) : [];
    section.hidden = reviews.length === 0;
    root.innerHTML = reviews.map(review => {
      const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));
      return '<article class="premium-review-card">' +
        '<div class="review-stars" aria-label="' + rating + ' out of 5 stars">' + "★".repeat(rating) + '</div>' +
        '<p>“' + esc(review.text || "") + '”</p>' +
        '<strong>' + esc(review.name || "Verified customer") + '</strong>' +
        '<span>' + (review.orderId ? "Verified purchase · " + esc(review.orderId) : "Verified customer review") + '</span>' +
      '</article>';
    }).join("");
  }

  function renderTrustSignals() {
    const orders = read(ORDER_KEY, []);
    const list = Array.isArray(orders) ? orders : [];
    const delivered = list.filter(order => String(order.status || "").toLowerCase() === "delivered").length;
    const deliveredCard = $("#trustDeliveredCard");
    const deliveredTitle = $("#trustDeliveredTitle");
    const deliveredText = $("#trustDeliveredText");
    if (deliveredCard) deliveredCard.hidden = delivered <= 0;
    if (deliveredTitle) deliveredTitle.textContent = delivered + (delivered === 1 ? " delivered order" : " delivered orders");
    if (deliveredText) deliveredText.textContent = "Based on recorded orders in this storefront browser.";
    const settings = read("kb_settings", {}) || {};
    const storeSettings = read("kb_store_settings", {}) || {};
    const roastSchedule = String(storeSettings.roastSchedule || settings.roastSchedule || "").trim();
    const roastCard = $("#trustRoastCard");
    const roastTitle = $("#trustRoastTitle");
    const roastText = $("#trustRoastText");
    if (roastCard) roastCard.hidden = !roastSchedule;
    if (roastTitle) roastTitle.textContent = roastSchedule ? "Roast schedule" : "";
    if (roastText) roastText.textContent = roastSchedule;
  }

  function getNextRoastTarget() {
    const now = new Date();
    const roast = new Date(now);
    roast.setHours(6, 0, 0, 0);

    if (now.getTime() >= roast.getTime()) {
      roast.setDate(roast.getDate() + 1);
    }

    return roast;
  }

  function getNextRoastLabel() {
    const now = new Date();
    const roast = getNextRoastTarget();

    const isTomorrow =
      roast.getDate() !== now.getDate() ||
      roast.getMonth() !== now.getMonth() ||
      roast.getFullYear() !== now.getFullYear();

    return "Roast " + (isTomorrow ? "tomorrow" : "today") + " 6AM";
  }

  function getNextRoastCountdown() {
    const now = new Date();
    const roast = getNextRoastTarget();
    const diff = Math.max(0, roast.getTime() - now.getTime());

    const totalMinutes = Math.max(0, Math.floor(diff / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return getNextRoastLabel() + " • " + hours + "h " + String(minutes).padStart(2, "0") + "m";
  }

  function syncProductCard(card, product) {
    const stock = Math.max(0, Number(product.stock || 0));
    const name = $(".product-title-line h3", card);
    const note = $(".product-title-line p", card);
    const badge = $(".product-badge", card);
    const size = $(".image-size", card);
    const price = $("[data-price]", card);
    const stockBadge = $("[data-stock-badge]", card);
    const lowStockTimer = $("[data-low-stock-timer]", card);
    const addButton = $("[data-add-to-cart]", card);
    const visual = $(".product-image", card);
    const existingPhoto = $(".product-photo", card);
    let productPhoto = existingPhoto;
    if (visual && !productPhoto) {
      productPhoto = document.createElement("img");
      productPhoto.className = "product-photo";
      productPhoto.loading = "lazy";
      productPhoto.decoding = "async";
      visual.insertBefore(productPhoto, visual.firstChild);
    }
    let meta = $(".product-data-meta", card);
    if (card && !meta) {
      meta = document.createElement("div");
      meta.className = "product-data-meta";
      const content = $(".product-content", card);
      const titleLine = $(".product-title-line", card);
      if (content && titleLine) content.insertBefore(meta, titleLine.nextSibling);
    }

    if (name) name.textContent = product.name || "";
    if (note) note.textContent = product.note || "";
    if (badge) badge.textContent = product.badge || "NEW";
    if (size) size.textContent = product.size || "";
    if (price) price.textContent = money(product.price);

    const productImage = String(product.image || "").trim();
    if (visual) visual.classList.toggle("has-photo", Boolean(productImage));
    if (productPhoto) {
      productPhoto.hidden = !productImage;
      productPhoto.src = productImage || "";
      productPhoto.alt = product.name ? product.name + " product photo" : "Product photo";
      productPhoto.onerror = () => {
        productPhoto.hidden = true;
        visual?.classList.remove("has-photo");
      };
    }

    if (meta) {
      const details = [
        product.origin ? "Origin: " + product.origin : "",
        product.roastLevel || product.roast ? "Roast: " + (product.roastLevel || product.roast) : "",
        product.netWeight || product.size ? "Net: " + (product.netWeight || product.size) : "",
        product.roastDate ? "Roasted: " + product.roastDate : "",
        product.batch ? "Batch: " + product.batch : "",
        product.process ? "Process: " + product.process : "",
        product.tastingNotes ? product.tastingNotes : ""
      ].filter(Boolean);
      meta.innerHTML = details.slice(0,5).map(value => "<span>" + esc(value) + "</span>").join("");
      meta.hidden = details.length === 0;
    }

    const roastValue = String(product.roast || "Dark").trim();
    const grindValue = String(product.grind || "Whole").trim();

    $$("[data-roast-group] .pill", card).forEach(button => {
      button.classList.toggle("active", button.textContent.trim() === roastValue);
    });

    $$("[data-grind-group] .pill", card).forEach(button => {
      button.classList.toggle("active", button.textContent.trim() === grindValue);
    });

    if (stockBadge) {
      if (stock > 0) {
        if (stock <= 5) {
          stockBadge.textContent = "⚡ " + stock + " packs left";
          stockBadge.setAttribute(
            "aria-label",
            stock + " packs left. " + getNextRoastLabel() + "."
          );
        } else {
          stockBadge.textContent = "⚡ " + stock + " packs left";
          stockBadge.setAttribute("aria-label", stock + " packs left.");
        }
      } else {
        stockBadge.textContent = "SOLD OUT";
        stockBadge.setAttribute("aria-label", "Sold out.");
      }
      stockBadge.classList.toggle("urgent", stock > 0 && stock <= 5);
    }

    if (lowStockTimer) {
      if (stock > 0 && stock <= 3) {
        lowStockTimer.hidden = false;
        lowStockTimer.textContent = "Roast tomorrow 6AM";
      } else {
        lowStockTimer.hidden = true;
        lowStockTimer.textContent = "";
      }
    }

    if (addButton) {
      addButton.disabled = stock <= 0;
      addButton.textContent = stock <= 0 ? "SOLD OUT" : "ADD TO CART →";
      addButton.setAttribute("aria-disabled", String(stock <= 0));
    }
  }

  function isBundleProduct(product) {
    return Boolean(
      product &&
      (
        product.isBundle === true ||
        product.bundle === true ||
        String(product.type || "").toLowerCase() === "bundle" ||
        /bundle/i.test(String(product.id || "")) ||
        /bundle/i.test(String(product.name || ""))
      )
    );
  }

  function renderProducts() {
    const grid = $("#productGrid");
    if (!grid) return;

    const products = getProducts().filter(product => !isBundleProduct(product));

    if (!products.length) {
      grid.innerHTML =
        '<div class="catalog-empty">' +
          '<span>PRODUCTION CATALOG</span>' +
          '<h3>Products coming soon.</h3>' +
          '<p>The store catalog is currently empty.</p>' +
        '</div>';
      return;
    }

    $$(".catalog-empty", grid).forEach(element => element.remove());

    const ids = new Set(products.map(product => String(product.id)));
    $$(".product-card[data-product-id]", grid).forEach(card => {
      if (!ids.has(String(card.dataset.productId))) card.remove();
    });

    products.forEach(product => {
      let card = $$("[data-product-id]", grid).find(
        element => String(element.dataset.productId) === String(product.id)
      );

      if (!card) {
        card = document.createElement("article");
        card.className = "product-card";
        card.dataset.productId = product.id;
        card.innerHTML =
          '<div class="product-image product-image-generic">' +
            '<span class="stock-badge" data-stock-badge="' + esc(product.id) + '"></span>' +
            '<span class="low-stock-timer" data-low-stock-timer hidden></span>' +
            '<img class="product-photo" loading="lazy" decoding="async" alt="" hidden>' +
            '<span class="image-size"></span>' +
            '<div class="product-image-fallback"><svg class="kb-bean-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M59 12C76 15 88 31 88 49C88 70 72 86 53 88C34 90 17 79 13 61C9 43 19 23 37 16C44 13 51 11 59 12Z" stroke="currentColor" stroke-width="5"/><path d="M62 18C49 30 43 43 42 56C41 69 45 78 53 86" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg></div>' +
          '</div>' +
          '<div class="product-content">' +
            '<div class="product-title-line">' +
              '<div>' +
                '<span class="product-badge"></span>' +
                '<h3></h3>' +
                '<p></p>' +
              '</div>' +
              '<strong class="product-price" data-price="' + esc(product.id) + '"></strong>' +
            '</div>' +
            '<div class="selector-block">' +
              '<span>ROAST</span>' +
              '<div class="pills" data-roast-group="' + esc(product.id) + '">' +
                '<button type="button" class="pill" data-value="Light">Light</button>' +
                '<button type="button" class="pill" data-value="Medium">Medium</button>' +
                '<button type="button" class="pill" data-value="Dark">Dark</button>' +
              '</div>' +
            '</div>' +
            '<div class="selector-block">' +
              '<span>GRIND</span>' +
              '<div class="pills" data-grind-group="' + esc(product.id) + '">' +
                '<button type="button" class="pill" data-value="Whole">Whole</button>' +
                '<button type="button" class="pill" data-value="Coarse">Coarse</button>' +
                '<button type="button" class="pill" data-value="Fine">Fine</button>' +
              '</div>' +
            '</div>' +
            '<button class="button button-gold add-to-cart" type="button" data-add-to-cart="' +
              esc(product.id) + '">ADD TO CART →</button>' +
          '</div>';

        grid.appendChild(card);
      }

      syncProductCard(card, product);
    });

    const bundle = $("#kb-starter-bundle", grid);
    if (bundle) grid.appendChild(bundle);
  }

  function getSelected(card, groupAttribute, fallback) {
    const selected = $(`[${groupAttribute}] .pill.active`, card);
    return selected ? selected.textContent.trim() : fallback;
  }

  function addToCart(productId) {
    const product = getProducts().find(
      item => String(item.id) === String(productId)
    );

    if (!product) {
      toast("Product is unavailable.");
      return;
    }

    const stock = Math.max(0, Number(product.stock || 0));

    if (stock <= 0) {
      toast("Sold out: " + product.name + ".");
      return;
    }

    const card = $$("[data-product-id]").find(
      element => String(element.dataset.productId) === String(productId)
    );

    const roast = getSelected(card, "data-roast-group", product.roast || "Dark");
    const grind = getSelected(card, "data-grind-group", product.grind || "Whole");

    const existing = cart.find(item =>
      !item.bundleId &&
      String(item.id) === String(product.id) &&
      item.roast === roast &&
      item.grind === grind
    );

    const nextQuantity = Number(existing?.qty || 0) + 1;

    if (nextQuantity > stock) {
      toast("Only " + stock + " pack(s) left.");
      return;
    }

    if (existing) {
      existing.qty = nextQuantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        size: product.size,
        price: Number(product.price || 0),
        roast,
        grind,
        qty: 1
      });
    }

    write(CART_KEY, cart);
    renderCart();
    openBox("#cartModal");
    toast(product.name + " added to cart.");
  }

  function changeQuantity(index, delta) {
    const item = cart[index];
    if (!item) return;

    const product = getProducts().find(
      productItem => String(productItem.id) === String(item.id)
    );

    const current = Math.max(1, Number(item.qty || 1));
    const next = current + delta;

    if (next <= 0) {
      cart.splice(index, 1);
      write(CART_KEY, cart);
      renderCart();
      return;
    }

    const stock = Math.max(0, Number(product?.stock || 0));

    if (next > stock) {
      toast("Stock limit: " + stock + " pack(s).");
      return;
    }

    item.qty = next;
    write(CART_KEY, cart);
    renderCart();
  }

  function shippingFee(address) {
    if (cartCount() >= 2) return 0;

    const rule = read(SHIPPING_KEY, {});
    const text = String(address || "").toLowerCase();

    if (text.includes("batangas")) {
      return Number(rule?.regional?.batangas ?? 0);
    }

    if (/manila|quezon city|makati|pasig|taguig/.test(text)) {
      return Number(rule?.regional?.manila ?? 150);
    }

    return Number(rule?.regional?.province ?? 220);
  }

  function promoDiscount(code, subtotal) {
    const promos = read(PROMO_KEY, []);
    if (!Array.isArray(promos)) return 0;

    const wanted = String(code || "").trim().toUpperCase();
    if (!wanted) return 0;

    const promo = promos.find(item =>
      String(item.code || "").trim().toUpperCase() === wanted &&
      item.active !== false
    );

    if (!promo) return 0;
    if (cartCount() < Number(promo.minPacks || 0)) return 0;

    const value = Number(promo.value || 0);

    return Math.min(
      subtotal,
      promo.type === "percent" ? subtotal * value / 100 : value
    );
  }

  function syncPaymentOptions(select, preferred) {
    if (!select) return;
    const settings = read("kb_settings", {}) || {};
    const storeSettings = read("kb_store_settings", {}) || {};
    const saved = settings.paymentMethods || {};
    const payments = storeSettings.payments || {};
    const methods = [
      {value:"GCash", label:"GCash", enabled:saved.gcash !== false && payments.gcash !== false},
      {value:"Cash on Delivery (COD)", label:"Cash on Delivery (COD)", enabled:saved.cod !== false && payments.cod !== false},
      {value:"Bank Transfer", label:"Bank Transfer", enabled:saved.bank !== false && payments.bank !== false}
    ].filter(method => method.enabled);
    const current = String(preferred || select.value || "");
    select.innerHTML = methods.length
      ? methods.map(method => '<option value="' + esc(method.value) + '">' + esc(method.label) + '</option>').join("")
      : '<option value="">No payment method available</option>';
    select.disabled = methods.length === 0;
    if (methods.some(method => method.value === current)) select.value = current;
    else if (methods[0]) select.value = methods[0].value;
  }

  function checkoutBox() {
    if (!$(".checkout-inline")) {
      const panel = $(".cart-panel");
      if (!panel) return;

      const box = document.createElement("div");
      box.className = "checkout-inline";
      box.innerHTML =
        '<div class="inline-head">' +
          '<span>CHECKOUT</span>' +
          '<button type="button" id="cancelCheckout" aria-label="Cancel checkout">×</button>' +
        '</div>' +
        '<form id="checkoutFormInline" class="checkout-form">' +
          '<label>Full name<input name="name" autocomplete="name" required></label>' +
          '<label>Phone<input name="phone" autocomplete="tel" required></label>' +
          '<label>Email<input name="email" type="email" autocomplete="email"></label>' +
          '<label>Payment<select name="payment" id="checkoutPayment"></select></label>' +
          '<label id="gcashRefRow">GCash Ref Number<input name="gcashRef" id="gcashRef" inputmode="numeric" maxlength="32" autocomplete="off" placeholder="Enter GCash transaction reference number"></label>' +
          '<label>Delivery address<textarea name="address" rows="3" autocomplete="street-address" required></textarea></label>' +
          '<label>Voucher<input name="voucher" placeholder="Optional"></label>' +
          '<label>Fulfillment<select name="fulfillment">' +
            '<option>Lalamove</option>' +
            '<option>J&amp;T</option>' +
            '<option>LBC</option>' +
            '<option>QC Meetup</option>' +
          '</select></label>' +
          '<div class="inline-summary">' +
            '<div><span>Subtotal</span><strong id="inlineSubtotal">₱0</strong></div>' +
            '<div><span>Shipping</span><strong id="inlineShipping">—</strong></div>' +
            '<div><span>Discount</span><strong id="inlineDiscount">—</strong></div>' +
            '<div class="grand"><span>Total</span><strong id="inlineTotal">₱0</strong></div>' +
          '</div>' +
          '<button class="button button-gold full" type="submit">PLACE ORDER →</button>' +
          '<small>Orders are securely processed through your signed-in customer account.</small>' +
        '</form>';

      panel.appendChild(box);

      const savedAddress = read("kb_checkout_default", null);
      if (savedAddress && typeof savedAddress === "object") {
        if (form.elements.name && savedAddress.recipient) form.elements.name.value = savedAddress.recipient;
        if (form.elements.phone && savedAddress.phone) form.elements.phone.value = savedAddress.phone;
        if (form.elements.address && savedAddress.address) form.elements.address.value = savedAddress.address;
      }

      const form = $("#checkoutFormInline");

      const refresh = () => {
        if (!form) return;

        const subtotal = cartTotal();
        const shipping = shippingFee(form.elements.address?.value || "");
        const discount = promoDiscount(form.elements.voucher?.value || "", subtotal);
        const total = Math.max(0, subtotal + shipping - discount);

        if ($("#inlineSubtotal")) $("#inlineSubtotal").textContent = money(subtotal);
        if ($("#inlineShipping")) {
          $("#inlineShipping").textContent = shipping === 0 ? "FREE" : money(shipping);
        }
        if ($("#inlineDiscount")) {
          $("#inlineDiscount").textContent = discount ? "−" + money(discount) : "—";
        }
        if ($("#inlineTotal")) $("#inlineTotal").textContent = money(total);
      };

      const paymentSelect = $("#checkoutPayment");
      syncPaymentOptions(paymentSelect, "");
      const gcashRefRow = $("#gcashRefRow");
      const syncGcashRef = () => {
        if (!paymentSelect || !gcashRefRow) return;
        const isGcash = paymentSelect.value === "GCash";
        gcashRefRow.hidden = !isGcash;
        gcashRefRow.querySelector("input")?.toggleAttribute("required", isGcash);
      };
      paymentSelect?.addEventListener("change", syncGcashRef);
      syncGcashRef();

      form?.addEventListener("input", refresh);

      $("#cancelCheckout")?.addEventListener("click", () => {
        box.remove();
        if ($("#checkoutButton")) $("#checkoutButton").hidden = false;
      });

      form?.addEventListener("submit", placeOrder);
    }

    if ($("#checkoutButton")) $("#checkoutButton").hidden = true;
    $("#checkoutFormInline")?.dispatchEvent(new Event("input"));
  }

  async function placeOrder(event) {
    event.preventDefault();

    if (!cart.length) {
      toast("Your cart is empty.");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const address = String(data.get("address") || "").trim();
    const payment = String(data.get("payment") || "");
    const gcashRef = String(data.get("gcashRef") || "").trim();
    const voucher = String(data.get("voucher") || "").trim().toUpperCase();
    const fulfillment = String(data.get("fulfillment") || "").trim();

    if (!name || !phone || !address) {
      toast("Please complete the required fields.");
      return;
    }

    if (payment === "GCash" && !gcashRef) {
      toast("Please enter your GCash Ref Number.");
      return;
    }

    const liveProducts = getProducts();
    const shortage = cart.find(item => {
      const product = liveProducts.find(
        liveItem => String(liveItem.id) === String(item.id)
      );
      return !product || Number(item.qty || 0) > Number(product.stock || 0);
    });

    if (shortage) {
      toast("Stock has changed. Please review your cart.");
      renderProducts();
      renderCart();
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = "PLACING ORDER…";
    }

    const clientOrderId = "KB-" + Date.now().toString(36).toUpperCase() + "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase();

    try {
      const result = await createBackendOrder({
        clientOrderId,
        customer: { name, phone, email },
        address,
        paymentMethod: payment,
        gcashRef,
        fulfillment,
        voucher,
        items: cart.map(item => ({
          productId: item.id,
          qty: Math.max(1, Number(item.qty || 1)),
          roast: item.roast || "",
          grind: item.grind || ""
        }))
      });

      const serverTotal = Number(result?.total || 0);
      const now = new Date().toISOString();

      // Local state is only a UI cache/pointer. Firestore is the order source of truth.
      const localPreview = {
        id: result?.id || clientOrderId,
        createdAt: now,
        customer: { name, phone, email, address },
        payment,
        gcashRef,
        paymentStatus: payment === "GCash" ? "Pending Review" : "Not Required",
        fulfillment,
        voucher,
        subtotal: cartTotal(),
        shippingFee: shippingFee(address),
        discount: promoDiscount(voucher, cartTotal()),
        total: serverTotal,
        status: "Pending",
        statusUpdatedAt: now,
        route: {
          origin: "Kapeng Barako, Quezon City, Metro Manila, Philippines",
          waypoint: getRouteWaypoint(address),
          destination: address
        },
        items: cart.map(item => {
          const product = liveProducts.find(
            liveItem => String(liveItem.id) === String(item.id)
          );
          return {
            ...item,
            name: product?.name || "",
            size: product?.size || "",
            price: Number(product?.price || 0)
          };
        })
      };

      const updatedProducts = liveProducts.map(product => {
        const line = localPreview.items.find(
          item => String(item.id) === String(product.id)
        );
        if (!line) return product;
        return {
          ...product,
          stock: Math.max(
            0,
            Number(product.stock || 0) - Number(line.qty || 0)
          )
        };
      });

      write(PRODUCT_KEY, updatedProducts);
      write("kb_last_order", localPreview);

      cart = [];
      write(CART_KEY, cart);

      $(".checkout-inline")?.remove();
      if ($("#checkoutButton")) $("#checkoutButton").hidden = false;

      renderProducts();
      renderCart();

      toast("Order " + localPreview.id + " confirmed.");
    } catch (error) {
      console.error("[Kapeng Barako] checkout failed", error);
      const message = String(error?.message || "");
      if (/sign in|authenticated|customer account/i.test(message)) {
        toast("Please sign in to your customer account before checkout.");
      } else if (/insufficient stock|no longer available/i.test(message)) {
        toast("Stock changed. Please review your cart.");
        renderProducts();
        renderCart();
      } else {
        toast(message || "Order could not be placed. Please try again.");
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "PLACE ORDER →";
      }
    }
  }

  function showTrackModal() {
    openBox("#trackModal");

    const lastOrder = read("kb_last_order", null);
    const input = $("#trackOrderId");

    if (input && lastOrder?.id && !input.value) {
      input.value = lastOrder.id;
    }

    if (lastOrder?.id) {
      renderTrackedOrder(lastOrder);
    } else {
      const map = $("#trackMap");
      if (map) {
        map.hidden = true;
        map.innerHTML = "";
      }
    }

    if (input) input.focus();
  }

  function getRouteWaypoint(address) {
    const parts = String(address || "")
      .split(",")
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) return parts[parts.length - 2];
    if (parts.length === 2) return parts[0];

    const text = String(address || "").toLowerCase();
    if (text.includes("batangas")) return "Calamba, Laguna";
    if (text.includes("cavite")) return "Tagaytay / Cavite corridor";
    if (text.includes("laguna")) return "Calamba, Laguna";
    if (text.includes("rizal")) return "Pasig / Rizal corridor";
    if (text.includes("bulacan")) return "Valenzuela / Bulacan corridor";
    if (text.includes("pampanga")) return "San Fernando, Pampanga";
    return "Delivery area";
  }

  function renderTrackedOrder(order) {
    const root = $("#trackResult");
    const map = $("#trackMap");

    if (!root || !order) return;

    const address = String(
      order.address || order.customer?.address || ""
    ).trim();

    const steps = [
      "Pending",
      "Verified Payment",
      "Processing/Roasting",
      "Ready to Ship",
      "Dispatched",
      "Delivered"
    ];

    const normalizedStatus = String(order.status || "Pending") === "Ready" ? "Ready to Ship" : String(order.status || "Pending");
    let active = steps.indexOf(normalizedStatus);
    if (active < 0) active = 0;

    const paymentStatus = String(order.paymentStatus || (order.payment === "GCash" ? "Pending Review" : "Not Required"));
    root.innerHTML =
      '<div class="track-customer">' +
        '<strong>' + esc(order.id) + '</strong><br>' +
        esc(order.customer?.name || "Customer") + '<br>' +
        esc(address || "Delivery address not provided") +
        '<div class="track-payment-status"><span>PAYMENT</span><strong>' + esc(paymentStatus) + '</strong></div>' +
      '</div>' +
      steps.map((step, index) => {
        const isPaymentStep = step === "Verified Payment";
        const paymentVerified = isPaymentStep && paymentStatus === "Verified";
        const state =
          index < active || paymentVerified ? "done" :
          index === active ? "active" : "";

        const mark =
          index < active ? "✓" :
          String(index + 1);

        return (
          '<div class="track-step ' + state + '">' +
            '<div class="track-dot">' + mark + '</div>' +
            '<div>' +
              '<h4>' + esc(step) + '</h4>' +
              '<p>' +
                (index <= active ? "Recorded" : "Waiting") +
              '</p>' +
            '</div>' +
          '</div>'
        );
      }).join("");

    if (!map) return;

    if (!address) {
      map.hidden = true;
      map.innerHTML = "";
      const vehicle = $("#trackMapVehicle");
      const waypointBox = $("#trackWaypoint");
      if (vehicle) vehicle.hidden = true;
      if (waypointBox) waypointBox.hidden = true;
      return;
    }

    const encoded = encodeURIComponent(address);
    const waypoint = String(
      order.route?.waypoint ||
      getRouteWaypoint(address)
    ).trim();

    const origin = String(
      order.route?.origin ||
      "Kapeng Barako, Quezon City, Metro Manila, Philippines"
    ).trim();

    const directionsUrl =
      "https://www.google.com/maps/dir/?api=1" +
      "&origin=" + encodeURIComponent(origin) +
      "&destination=" + encoded +
      "&waypoints=" + encodeURIComponent(waypoint) +
      "&travelmode=driving";

    map.hidden = false;
    map.innerHTML =
      '<div class="track-map-head">' +
        '<div>' +
          '<span class="mini-label">DELIVERY ROUTE</span>' +
          '<strong>Google Maps • Waypoint</strong>' +
        '</div>' +
        '<a href="' + directionsUrl + '" target="_blank" rel="noopener noreferrer">' +
          'OPEN ROUTE IN GOOGLE MAPS ↗' +
        '</a>' +
      '</div>' +
      '<div class="track-route-chips">' +
        '<span><b>START</b>' + esc(origin) + '</span>' +
        '<span><b>WAYPOINT</b>' + esc(waypoint) + '</span>' +
        '<span><b>DELIVERY</b>' + esc(address) + '</span>' +
      '</div>' +
      '<iframe title="Delivery location on Google Maps" ' +
        'src="https://www.google.com/maps?q=' + encoded + '&output=embed" ' +
        'loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>' +
      '</iframe>';

    const waypointBox = $("#trackWaypoint");
    const waypointText = $("#trackWaypointText");
    if (waypointBox && waypointText) {
      waypointText.textContent = waypoint || "Delivery area";
      waypointBox.hidden = false;
    }

    const vehicle = $("#trackMapVehicle");
    if (vehicle) {
      const fulfillment = String(order.fulfillment || "").toLowerCase();
      const icon = $(".track-vehicle-icon", vehicle);
      const label = $(".track-vehicle-label", vehicle);

      const isMotorcycle =
        fulfillment.includes("lalamove") ||
        fulfillment.includes("meetup");

      if (icon) {
        icon.textContent = isMotorcycle ? "🏍️" : "🚚";
      }

      if (label) {
        label.textContent = isMotorcycle
          ? "Motorcycle delivery"
          : "Delivery vehicle";
      }

      vehicle.hidden = false;
      vehicle.dataset.mode = isMotorcycle ? "motorcycle" : "vehicle";
    }
  }

  async function trackOrder(event) {
    event.preventDefault();

    const id = String($("#trackOrderId")?.value || "")
      .trim()
      .replace(/^#/, "")
      .toUpperCase();

    const root = $("#trackResult");
    const map = $("#trackMap");
    if (!root) return;

    root.innerHTML = '<div class="empty">Checking your order…</div>';

    try {
      const [{ getAuth }, firestore, appModule, config] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
        import("./js/firebase-config.js")
      ]);

      if (!config.isFirebaseConfigured) {
        throw new Error("Firebase backend is not configured.");
      }

      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(config.firebaseConfig);
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        root.innerHTML = '<div class="empty">Please sign in to your customer account to track an order.</div>';
        return;
      }

      const snapshot = await firestore.getDocs(
        firestore.query(
          firestore.collection(firestore.getFirestore(app), "orders"),
          firestore.where("customerUid", "==", user.uid)
        )
      );

      const orderDoc = snapshot.docs.find(
        doc => String(doc.id).toUpperCase() === id
      );

      if (!orderDoc) {
        root.innerHTML = '<div class="empty">Order not found in your account. Check your Order ID.</div>';
        if (map) {
          map.hidden = true;
          map.innerHTML = "";
        }
        return;
      }

      const order = {
        id: orderDoc.id,
        ...orderDoc.data()
      };

      renderTrackedOrder(order);
      write("kb_last_order", {
        ...order,
        createdAt: order.createdAt?.toDate
          ? order.createdAt.toDate().toISOString()
          : order.createdAt
      });
    } catch (error) {
      console.error("[Kapeng Barako] tracking failed", error);
      root.innerHTML =
        '<div class="empty">Unable to load the order right now. Please try again.</div>';
    }
  }

  function smoothScrollTo(target) {
    const id = String(target || "").replace(/^#/, "");
    const section = document.getElementById(id);
    if (!section) return false;

    const header = $(".site-header");
    const offset = (header?.offsetHeight || 0) + 12;
    const top = window.scrollY + section.getBoundingClientRect().top - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth"
    });

    if (window.history?.replaceState) {
      window.history.replaceState(null, "", "#" + id);
    }

    return true;
  }

  function setupNavigation() {
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener("click", event => {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;

        const id = href.slice(1);
        if (!document.getElementById(id)) return;

        event.preventDefault();
        smoothScrollTo(id);

        if (anchor.closest(".mobile-sidebar")) {
          closeMobileMenu();
        }
      });
    });
  }

  function closeMobileMenu() {
    const button = $("#menuButton");
    const sidebar = $("#mobileSidebar");
    const overlay = $("#menuOverlay");

    button?.classList.remove("is-open");
    sidebar?.classList.remove("is-open");
    overlay?.classList.remove("is-open");

    if (overlay) overlay.hidden = true;
    button?.setAttribute("aria-expanded", "false");
    button?.setAttribute("aria-label", "Open menu");

    if ((!$("#cartModal") || $("#cartModal").hidden) &&
        (!$("#trackModal") || $("#trackModal").hidden)) {
      lockBody(false);
    }
  }

  function setupMenu() {
    const button = $("#menuButton");
    const sidebar = $("#mobileSidebar");
    const overlay = $("#menuOverlay");

    if (!button || !sidebar || !overlay) return;

    const openMenu = () => {
      button.classList.add("is-open");
      sidebar.classList.add("is-open");
      overlay.classList.add("is-open");
      overlay.hidden = false;
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Close menu");
      lockBody(true);
    };

    button.addEventListener("click", () => {
      if (sidebar.classList.contains("is-open")) {
        closeMobileMenu();
      } else {
        openMenu();
      }
    });

    $("#sidebarClose")?.addEventListener("click", closeMobileMenu);
    overlay.addEventListener("click", closeMobileMenu);
  }

  function setTimerButtons() {
    const running = Boolean(brewTimer);
    const start = $("#timerStart");
    const pause = $("#timerPause");
    const reset = $("#timerReset");

    if (start) {
      start.disabled = running;
      start.textContent = running ? "RUNNING…" : "START";
      start.setAttribute("aria-pressed", String(running));
    }
    if (pause) {
      pause.disabled = !running;
      pause.setAttribute("aria-pressed", String(!running));
    }
    if (reset) {
      reset.disabled = brewSeconds === 180 && !running;
    }
  }

  function drawTimer() {
    const timer = $("#brewTimer");
    if (!timer) return;

    const total = Math.max(0, Math.floor(brewSeconds));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    timer.textContent =
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");

    timer.setAttribute(
      "aria-label",
      "Brew timer " +
      String(minutes).padStart(2, "0") +
      " minutes " +
      String(seconds).padStart(2, "0") +
      " seconds"
    );

    setTimerButtons();
  }

  function stopTimer() {
    if (brewTimer) {
      clearInterval(brewTimer);
      brewTimer = null;
    }
    brewLastTick = 0;
    setTimerButtons();
  }

  function tickTimer() {
    if (!brewTimer) return;

    const now = Date.now();
    const elapsed = Math.floor((now - brewLastTick) / 1000);

    if (elapsed > 0) {
      brewSeconds = Math.max(0, brewSeconds - elapsed);
      brewLastTick += elapsed * 1000;
      drawTimer();
    }

    if (brewSeconds <= 0) {
      stopTimer();
      brewSeconds = 0;
      drawTimer();
      toast("Brew timer complete.");
    }
  }

  function startTimer() {
    if (brewTimer) return;

    if (brewSeconds <= 0) {
      brewSeconds = 180;
    }

    brewLastTick = Date.now();
    brewTimer = window.setInterval(tickTimer, 200);
    drawTimer();
    toast("Brew timer started.");
  }

  function pauseTimer() {
    if (!brewTimer) {
      toast("Brew timer is already paused.");
      return;
    }

    tickTimer();
    stopTimer();
    drawTimer();
    toast("Brew timer paused.");
  }

  function resetTimer() {
    stopTimer();
    brewSeconds = 180;
    drawTimer();
    toast("Brew timer reset.");
  }

  function setupTimer() {
    drawTimer();

    const start = $("#timerStart");
    const pause = $("#timerPause");
    const reset = $("#timerReset");

    start?.addEventListener("click", event => {
      event.preventDefault();
      startTimer();
    });

    pause?.addEventListener("click", event => {
      event.preventDefault();
      pauseTimer();
    });

    reset?.addEventListener("click", event => {
      event.preventDefault();
      resetTimer();
    });

    setTimerButtons();
  }

  function setupModalControls() {
    $("#openCart")?.addEventListener("click", () => {
      renderCart();
      openBox("#cartModal");
    });

    $("#heroCartButton")?.addEventListener("click", () => {
      renderCart();
      openBox("#cartModal");
    });

    $("#heroTrackButton")?.addEventListener("click", showTrackModal);

    $("#checkoutButton")?.addEventListener("click", () => {
      if (!cart.length) {
        toast("Your cart is empty.");
        return;
      }
      checkoutBox();
    });

    $$("[data-close-cart]").forEach(button => {
      button.addEventListener("click", () => closeBox("#cartModal"));
    });

    $$("[data-close-track]").forEach(button => {
      button.addEventListener("click", () => closeBox("#trackModal"));
    });

    $("#trackForm")?.addEventListener("submit", trackOrder);

    $("#brewVideoButton")?.addEventListener("click", event => {
      event.preventDefault();
      const dialog = $("#brew-dialog");

      if (!dialog) {
        toast("Brew guide is unavailable.");
        return;
      }

      try {
        if (typeof dialog.showModal === "function") {
          if (!dialog.open) dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
        lockBody(true);
      } catch {
        dialog.setAttribute("open", "");
        lockBody(true);
      }
    });

    $("#brewDialogStart")?.addEventListener("click", event => {
      event.preventDefault();
      resetTimer();
      startTimer();

      const dialog = $("#brew-dialog");
      if (dialog?.close) dialog.close();
      else dialog?.removeAttribute("open");

      lockBody(false);
    });

    $$("[data-close-dialog]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        const dialog = button.closest("dialog");
        if (dialog?.close) dialog.close();
        else dialog?.removeAttribute("open");
        lockBody(false);
      });
    });
  }

  function setupProductActions() {
    document.addEventListener("click", event => {
      const add = event.target.closest("[data-add-to-cart]");
      if (add) {
        addToCart(add.dataset.addToCart);
        return;
      }

      const plus = event.target.closest("[data-plus]");
      if (plus) {
        changeQuantity(Number(plus.dataset.plus), 1);
        return;
      }

      const minus = event.target.closest("[data-minus]");
      if (minus) {
        changeQuantity(Number(minus.dataset.minus), -1);
        return;
      }

      const remove = event.target.closest("[data-remove]");
      if (remove) {
        const index = Number(remove.dataset.remove);
        if (!Number.isNaN(index)) {
          cart.splice(index, 1);
          write(CART_KEY, cart);
          renderCart();
        }
        return;
      }

      const pill = event.target.closest(".pill");
      if (pill) {
        const group = pill.closest(".pills");
        if (!group) return;

        $$(".pill", group).forEach(button => {
          button.classList.remove("active");
        });

        pill.classList.add("active");
      }
    });
  }

  function setupBusinessFeatures() {
    syncSubscriptionProducts();
    $("#wholesaleToggle")?.addEventListener("change", event => {
      const form = $("#wholesaleForm");
      if (form) form.hidden = !event.target.checked;
    });

    $("#wholesaleRequest")?.addEventListener("click", () => {
      const kg = Math.max(10, Number($("#wholesaleKg")?.value || 10));
      const roast = $("#wholesaleRoast")?.value || "Medium";
      const request = {
        id: "WQ-" + Date.now().toString(36).toUpperCase(),
        kg,
        roast,
        status: "New",
        createdAt: new Date().toISOString()
      };

      const previous = read("kb_wholesale_requests", []);
      write("kb_wholesale_requests", [
        request,
        ...(Array.isArray(previous) ? previous : [])
      ]);
      write("kb_wholesale_request", request);
      toast("Wholesale quote request saved.");
    });

    $("#subscriptionSave")?.addEventListener("click", () => {
      const preference = {
        id: "SUB-" + Date.now().toString(36).toUpperCase(),
        product: $("#subscriptionProduct")?.value || "",
        day: $("#subscriptionDay")?.value || "15th",
        active: true,
        createdAt: new Date().toISOString()
      };

      write("kb_subscription_preference", preference);
      toast("Delivery preference saved.");
    });
  }

  function setupPrivacyNotice() {
    const notice = $("#cookieNotice");
    const button = $("#cookieOk");

    if (!notice || !button) return;

    let acknowledged = "";
    try {
      acknowledged = localStorage.getItem("kb_cookie_consent") || "";
    } catch {}

    notice.hidden = acknowledged === "acknowledged";

    if (acknowledged !== "acknowledged") {
      button.addEventListener("click", () => {
        try {
          localStorage.setItem("kb_cookie_consent", "acknowledged");
        } catch {}
        notice.hidden = true;
      });
    }
  }

  function setupKeyboard() {
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      closeMobileMenu();
      closeBox("#cartModal");
      closeBox("#trackModal");

      const dialog = $("#brew-dialog");
      if (dialog?.open) {
        dialog.close();
        lockBody(false);
      }
    });
  }

  function setupStorageSync() {
    window.addEventListener("focus", () => { renderProducts(); renderCart(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderProducts(); renderCart(); } });
    window.addEventListener("storage", event => {
      if (!event.key) return;

      if ([CART_KEY, ORDER_KEY, PRODUCT_KEY, GALLERY_KEY, REVIEWS_KEY, CMS_KEY, ADS_KEY, "kb_settings"].includes(event.key)) {
        cart = read(CART_KEY, []);
        if (!Array.isArray(cart)) cart = [];
        renderProducts();
        renderGallery();
        renderFeaturedProduct();
        syncSubscriptionProducts();
        renderReviews();
        renderTrustSignals();
        renderCart();
        if (event.key === "kb_settings") {
          renderContactInfo();
          renderTrustSignals();
          syncPaymentOptions($("#checkoutPayment"), $("#checkoutPayment")?.value || "");
        }
        if (event.key === CMS_KEY) renderAnnouncement();
        if (event.key === ADS_KEY) renderAdvertisement();
      }
    });
  }

  function init() {
    renderAnnouncement();
    renderProducts();
    renderFeaturedProduct();
    syncSubscriptionProducts();
    renderGallery();
    renderReviews();
    renderTrustSignals();
    window.setInterval(() => {
      $(".product-card[data-product-id]").forEach(card => {
        const id = String(card.dataset.productId || "");
        const product = getProducts().find(item => String(item.id) === id);
        if (product && Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5) {
          syncProductCard(card, product);
        }
      });
    }, 60000);
    renderGallery();
    renderAdvertisement();
    renderContactInfo();
    renderCart();
    setupNavigation();
    setupMenu();
    setupTimer();
    setupModalControls();
    setupProductActions();
    setupBusinessFeatures();
    setupPrivacyNotice();
    setupKeyboard();
    setupStorageSync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
