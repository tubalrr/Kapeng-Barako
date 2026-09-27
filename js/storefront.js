(() => {
  "use strict";

  const DEFAULT_PRODUCTS = [
    {id:1,name:"Barako Strong",price:189,weight:"250g",note:"Bold, smoky roast",emoji:"☕️",bg:"bg-[#F6E8D5]",variants:[{weight:"250g",price:189}],grinds:["Whole Bean","Coarse","Medium","Fine"]},
    {id:2,name:"QC Blend",price:245,weight:"500g",note:"Chocolate and brown sugar",emoji:"🤎",bg:"bg-[#EDE3D3]",variants:[{weight:"500g",price:245}],grinds:["Whole Bean","Coarse","Medium","Fine"]},
    {id:3,name:"Cold Brew Kit",price:320,weight:"Set",note:"Easy to prepare at home",emoji:"🧊",bg:"bg-[#E8DDD0]",variants:[{weight:"Set",price:320}],grinds:["Whole Bean","Coarse","Medium","Fine"]},
    {id:4,name:"Barako Drip Pack",price:165,weight:"10 pcs",note:"Simple coffee for the office",emoji:"✨",bg:"bg-[#F5EEE4]",variants:[{weight:"10 pcs",price:165}],grinds:["Whole Bean","Coarse","Medium","Fine"]}
  ];

  const DEFAULT_SETTINGS = {
    paymentMethods:["GCash","Maya","Cash on Delivery (COD)"],
    fulfillmentMethods:["Lalamove","J&T","LBC","QC Meetup"],
    shippingNote:"Courier fee is based on the selected courier and delivery distance/location. Final fee is confirmed before fulfillment.",
    orderNote:"We confirm the final delivery details before fulfillment.",
    email:"ILAG",
    phone:"ILAG",
    location:"ILAG"
  };

  const DEFAULT_SHIPPING = {enabled:true,minPacks:2,fulfillment:"all"};

  const DEFAULT_CMS = {
    story:"Mula sa piling Liberica beans ng Batangas, bawat batch ng Kapeng Barako ay ako mismo ang nagroroast, binabantayan ang init, oras, at kulay hanggang lumabas ang tamang tapang at aroma. Hindi tulad ng commercial coffee na mass-produced para sa consistent volume, ang aming roast ay small-batch at hands-on, kaya bawat tasa ay may mas malalim na character, mas mababang aroma, at tunay na lutong Barako.",
    delivery:"Payment: GCash, Maya, Cash on Delivery (COD). Fulfillment: Lalamove, J&T, LBC, or meetup within Quezon City. Shipping fee is based on the selected courier and delivery distance/location. Free shipping when you buy 2 packs or more.",
    faqs:[]
  };

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  const normalizeProduct = p => ({
    ...p,
    variants:Array.isArray(p?.variants) && p.variants.length ? p.variants : [{weight:p?.weight || "Pack",price:Number(p?.price || 0)}],
    grinds:Array.isArray(p?.grinds) && p.grinds.length ? p.grinds : ["Whole Bean","Coarse","Medium","Fine"]
  });

  const getProducts = () => {
    const stored = read("kb_products", null);
    return Array.isArray(stored) && stored.length ? stored.map(normalizeProduct) : DEFAULT_PRODUCTS.map(normalizeProduct);
  };

  const getSettings = () => {
    const s = read("kb_settings", DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...(s || {}),
      paymentMethods:Array.isArray(s?.paymentMethods) && s.paymentMethods.length ? s.paymentMethods : DEFAULT_SETTINGS.paymentMethods,
      fulfillmentMethods:Array.isArray(s?.fulfillmentMethods) && s.fulfillmentMethods.length ? s.fulfillmentMethods : DEFAULT_SETTINGS.fulfillmentMethods
    };
  };

  const getCms = () => ({...DEFAULT_CMS,...(read("kb_cms",{})||{}),faqs:Array.isArray(read("kb_cms",{}).faqs) ? read("kb_cms",{}).faqs : []});
  const getShippingRule = () => ({...DEFAULT_SHIPPING,...(read("kb_shipping",DEFAULT_SHIPPING)||read("kb_shipping_rule",DEFAULT_SHIPPING))});

  window.KBStore = {
    DEFAULT_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_CMS, DEFAULT_SHIPPING,
    read, getProducts, getSettings, getCms, getShippingRule
  };

  const watchKeys = new Set(["kb_products","kb_settings","kb_cms","kb_shipping","kb_shipping_rule"]);
  window.addEventListener("storage", e => {
    if (watchKeys.has(e.key) && document.visibilityState === "visible") window.location.reload();
  });
})();