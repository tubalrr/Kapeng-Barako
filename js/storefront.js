(() => {
  "use strict";

  const DEFAULT_PRODUCTS = [
    {id:1,name:"Barako Strong",origin:"Batangas",roast:"Dark Roast",price:189,weight:"250g",note:"Bold, smoky roast",emoji:"☕️",bg:"bg-[#F6E8D5]",stock:18,fresh:"Roasted this week",flavor:"Bold • Smoky • Low Acid",brew:"French Press / Espresso",story:"A full-bodied Liberica roast with the unmistakable character of Batangas Barako.",variants:[{weight:"250g",price:189},{weight:"500g",price:349},{weight:"1kg",price:649}],grinds:["Whole Bean","Coarse","Medium","Fine"],addon:"Barako Drip Pack"},
    {id:2,name:"QC Blend",origin:"Cavite",roast:"Medium-Dark",price:245,weight:"500g",note:"Chocolate and brown sugar",emoji:"🤎",bg:"bg-[#EDE3D3]",stock:9,fresh:"Small-batch fresh",flavor:"Chocolate • Brown Sugar • Smooth",brew:"Drip / Pour Over",story:"A balanced local blend with rich sweetness and a smooth finish.",variants:[{weight:"250g",price:139},{weight:"500g",price:245},{weight:"1kg",price:459}],grinds:["Whole Bean","Coarse","Medium","Fine"],addon:"Cold Brew Kit"},
    {id:3,name:"Cold Brew Kit",origin:"Batangas",roast:"Medium Roast",price:320,weight:"Set",note:"Easy to prepare at home",emoji:"🧊",bg:"bg-[#E8DDD0]",stock:6,fresh:"Limited batch",flavor:"Smooth • Cocoa • Refreshing",brew:"Cold Brew",story:"An easy cold-brew setup paired with locally roasted beans.",variants:[{weight:"1 Set",price:320},{weight:"2 Sets",price:599}],grinds:["Coarse","Medium"],addon:"QC Blend"},
    {id:4,name:"Barako Drip Pack",origin:"Batangas",roast:"Dark Roast",price:165,weight:"10 pcs",note:"Simple coffee for the office",emoji:"✨",bg:"bg-[#F5EEE4]",stock:24,fresh:"Packed fresh",flavor:"Strong • Aromatic • Clean",brew:"Drip / Mug",story:"Convenient single-serve Barako for busy mornings.",variants:[{weight:"10 pcs",price:165},{weight:"20 pcs",price:299}],grinds:["Medium"],addon:"Barako Strong"}
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
  const DEFAULT_GALLERY = [
    {id:1,image:"images/gallery-01.svg",title:"Roasted Liberica Beans",caption:"Close-up coffee bean study"},
    {id:2,image:"images/gallery-02.svg",title:"Coffee Farm Origins",caption:"Green farm and coffee cherries"},
    {id:3,image:"images/gallery-03.svg",title:"Steaming Barako Cup",caption:"A warm traditional coffee moment"},
    {id:4,image:"images/gallery-04.svg",title:"Green Beans Drying",caption:"Raw coffee beans under the sun"},
    {id:5,image:"images/gallery-05.svg",title:"Small-Batch Roasting",caption:"Artisanal roasting and packaging"},
    {id:6,image:"images/gallery-06.svg",title:"Rustic Coffee Life",caption:"Local farming and coffee atmosphere"}
  ];

  const DEFAULT_CMS = {
    story:"Mula sa piling Liberica beans ng Batangas, bawat batch ng Kapeng Barako ay ako mismo ang nagroroast, binabantayan ang init, oras, at kulay hanggang lumabas ang tamang tapang at aroma. Hindi tulad ng commercial coffee na mass-produced para sa consistent volume, ang aming roast ay small-batch at hands-on, kaya bawat tasa ay may mas malalim na character, mas mabangong aroma, at tunay na lutong Barako.",
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
  const getGallery = () => {
    const stored = read("kb_gallery", null);
    return Array.isArray(stored) && stored.length === 6 ? stored.map((x,i)=>({
      id:i+1,
      image:String(x.image||DEFAULT_GALLERY[i].image),
      title:String(x.title||DEFAULT_GALLERY[i].title),
      caption:String(x.caption||DEFAULT_GALLERY[i].caption)
    })) : DEFAULT_GALLERY;
  };

  window.KBStore = {
    DEFAULT_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_CMS, DEFAULT_SHIPPING, DEFAULT_GALLERY,
    read, getProducts, getSettings, getCms, getShippingRule, getGallery
  };

  const watchKeys = new Set(["kb_products","kb_settings","kb_cms","kb_gallery","kb_shipping","kb_shipping_rule"]);
  window.addEventListener("storage", e => {
    if (watchKeys.has(e.key) && document.visibilityState === "visible") window.location.reload();
  });
})();