(() => {
  "use strict";
  if (window.KBAdminAuth && !window.KBAdminAuth.guard()) return;

  const STATUS = [
    "Pending",
    "Verified Payment",
    "Processing/Roasting",
    "Ready to Ship",
    "Dispatched",
    "Delivered",
    "Cancelled"
  ];

  const KEY = {
    orders: "kb_orders",
    lastOrder: "kb_last_order",
    inventory: "kb_inventory",
    promos: "kb_promos",
    products: "kb_products",
    settings: "kb_settings",
    gallery: "kb_gallery",
    cms: "kb_cms",
    tickets: "kb_tickets",
    audit: "kb_admin_audit",
    shipping: "kb_shipping_rule"
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const money = n => "₱" + Number(n || 0).toLocaleString("en-PH", {minimumFractionDigits:0, maximumFractionDigits:2});
  const dateOnly = value => value ? new Date(value).toLocaleDateString("en-PH", {year:"numeric",month:"short",day:"numeric"}) : "—";
  const dateTime = value => value ? new Date(value).toLocaleString("en-PH", {year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "—";
  const uid = prefix => prefix + "-" + (crypto.randomUUID ? crypto.randomUUID().slice(0,8).toUpperCase() : Math.random().toString(36).slice(2,10).toUpperCase());
  const safe = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const slug = value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { toast("Browser storage is unavailable."); return false; }
  };
  const toast = msg => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.__kbAdminToast);
    window.__kbAdminToast = setTimeout(() => el.classList.remove("show"), 2400);
  };
  const log = (action, entity, entityId, details = "") => {
    const audit = read(KEY.audit, []);
    audit.unshift({id:uid("LOG"), at:new Date().toISOString(), action, entity, entityId, details});
    write(KEY.audit, audit.slice(0,1000));
  };

  const normalizeOrder = o => ({
    id: o.id || uid("KB"),
    createdAt: o.createdAt || new Date().toISOString(),
    customer: {
      name: o.customer?.name || "",
      phone: o.customer?.phone || "",
      email: o.customer?.email || "",
      address: o.customer?.address || ""
    },
    payment: o.customer?.payment || o.payment || "Cash on Delivery (COD)",
    paymentReference: o.paymentReference || "",
    paymentProofName: o.paymentProofName || "",
    fulfillment: o.customer?.fulfillment || o.fulfillment || "Lalamove",
    items: Array.isArray(o.items) ? o.items : [],
    itemNote: o.itemNote || "",
    total: Number(o.total || 0),
    cogs: Number(o.cogs || 0),
    shippingSubsidy: Number(o.shippingSubsidy || 0),
    affiliateCommission: Number(o.affiliateCommission || 0),
    status: STATUS.includes(o.status) ? o.status : "Pending",
    statusUpdatedAt: o.statusUpdatedAt || o.createdAt || new Date().toISOString(),
    tags: Array.isArray(o.tags) ? o.tags : []
  });

  const getOrders = () => {
    const stored = read(KEY.orders, []);
    let orders = Array.isArray(stored) ? stored.map(normalizeOrder) : [];
    const last = read(KEY.lastOrder, null);
    if (last && last.id && !orders.some(o => o.id === last.id)) orders = [normalizeOrder(last), ...orders];
    return orders;
  };

  const DEFAULT_PRODUCTS = [
    {id:1,name:"Barako Strong",origin:"Batangas",roast:"Dark Roast",price:189,weight:"250g",note:"Bold, smoky roast",emoji:"☕️",bg:"bg-[#F6E8D5]",stock:18,fresh:"Roasted this week",flavor:"Bold • Smoky • Low Acid",brew:"French Press / Espresso",story:"A full-bodied Liberica roast with the unmistakable character of Batangas Barako.",variants:[{weight:"250g",price:189},{weight:"500g",price:349},{weight:"1kg",price:649}],grinds:["Whole Bean","Coarse","Medium","Fine"],addon:"Barako Drip Pack"},
    {id:2,name:"QC Blend",origin:"Cavite",roast:"Medium-Dark",price:245,weight:"500g",note:"Chocolate and brown sugar",emoji:"🤎",bg:"bg-[#EDE3D3]",stock:9,fresh:"Small-batch fresh",flavor:"Chocolate • Brown Sugar • Smooth",brew:"Drip / Pour Over",story:"A balanced local blend with rich sweetness and a smooth finish.",variants:[{weight:"250g",price:139},{weight:"500g",price:245},{weight:"1kg",price:459}],grinds:["Whole Bean","Coarse","Medium","Fine"],addon:"Cold Brew Kit"},
    {id:3,name:"Cold Brew Kit",origin:"Batangas",roast:"Medium Roast",price:320,weight:"Set",note:"Easy to prepare at home",emoji:"🧊",bg:"bg-[#E8DDD0]",stock:6,fresh:"Limited batch",flavor:"Smooth • Cocoa • Refreshing",brew:"Cold Brew",story:"An easy cold-brew setup paired with locally roasted beans.",variants:[{weight:"1 Set",price:320},{weight:"2 Sets",price:599}],grinds:["Coarse","Medium"],addon:"QC Blend"},
    {id:4,name:"Barako Drip Pack",origin:"Batangas",roast:"Dark Roast",price:165,weight:"10 pcs",note:"Simple coffee for the office",emoji:"✨",bg:"bg-[#F5EEE4]",stock:24,fresh:"Packed fresh",flavor:"Strong • Aromatic • Clean",brew:"Drip / Mug",story:"Convenient single-serve Barako for busy mornings.",variants:[{weight:"10 pcs",price:165},{weight:"20 pcs",price:299}],grinds:["Medium"],addon:"Barako Strong"}
  ];
  const DEFAULT_SETTINGS = {
    paymentMethods:["GCash","Cash on Delivery (COD)","Bank Transfer"],
    fulfillmentMethods:["Lalamove","J&T","LBC","QC Meetup"],
    shippingNote:"Courier fee is based on the selected courier and delivery distance/location. Final fee is confirmed before fulfillment.",
    orderNote:"We confirm the final delivery details before fulfillment.",
    gcashInstructions:"ILAG — add the buyer’s GCash name/number or QR instructions in Store Settings.",
    bankTransferInstructions:"ILAG — add the buyer’s bank name, account name/number, and transfer instructions in Store Settings.",
    email:"ILAG",phone:"ILAG",location:"ILAG",
    facebook:"ILAG",instagram:"ILAG",tiktok:"ILAG",tagline:"Gawa sa Batangas"
  };

  const normalizeProduct = p => ({
    ...p,
    price:Number(p?.price||0),
    variants:Array.isArray(p?.variants)&&p.variants.length?p.variants:[{weight:p?.weight||"Pack",price:Number(p?.price||0)}],
    grinds:Array.isArray(p?.grinds)&&p.grinds.length?p.grinds:["Whole Bean","Coarse","Medium","Fine"]
  });

  let orders = getOrders();
  let inventory = read(KEY.inventory, []);
  let promos = read(KEY.promos, []);
  let products = (read(KEY.products, null) || DEFAULT_PRODUCTS).map(normalizeProduct);
  let settings = {...DEFAULT_SETTINGS,...(read(KEY.settings,{})||{})};
  settings.paymentMethods=Array.isArray(settings.paymentMethods)&&settings.paymentMethods.length?[...settings.paymentMethods]:[...DEFAULT_SETTINGS.paymentMethods];
  settings.paymentMethods=[...new Set(settings.paymentMethods.map(x=>x==="Cash on Delivery"?"Cash on Delivery (COD)":x))];
  ["GCash","Cash on Delivery (COD)","Bank Transfer"].forEach(method=>{if(!settings.paymentMethods.includes(method))settings.paymentMethods.push(method);});
  const DEFAULT_GALLERY = [
    {id:1,image:"images/gallery-01.svg",title:"Roasted Liberica Beans",caption:"Close-up coffee bean study"},
    {id:2,image:"images/gallery-02.svg",title:"Coffee Farm Origins",caption:"Green farm and coffee cherries"},
    {id:3,image:"images/gallery-03.svg",title:"Steaming Barako Cup",caption:"A warm traditional coffee moment"},
    {id:4,image:"images/gallery-04.svg",title:"Green Beans Drying",caption:"Raw coffee beans under the sun"},
    {id:5,image:"images/gallery-05.svg",title:"Small-Batch Roasting",caption:"Artisanal roasting and packaging"},
    {id:6,image:"images/gallery-06.svg",title:"Rustic Coffee Life",caption:"Local farming and coffee atmosphere"}
  ];
  let gallery = read(KEY.gallery, null) || DEFAULT_GALLERY.map(x=>({...x}));
  let cms = read(KEY.cms, null);
  let tickets = read(KEY.tickets, []);
  let invFilter = "";
  let orderView = "kanban";
  let currentSegment = "all";

  const defaultStory = "Mula sa piling Liberica beans ng Batangas, bawat batch ng Kapeng Barako ay ako mismo ang nagroroast, binabantayan ang init, oras, at kulay hanggang lumabas ang tamang tapang at aroma. Hindi tulad ng commercial coffee na mass-produced para sa consistent volume, ang aming roast ay small-batch at hands-on, kaya bawat tasa ay may mas malalim na character, mas mabangong aroma, at tunay na lutong Barako.";
  const defaultDelivery = "Payment: GCash, Maya, Cash on Delivery (COD). Fulfillment: Lalamove, J&T, LBC, or meetup within Quezon City. Shipping fee is based on the selected courier and delivery distance/location. Free shipping when you buy 2 packs or more.";
  const defaultCms = {
    heroEyebrow:"Freshly roasted • Quezon City",
    heroTitle:"Bold coffee.\nMade for\neveryday.",
    heroDescription:"Personal na roasted, small-batch, at may tunay na character ng Barako.",
    story:defaultStory,
    delivery:defaultDelivery,
    benefits:[
      {title:"Matapang / Pure",desc:"Puro at walang halong iba",icon:"☕"},
      {title:"Gawang Batangas",desc:"Galing sa mga piling sakahan ng Batangas",icon:"⌂"},
      {title:"Fresh Roast",desc:"Personal na nire-roast sa maliliit na batch",icon:"✦"}
    ],
    brewSteps:[
      {title:"Pakulo",desc:"Pakuluan ang malinis na tubig hanggang umabot sa tamang init."},
      {title:"Lagay kape",desc:"Ilagay ang tamang dami ng Barako coffee ayon sa gusto mong tapang."},
      {title:"Salain",desc:"Hayaang lumabas ang aroma at salain bago ihain nang mainit."}
    ],
    faqs:[
      {q:"Matapang ba masyado?",a:"May bold na Barako character, pero puwedeng i-adjust ang dami ng kape at tubig ayon sa panlasa."},
      {q:"Ilang araw shelf life / May expiration ba?",a:"Ang actual shelf life at expiration date ay dapat sundin ayon sa packaging at batch label. Ilagay ang tunay na expiry details bago magbenta."},
      {q:"Pwede ba sa may acid?",a:"Iba-iba ang tolerance ng bawat tao. Kung may acid reflux o sensitibong tiyan, mas ligtas na tanungin ang iyong healthcare professional kung angkop sa iyo ang kape."}
    ],
    announcement:{title:"Bagong ani na!",body:"Ilagay dito ang latest approved roast or harvest announcement.",date:""}
  };
  if (!cms) cms = defaultCms;
  else cms = {...defaultCms,...cms,benefits:Array.isArray(cms.benefits)&&cms.benefits.length===3?cms.benefits:defaultCms.benefits,brewSteps:Array.isArray(cms.brewSteps)&&cms.brewSteps.length===3?cms.brewSteps:defaultCms.brewSteps,faqs:Array.isArray(cms.faqs)?cms.faqs:defaultCms.faqs};

  const saveOrders = () => write(KEY.orders, orders);
  const saveInventory = () => write(KEY.inventory, inventory);
  const savePromos = () => write(KEY.promos, promos);
  const saveProducts = () => write(KEY.products, products);
  const saveSettings = () => write(KEY.settings, settings);
  const saveGallery = () => write(KEY.gallery, gallery);
  const saveTickets = () => write(KEY.tickets, tickets);
  const saveCms = () => write(KEY.cms, cms);

  function navTo(section) {
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === section));
    $$("[data-section-panel]").forEach(p => {
      const active = p.dataset.sectionPanel === section;
      p.hidden = !active;
      p.classList.toggle("active", active);
    });
    const label = $(".nav-item.active")?.textContent?.trim() || "Overview";
    $("#page-heading").textContent = label;
    if (window.innerWidth < 900) document.body.classList.remove("menu-open");
    if (section === "overview") renderOverview();
    if (section === "orders") renderOrders();
    if (section === "customers") renderCustomers();
    if (section === "inventory") renderInventory();
    if (section === "financials") renderFinancials();
    if (section === "products") renderProducts();
    if (section === "gallery") renderGallery();
    if (section === "promos") renderPromos();
    if (section === "settings") renderSettings();
    if (section === "regional-shipping") renderRegionalShipping();
    if (section === "cms") renderCms();
    if (section === "support") renderTickets();
    if (section === "audit") renderAudit();
  }

  function statusClass(status) {
    return {
      "Pending":"pending",
      "Verified Payment":"verified",
      "Processing/Roasting":"processing",
      "Ready to Ship":"ready",
      "Dispatched":"dispatched",
      "Delivered":"delivered",
      "Cancelled":"cancelled"
    }[status] || "";
  }

  function orderMatches(o) {
    const search = ($("#order-search")?.value || "").trim().toLowerCase();
    const payment = $("#order-payment-filter")?.value || "";
    const courier = $("#order-courier-filter")?.value || "";
    const status = $("#order-status-filter")?.value || "";
    const hay = [o.id,o.customer.name,o.customer.phone,o.customer.address,o.payment,o.fulfillment].join(" ").toLowerCase();
    return (!search || hay.includes(search)) &&
      (!payment || o.payment === payment) &&
      (!courier || o.fulfillment === courier) &&
      (!status || o.status === status);
  }

  function renderOverview() {
    orders = getOrders();
    inventory = read(KEY.inventory, []);
    tickets = read(KEY.tickets, []);
    const revenue = orders.reduce((s,o) => s + o.total, 0);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startWeek = startToday - ((now.getDay() + 6) % 7) * 86400000;
    const todaySales = orders.filter(o => new Date(o.createdAt || 0).getTime() >= startToday).reduce((s,o) => s + Number(o.total || 0), 0);
    const weekSales = orders.filter(o => new Date(o.createdAt || 0).getTime() >= startWeek).reduce((s,o) => s + Number(o.total || 0), 0);
    const customerMap = buildCustomers(orders);
    const low = inventory.filter(i => Number(i.stock || 0) <= Number(i.threshold || 0) && Number(i.threshold || 0) > 0).length;
    const openTickets = tickets.filter(t => !["Resolved","Closed"].includes(t.status)).length;
    $("#metric-orders").textContent = orders.length;
    $("#metric-low-stock").textContent = low;
    $("#metric-tickets").textContent = openTickets;
    $("#metric-revenue").textContent = money(revenue);
    $("#metric-today-sales").textContent = money(todaySales);
    $("#metric-week-sales").textContent = money(weekSales);
    $("#metric-customers").textContent = customerMap.length;
    $("#metric-low-stock-top").textContent = low;
    $("#metric-pending").textContent = orders.filter(o=>o.status==="Pending").length;
    $("#metric-processing").textContent = orders.filter(o=>o.status==="Processing/Roasting").length;
    $("#metric-ready").textContent = orders.filter(o=>o.status==="Ready to Ship").length;
    $("#metric-delivered").textContent = orders.filter(o=>o.status==="Delivered").length;

    const queue = orders.filter(o=>["Pending","Verified Payment","Processing/Roasting","Ready to Ship"].includes(o.status)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).slice(0,12);
    const root = $("#overview-queue");
    if (!queue.length) {
      root.innerHTML = '<div class="empty"><strong>No fulfillment queue yet</strong>Actual orders will appear here as they are recorded.</div>';
      return;
    }
    root.innerHTML = '<div class="mini-row head"><span>Order</span><span>Customer</span><span>Status</span><span>Total</span><span>Created</span></div>' +
      queue.map(o => '<div class="mini-row"><span><button class="table-action" data-open-order="'+safe(o.id)+'">'+safe(o.id)+'</button></span><span>'+safe(o.customer.name || "Unnamed customer")+'</span><span><span class="status-badge '+statusClass(o.status)+'">'+safe(o.status)+'</span></span><span>'+money(o.total)+'</span><span>'+dateTime(o.createdAt)+'</span></div>').join("");
  }

  function renderOrders() {
    orders = getOrders();
    const filter = orders.filter(orderMatches);
    const stateSelect = $("#order-status-filter");
    if (stateSelect && stateSelect.options.length === 1) {
      STATUS.forEach(s => stateSelect.insertAdjacentHTML("beforeend", '<option value="'+safe(s)+'">'+safe(s)+'</option>'));
    }
    if (orderView === "table") {
      $("#orders-kanban").hidden = true;
      $("#orders-table").hidden = false;
      renderOrderTable(filter);
    } else {
      $("#orders-kanban").hidden = false;
      $("#orders-table").hidden = true;
      renderKanban(filter);
    }
  }

  function renderKanban(list) {
    const root = $("#orders-kanban");
    root.innerHTML = STATUS.map(status => {
      const items = list.filter(o=>o.status===status);
      return '<div class="kanban-col" data-drop-status="'+safe(status)+'" tabindex="0">'+
        '<div class="kanban-head"><h4>'+safe(status)+'</h4><span class="count-pill">'+items.length+'</span></div>'+
        (items.length ? items.map(orderCard).join("") : '<div class="empty">No orders</div>')+
      '</div>';
    }).join("");
    bindDnD();
  }

  function orderCard(o) {
    const items = o.items.length ? o.items.map(i=>safe(i.name || "Item")+" × "+Number(i.qty||1)).join(", ") : safe(o.itemNote || "Items not specified");
    return '<article class="order-card" draggable="true" data-order-id="'+safe(o.id)+'">'+
      '<div class="order-top"><span class="order-id">'+safe(o.id)+'</span><span class="status-badge '+statusClass(o.status)+'">'+safe(o.status)+'</span></div>'+
      '<div class="order-customer">'+safe(o.customer.name || "Unnamed customer")+'</div>'+
      '<div class="order-meta">'+safe(items)+'</div>'+
      '<div class="tags"><span class="tag payment">'+safe(o.payment)+'</span><span class="tag courier">'+safe(o.fulfillment)+'</span></div>'+
      '<div class="order-meta">'+money(o.total)+' · '+dateTime(o.createdAt)+'</div>'+
      '<div class="card-actions">'+
        '<button class="btn secondary" data-edit-order="'+safe(o.id)+'" type="button">Edit</button>'+
        '<button class="btn secondary" data-waybill="'+safe(o.id)+'" type="button">Waybill</button>'+
      '</div>'+
    '</article>';
  }

  function renderOrderTable(list) {
    const root = $("#orders-table");
    if (!list.length) {
      root.innerHTML = '<div class="empty"><strong>No orders found</strong>Orders are pulled from the current store order records.</div>';
      return;
    }
    root.innerHTML = '<table><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th>Status</th><th>Total</th><th>Created</th><th>Actions</th></tr></thead><tbody>'+
      list.map(o=>'<tr><td><button class="table-action" data-open-order="'+safe(o.id)+'">'+safe(o.id)+'</button></td><td>'+safe(o.customer.name||"—")+'<br><span class="panel-note">'+safe(o.customer.phone||"")+(o.customer.email?" · "+safe(o.customer.email):"")+'</span></td><td><span class="tag payment">'+safe(o.payment)+'</span></td><td><span class="tag courier">'+safe(o.fulfillment)+'</span></td><td><span class="status-badge '+statusClass(o.status)+'">'+safe(o.status)+'</span></td><td>'+money(o.total)+'</td><td>'+dateTime(o.createdAt)+'</td><td><button class="table-action" data-edit-order="'+safe(o.id)+'">Edit</button><button class="table-action" data-waybill="'+safe(o.id)+'">Waybill</button><button class="table-action" data-notify-order="'+safe(o.id)+'">Notify</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function bindDnD() {
    $$(".order-card").forEach(card => {
      card.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", card.dataset.orderId);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", e => {
        if (e.target.closest("button")) return;
        openOrder(card.dataset.orderId);
      });
    });
    $$(".kanban-col").forEach(col => {
      col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drag-over"); });
      col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
      col.addEventListener("drop", e => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/plain");
        changeStatus(id, col.dataset.dropStatus, true);
      });
    });
  }

  function changeStatus(id, status, manual=false) {
    const o = orders.find(x=>x.id===id);
    if (!o || !STATUS.includes(status) || o.status===status) return;
    const previous = o.status;
    o.status = status;
    o.statusUpdatedAt = new Date().toISOString();
    saveOrders();
    log("Status override", "order", id, previous+" → "+status+(manual ? " via Kanban drag" : ""));
    toast(id+" moved to "+status);
    renderOrders(); renderOverview(); renderAudit();
  }

  function openOrder(id) {
    const d = $("#order-dialog");
    const o = orders.find(x=>x.id===id);
    $("#order-edit-id").value = o?.id || "";
    $("#order-modal-title").textContent = o ? "Edit " + o.id : "New order";
    $("#order-name").value = o?.customer.name || "";
    $("#order-phone").value = o?.customer.phone || "";
    $("#order-email").value = o?.customer.email || "";
    $("#order-address").value = o?.customer.address || "";
    $("#order-payment").value = o?.payment || "GCash";
    $("#order-fulfillment").value = o?.fulfillment || "Lalamove";
    $("#order-status").innerHTML = STATUS.map(s=>'<option>'+safe(s)+'</option>').join("");
    $("#order-status").value = o?.status || "Pending";
    $("#order-cogs").value = o?.cogs || 0;
    $("#order-shipping").value = o?.shippingSubsidy || 0;
    $("#order-affiliate").value = o?.affiliateCommission || 0;
    $("#order-total").value = o?.total || 0;
    $("#order-items").value = o?.items?.map(i => (i.name || "Item")+" × "+Number(i.qty||1)).join("\n") || o?.itemNote || "";
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open","");
  }

  function saveOrderFromForm(e) {
    e.preventDefault();
    const id = $("#order-edit-id").value.trim();
    const lines = $("#order-items").value.split("\n").map(s=>s.trim()).filter(Boolean).map(line=>{
      const m=line.match(/^(.*?)\s*[×x]\s*(\d+(?:\.\d+)?)$/);
      return m ? {name:m[1].trim(), qty:Number(m[2])} : {name:line, qty:1};
    });
    const payload = {
      id:id || uid("KB"),
      createdAt:id ? (orders.find(o=>o.id===id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      customer:{name:$("#order-name").value.trim(),phone:$("#order-phone").value.trim(),email:$("#order-email").value.trim(),address:$("#order-address").value.trim()},
      payment:$("#order-payment").value,
      paymentReference:orders.find(o=>o.id===id)?.paymentReference||"",
      paymentProofName:orders.find(o=>o.id===id)?.paymentProofName||"",
      fulfillment:$("#order-fulfillment").value,
      status:$("#order-status").value,
      statusUpdatedAt:new Date().toISOString(),
      cogs:Number($("#order-cogs").value||0),
      shippingSubsidy:Number($("#order-shipping").value||0),
      affiliateCommission:Number($("#order-affiliate").value||0),
      items:lines,
      itemNote:lines.length ? "" : $("#order-items").value.trim(),
      total:Number($("#order-total").value||0)
    };
    const existingIndex = orders.findIndex(o=>o.id===id);
    if (existingIndex >= 0) {
      const prev = orders[existingIndex];
      orders[existingIndex] = normalizeOrder(payload);
      log("Order updated","order",id,prev.status+"; payment="+prev.payment+"; fulfillment="+prev.fulfillment);
    } else {
      orders.unshift(normalizeOrder(payload));
      log("Order created","order",payload.id,"Created from admin console");
    }
    saveOrders();
    $("#order-dialog").close();
    toast("Order saved");
    renderOrders();renderOverview();renderFinancials();renderAudit();
  }

  function generateWaybill(id) {
    const o = orders.find(x=>x.id===id);
    if (!o) return;
    const popup = window.open("", "_blank", "width=850,height=900");
    if (!popup) { toast("Allow pop-ups to print the waybill."); return; }
    popup.document.write('<!doctype html><html><head><title>Waybill '+safe(o.id)+'</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#2B1B12}h1{font-size:25px}table{width:100%;border-collapse:collapse;margin-top:22px}td,th{padding:10px;border:1px solid #ddd;text-align:left}small{color:#666}.box{border:2px solid #2B1B12;padding:18px;border-radius:12px;margin:18px 0}.stamp{font-size:18px;font-weight:700}</style></head><body>'+
      '<h1>Kapeng Barako — Dispatch Waybill</h1><div class="box"><div class="stamp">'+safe(o.id)+'</div><small>Created '+safe(dateTime(o.createdAt))+'</small></div>'+
      '<table><tr><th>Customer</th><td>'+safe(o.customer.name)+'</td></tr><tr><th>Phone</th><td>'+safe(o.customer.phone)+'</td></tr><tr><th>Address</th><td>'+safe(o.customer.address)+'</td></tr><tr><th>Payment</th><td>'+safe(o.payment)+'</td></tr><tr><th>Fulfillment</th><td>'+safe(o.fulfillment)+'</td></tr><tr><th>Status</th><td>'+safe(o.status)+'</td></tr><tr><th>Total</th><td>'+money(o.total)+'</td></tr></table>'+
      '<h3>Items</h3><table><tr><th>Item</th><th>Qty</th></tr>'+(o.items.length?o.items.map(i=>'<tr><td>'+safe(i.name)+'</td><td>'+Number(i.qty||1)+'</td></tr>').join(""):'<tr><td colspan="2">'+safe(o.itemNote||"Not specified")+'</td></tr>')+'</table>'+
      '<p><small>Dispatch document generated from the current order record.</small></p><script>window.onload=()=>window.print();</script></body></html>');
    popup.document.close();
    log("Waybill generated","order",id,"Print window opened");
  }

  function notifyOrder(id) {
    const o = orders.find(x=>x.id===id);
    if (!o) return;
    const msg = "Kapeng Barako order "+o.id+" is now "+o.status+". Thank you.";
    const choice = window.prompt("Type SMS or EMAIL", "SMS");
    if (!choice) return;
    if (choice.toUpperCase()==="SMS" && o.customer.phone) {
      window.location.href = "sms:"+encodeURIComponent(o.customer.phone)+"?body="+encodeURIComponent(msg);
      log("Dispatch notification prepared","order",id,"SMS");
    } else if (choice.toUpperCase()==="EMAIL") {
      if(o.customer.email){ window.location.href = "mailto:"+encodeURIComponent(o.customer.email)+"?subject="+encodeURIComponent("Kapeng Barako — "+o.id)+"&body="+encodeURIComponent(msg); log("Dispatch notification prepared","order",id,"Email"); } else { toast("Add the customer email before sending an email notification."); }
      log("Dispatch notification prepared","order",id,"Email");
    } else toast("The order must contain a customer phone number for SMS.");
  }

  function renderProducts() {
    products = (read(KEY.products, products) || products).map(normalizeProduct);
    const root = $("#products-table");
    if (!products.length) {
      root.innerHTML = '<div class="empty"><strong>No products</strong>Add the client’s real products here.</div>';
      return;
    }
    root.innerHTML = '<table><thead><tr><th>Product</th><th>Variants</th><th>Grinds</th><th>Origin</th><th>Roast</th><th>Actions</th></tr></thead><tbody>'+
      products.map(p=>'<tr><td><strong>'+safe(p.name)+'</strong><br><span class="panel-note">'+money(p.price)+' · '+safe(p.weight||"")+'</span></td><td>'+safe(p.variants.map(v=>v.weight+" · "+money(v.price)).join(" | "))+'</td><td>'+safe(p.grinds.join(" · "))+'</td><td>'+safe(p.origin||"ILAG")+'</td><td>'+safe(p.roast||"ILAG")+'</td><td><button class="table-action" data-edit-product="'+safe(p.id)+'">Edit</button><button class="table-action" data-delete-product="'+safe(p.id)+'">Delete</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function openProduct(id){
    const p=products.find(x=>String(x.id)===String(id));
    $("#product-edit-id").value=p?.id||"";
    $("#product-name").value=p?.name||"";
    $("#product-price").value=p?.price||0;
    $("#product-weight").value=p?.weight||p?.variants?.[0]?.weight||"";
    $("#product-emoji").value=p?.emoji||"☕️";
    $("#product-note").value=p?.note||"";
    $("#product-variants").value=JSON.stringify(p?.variants||[],null,2);
    $("#product-grinds").value=(p?.grinds||[]).join("\n");
    const d=$("#product-dialog");
    if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  }

  function saveProductFromForm(e){
    e.preventDefault();
    const id=$("#product-edit-id").value.trim();
    let variants=[];
    try { variants=JSON.parse($("#product-variants").value||"[]"); } catch { toast("Variants JSON is invalid."); return; }
    variants=Array.isArray(variants)?variants.filter(v=>v&&v.weight&&Number.isFinite(Number(v.price))).map(v=>({weight:String(v.weight),price:Number(v.price)})):[];
    if(!variants.length) variants=[{weight:$("#product-weight").value.trim(),price:Number($("#product-price").value||0)}];
    const grinds=$("#product-grinds").value.split("\n").map(s=>s.trim()).filter(Boolean);
    const base=products.find(p=>String(p.id)===String(id))||{};
    const payload={...base,id:id||uid("PROD"),name:$("#product-name").value.trim(),price:Number($("#product-price").value||variants[0].price),weight:$("#product-weight").value.trim()||variants[0].weight,note:$("#product-note").value.trim(),emoji:$("#product-emoji").value.trim()||"☕️",origin:base.origin||"ILAG",roast:base.roast||"ILAG",bg:base.bg||"bg-[#F6E8D5]",variants,grinds:grinds.length?grinds:["Whole Bean"],stock:base.stock??0,fresh:base.fresh||"",flavor:base.flavor||"",brew:base.brew||"",story:base.story||"",addon:base.addon||""};
    if(!payload.name){toast("Product name is required.");return;}
    const idx=products.findIndex(p=>String(p.id)===String(id));
    if(idx>=0){products[idx]=normalizeProduct(payload);log("Product updated","product",id,payload.name);}
    else{products.unshift(normalizeProduct(payload));log("Product created","product",payload.id,payload.name);}
    saveProducts();$("#product-dialog").close();toast("Product saved");renderProducts();renderAudit();
  }

  function renderSettings(){
    settings={...DEFAULT_SETTINGS,...(read(KEY.settings,settings)||{})};
    settings.paymentMethods=Array.isArray(settings.paymentMethods)&&settings.paymentMethods.length?[...settings.paymentMethods]:[...DEFAULT_SETTINGS.paymentMethods];
    settings.paymentMethods=[...new Set(settings.paymentMethods.map(x=>x==="Cash on Delivery"?"Cash on Delivery (COD)":x))];
    ["GCash","Cash on Delivery (COD)","Bank Transfer"].forEach(method=>{if(!settings.paymentMethods.includes(method))settings.paymentMethods.push(method);});
    $$(".setting-payment").forEach(x=>x.checked=settings.paymentMethods.includes(x.value));
    $$(" .setting-fulfillment").forEach(x=>x.checked=settings.fulfillmentMethods.includes(x.value));
    $("#settings-shipping-note").value=settings.shippingNote||"";
    $("#settings-order-note").value=settings.orderNote||"";
    $("#settings-gcash-instructions").value=settings.gcashInstructions||"";
    $("#settings-bank-instructions").value=settings.bankTransferInstructions||"";
    $("#settings-email").value=settings.email||"ILAG";
    $("#settings-phone").value=settings.phone||"ILAG";
    $("#settings-location").value=settings.location||"ILAG";
    $("#settings-facebook").value=settings.facebook||"ILAG";
    $("#settings-instagram").value=settings.instagram||"ILAG";
    $("#settings-tiktok").value=settings.tiktok||"ILAG";
    $("#settings-tagline").value=settings.tagline||"Gawa sa Batangas";
  }

  function saveSettingsFromForm(){
    const payments=$$(".setting-payment:checked").map(x=>x.value);
    const fulfillments=$$(".setting-fulfillment:checked").map(x=>x.value);
    settings={...settings,
      paymentMethods:payments.length?payments:DEFAULT_SETTINGS.paymentMethods,
      fulfillmentMethods:fulfillments.length?fulfillments:DEFAULT_SETTINGS.fulfillmentMethods,
      shippingNote:$("#settings-shipping-note").value.trim(),
      orderNote:$("#settings-order-note").value.trim(),
      gcashInstructions:$("#settings-gcash-instructions").value.trim()||"ILAG",
      bankTransferInstructions:$("#settings-bank-instructions").value.trim()||"ILAG",
      email:$("#settings-email").value.trim()||"ILAG",
      phone:$("#settings-phone").value.trim()||"ILAG",
      location:$("#settings-location").value.trim()||"ILAG",
      facebook:$("#settings-facebook").value.trim()||"ILAG",
      instagram:$("#settings-instagram").value.trim()||"ILAG",
      tiktok:$("#settings-tiktok").value.trim()||"ILAG",
      tagline:$("#settings-tagline").value.trim()||"Gawa sa Batangas"
    };
    saveSettings();
    log("Store settings updated","settings","store","payment, fulfillment, contact, and social settings");
    toast("Store settings saved");
  }

  function renderGallery(){
    gallery = read(KEY.gallery, gallery) || DEFAULT_GALLERY;
    if(!Array.isArray(gallery) || gallery.length !== 6) gallery = DEFAULT_GALLERY.map(x=>({...x}));
    const root=$("#gallery-editor");
    if(!root) return;
    root.innerHTML=gallery.map((g,i)=>'<div class="gallery-admin-row">'+
      '<div class="gallery-admin-preview"><img src="'+safe((g.image||"").startsWith("images/")?"../"+g.image:g.image||"")+'" alt="" loading="lazy"><span>0'+(i+1)+'</span></div>'+
      '<div class="form-grid gallery-admin-fields">'+
        '<label>Local image path<input class="input gallery-image" value="'+safe(g.image||"")+'" placeholder="images/gallery-01.jpg"></label>'+
        '<label>Title<input class="input gallery-title" value="'+safe(g.title||"")+'" placeholder="Gallery title"></label>'+
        '<label class="full">Caption<input class="input gallery-caption" value="'+safe(g.caption||"")+'" placeholder="Short caption"></label>'+
      '</div>'+
    '</div>').join("");
  }

  function saveGalleryFromEditor(){
    const rows=$(".gallery-admin-row");
    if(rows.length!==6){toast("Gallery must contain exactly 6 slots.");return;}
    gallery=rows.map((row,i)=>({
      id:i+1,
      image:$(".gallery-image",row)?.value.trim()||DEFAULT_GALLERY[i].image,
      title:$(".gallery-title",row)?.value.trim()||DEFAULT_GALLERY[i].title,
      caption:$(".gallery-caption",row)?.value.trim()||DEFAULT_GALLERY[i].caption
    }));
    saveGallery();
    log("Gallery updated","gallery","site","Six local gallery slots updated");
    toast("Gallery saved");
    renderGallery();
  }

  function resetGallery(){
    gallery=DEFAULT_GALLERY.map(x=>({...x}));
    saveGallery();
    log("Gallery reset","gallery","site","Restored six local placeholders");
    toast("Gallery placeholders restored");
    renderGallery();
  }

  function renderInventory() {
    inventory = read(KEY.inventory, []);
    const total = inventory.reduce((s,i)=>s+Number(i.stock||0),0);
    const green = inventory.filter(i=>i.category==="beans").reduce((s,i)=>s+Number(i.stock||0),0);
    const pack = inventory.filter(i=>i.category==="packaging").reduce((s,i)=>s+Number(i.stock||0),0);
    const alerts = inventory.filter(i=>Number(i.threshold||0)>0 && Number(i.stock||0)<=Number(i.threshold||0)).length;
    $("#inv-total").textContent = total.toLocaleString();
    $("#inv-green").textContent = green.toLocaleString();
    $("#inv-pack").textContent = pack.toLocaleString();
    $("#inv-alerts").textContent = alerts;
    const list = inventory.filter(i=>!invFilter || i.category===invFilter);
    const root = $("#inventory-table");
    if (!list.length) {
      root.innerHTML = '<div class="empty"><strong>No inventory records</strong>Add actual green-bean or packaging stock. Nothing is pre-seeded.</div>';
      return;
    }
    root.innerHTML = '<table><thead><tr><th>Item</th><th>Category</th><th>Batch / SKU</th><th>Stock</th><th>Threshold</th><th>Coverage</th><th>Roast</th><th>Expiry</th><th>Actions</th></tr></thead><tbody>'+
      list.map(i=>{
        const days = Number(i.usage||0)>0 ? Number(i.stock||0)/Number(i.usage) : null;
        const daysToExpiry = i.expiry ? Math.ceil((new Date(i.expiry)-new Date())/86400000) : null;
        const alert = Number(i.threshold||0)>0 && Number(i.stock||0)<=Number(i.threshold||0);
        return '<tr><td><strong>'+safe(i.name)+'</strong><br><span class="panel-note">'+safe(i.unit||"unit")+'</span></td><td>'+safe(i.category==="beans"?"Green beans":"Packaging")+'</td><td>'+safe(i.sku||"—")+'</td><td><strong>'+Number(i.stock||0)+'</strong> '+safe(i.unit||"")+'</td><td>'+Number(i.threshold||0)+'</td><td>'+(days===null?"No forecast":Math.max(0,days).toFixed(1)+" days")+'</td><td>'+dateOnly(i.roast)+'</td><td>'+(daysToExpiry===null?"—":daysToExpiry<0?"Expired":daysToExpiry+" days")+'</td><td><button class="table-action" data-edit-inv="'+safe(i.id)+'">Edit</button><button class="table-action" data-delete-inv="'+safe(i.id)+'">Delete</button></td></tr>'+(alert?'<tr><td colspan="9"><span class="status-badge pending">Low stock</span> '+safe(i.name)+' is at or below its threshold.</td></tr>': '');
      }).join("")+
      '</tbody></table>';
  }

  function openInventory(id) {
    const d=$("#inventory-dialog"), i=inventory.find(x=>x.id===id);
    $("#inv-edit-id").value=i?.id||"";
    $("#inventory-modal-title").textContent=i?"Edit inventory item":"Add inventory item";
    $("#inv-name").value=i?.name||"";
    $("#inv-category").value=i?.category||"beans";
    $("#inv-sku").value=i?.sku||"";
    $("#inv-unit").value=i?.unit||"";
    $("#inv-stock").value=i?.stock??0;
    $("#inv-threshold").value=i?.threshold??0;
    $("#inv-usage").value=i?.usage??0;
    $("#inv-roast").value=i?.roast||"";
    $("#inv-expiry").value=i?.expiry||"";
    if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  }
  function saveInventoryFromForm(e) {
    e.preventDefault();
    const id=$("#inv-edit-id").value.trim();
    const payload={id:id||uid("INV"),name:$("#inv-name").value.trim(),category:$("#inv-category").value,sku:$("#inv-sku").value.trim(),unit:$("#inv-unit").value.trim(),stock:Number($("#inv-stock").value||0),threshold:Number($("#inv-threshold").value||0),usage:Number($("#inv-usage").value||0),roast:$("#inv-roast").value,expiry:$("#inv-expiry").value};
    if(!payload.name){toast("Item name is required.");return;}
    const idx=inventory.findIndex(i=>i.id===id);
    if(idx>=0){inventory[idx]=payload;log("Inventory updated","inventory",id,payload.name);}else{inventory.unshift(payload);log("Inventory created","inventory",payload.id,payload.name);}
    saveInventory();$("#inventory-dialog").close();toast("Inventory saved");renderInventory();renderOverview();renderAudit();
  }

  function buildCustomers(sourceOrders = getOrders()) {
    const map = new Map();
    sourceOrders.forEach(o => {
      const c = o.customer || {};
      const key = String(c.email || c.phone || c.name || "Unknown").trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key,{name:c.name||"Unnamed",phone:c.phone||"",email:c.email||"",address:c.address||"",orders:0,revenue:0,lastOrder:o.createdAt||"",locations:new Map()});
      const item=map.get(key);
      item.orders += 1;
      item.revenue += Number(o.total||0);
      if(new Date(o.createdAt||0)>new Date(item.lastOrder||0)) item.lastOrder=o.createdAt||"";
      const loc=String(c.address||"").split(",")[0].trim() || "—";
      item.locations.set(loc,(item.locations.get(loc)||0)+1);
      if(!item.address && c.address) item.address=c.address;
    });
    return [...map.values()].map(x=>({...x,location:[...x.locations.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"—"})).sort((a,b)=>b.revenue-a.revenue);
  }

  function renderCustomers(){
    orders=getOrders();
    const customers=buildCustomers(orders);
    const search=($("#customer-search")?.value||"").trim().toLowerCase();
    const filtered=customers.filter(c=>[c.name,c.phone,c.email,c.address,c.location].join(" ").toLowerCase().includes(search));
    const repeat=customers.filter(c=>c.orders>=2).length;
    const locations={}; customers.forEach(c=>{locations[c.location]=(locations[c.location]||0)+1;});
    const top=Object.entries(locations).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
    $("#cust-total").textContent=customers.length;
    $("#cust-repeat").textContent=repeat;
    $("#cust-top-location").textContent=top;
    $("#cust-revenue").textContent=money(customers.reduce((s,c)=>s+c.revenue,0));
    const root=$("#customers-table");
    if(!filtered.length){root.innerHTML='<div class="empty"><strong>No customers found</strong>Customers are created from actual stored order records.</div>';return;}
    root.innerHTML='<table><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Orders</th><th>Total Spend</th><th>Last Order</th></tr></thead><tbody>'+
      filtered.map(c=>'<tr><td><strong>'+safe(c.name)+'</strong></td><td>'+safe(c.phone||"—")+'<br><span class="panel-note">'+safe(c.email||"")+'</span></td><td>'+safe(c.location)+'</td><td><strong>'+c.orders+'</strong>'+(c.orders>=2?' <span class="status-badge verified">Repeat</span>':'')+'</td><td>'+money(c.revenue)+'</td><td>'+dateTime(c.lastOrder)+'</td></tr>').join("")+
      '</tbody></table>';
  }

  function renderRegionalShipping(){
    const r=read(KEY.shipping,{regional:{batangas:0,manila:150,province:220},freeMinimum:0});
    const regional=r.regional||{batangas:0,manila:150,province:220};
    $("#ship-batangas").value=regional.batangas??0;
    $("#ship-manila").value=regional.manila??150;
    $("#ship-province").value=regional.province??220;
    $("#ship-free-min").value=r.freeMinimum??0;
  }

  function saveRegionalShipping(){
    const current=read(KEY.shipping,{enabled:true,minPacks:2,fulfillment:"all"});
    const rule={...current,regional:{
      batangas:Math.max(0,Number($("#ship-batangas").value||0)),
      manila:Math.max(0,Number($("#ship-manila").value||0)),
      province:Math.max(0,Number($("#ship-province").value||0))
    },freeMinimum:Math.max(0,Number($("#ship-free-min").value||0))};
    write(KEY.shipping,rule);
    log("Regional shipping rules updated","shipping","regional",JSON.stringify(rule.regional));
    toast("Regional shipping rules saved");
    renderAudit();
  }

  function renderFinancials() {
    orders = getOrders();
    const revenue=orders.reduce((s,o)=>s+o.total,0);
    const cogs=orders.reduce((s,o)=>s+o.cogs,0);
    const shipping=orders.reduce((s,o)=>s+o.shippingSubsidy,0);
    const affiliate=orders.reduce((s,o)=>s+o.affiliateCommission,0);
    $("#fin-revenue").textContent=money(revenue);
    $("#fin-cogs").textContent=money(cogs);
    $("#fin-shipping").textContent=money(shipping);
    $("#fin-profit").textContent=money(revenue-cogs-shipping-affiliate);
    const byPay={GCash:0,"Cash on Delivery (COD)":0,"Bank Transfer":0,Maya:0};
    orders.forEach(o=>{byPay[o.payment]=(byPay[o.payment]||0)+o.total;});
    $("#payment-ledger").innerHTML=Object.entries(byPay).map(([k,v])=>'<div class="ledger-row"><span>'+safe(k)+'<br><small>'+orders.filter(o=>o.payment===k).length+' order(s)</small></span><strong>'+money(v)+'</strong></div>').join("");
    $("#profit-breakdown").innerHTML=[
      ["Revenue",revenue],
      ["COGS",-cogs],
      ["Shipping subsidy",-shipping],
      ["Affiliate commissions",-affiliate],
      ["Tracked net",revenue-cogs-shipping-affiliate]
    ].map(([k,v])=>'<div class="ledger-row"><span>'+safe(k)+'</span><strong>'+money(v)+'</strong></div>').join("");
    const root=$("#finance-table");
    if(!orders.length){root.innerHTML='<div class="empty"><strong>No financial records</strong>Revenue and costs appear from actual stored orders.</div>';return;}
    root.innerHTML='<table><thead><tr><th>Order</th><th>Payment</th><th>Revenue</th><th>COGS</th><th>Shipping</th><th>Affiliate</th><th>Tracked net</th></tr></thead><tbody>'+
      orders.map(o=>'<tr><td>'+safe(o.id)+'</td><td>'+safe(o.payment)+'</td><td>'+money(o.total)+'</td><td>'+money(o.cogs)+'</td><td>'+money(o.shippingSubsidy)+'</td><td>'+money(o.affiliateCommission)+'</td><td>'+money(o.total-o.cogs-o.shippingSubsidy-o.affiliateCommission)+'</td></tr>').join("")+
      '</tbody></table>';
  }

  function renderPromos() {
    promos=read(KEY.promos,[]);
    const rule=read(KEY.shipping,{enabled:true,minPacks:2,fulfillment:"all"});
    $("#free-ship-toggle").checked=rule.enabled!==false;
    $("#free-ship-min").value=rule.minPacks||2;
    $("#free-ship-fulfillment").value=rule.fulfillment||"all";
    const root=$("#promos-table");
    if(!promos.length){root.innerHTML='<div class="empty"><strong>No voucher rules yet</strong>Create a real voucher or discount rule for the client.</div>';return;}
    root.innerHTML='<table><thead><tr><th>Rule</th><th>Code</th><th>Type</th><th>Value</th><th>Min packs</th><th>Audience</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
      promos.map(p=>'<tr><td>'+safe(p.name)+'</td><td>'+safe(p.code||"—")+'</td><td>'+safe(p.type)+'</td><td>'+Number(p.value||0)+(p.type==="percent"?"%":"")+'</td><td>'+Number(p.minPacks||0)+'</td><td>'+safe(p.audience)+'</td><td><span class="status-badge '+(p.active?"verified":"cancelled")+'">'+(p.active?"Active":"Off")+'</span></td><td><button class="table-action" data-edit-promo="'+safe(p.id)+'">Edit</button><button class="table-action" data-delete-promo="'+safe(p.id)+'">Delete</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function openPromo(id){
    const d=$("#promo-dialog"), p=promos.find(x=>x.id===id);
    $("#promo-edit-id").value=p?.id||"";
    $("#promo-name").value=p?.name||"";
    $("#promo-code").value=p?.code||"";
    $("#promo-type").value=p?.type||"percent";
    $("#promo-value").value=p?.value||0;
    $("#promo-min-packs").value=p?.minPacks||0;
    $("#promo-audience").value=p?.audience||"all";
    $("#promo-active").checked=p?.active!==false;
    if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  }
  function savePromoFromForm(e){
    e.preventDefault();
    const id=$("#promo-edit-id").value.trim();
    const payload={id:id||uid("PROMO"),name:$("#promo-name").value.trim(),code:$("#promo-code").value.trim().toUpperCase(),type:$("#promo-type").value,value:Number($("#promo-value").value||0),minPacks:Number($("#promo-min-packs").value||0),audience:$("#promo-audience").value,active:$("#promo-active").checked};
    if(!payload.name){toast("Rule name is required.");return;}
    const idx=promos.findIndex(p=>p.id===id);
    if(idx>=0){promos[idx]=payload;log("Promo updated","promo",id,payload.name);}else{promos.unshift(payload);log("Promo created","promo",payload.id,payload.name);}
    savePromos();$("#promo-dialog").close();toast("Promo saved");renderPromos();renderAudit();
  }

  function saveShippingRule(){
    const rule={enabled:$("#free-ship-toggle").checked,minPacks:Math.max(1,Number($("#free-ship-min").value||2)),fulfillment:$("#free-ship-fulfillment").value};
    write(KEY.shipping,rule);
    log("Shipping rule updated","promo","free-shipping","enabled="+rule.enabled+"; minPacks="+rule.minPacks+"; fulfillment="+rule.fulfillment);
    toast("Free-shipping rule saved");
  }

  function renderCms(){
    cms={...defaultCms,...(read(KEY.cms,defaultCms)||{})};
    $("#cms-hero-eyebrow").value=cms.heroEyebrow||defaultCms.heroEyebrow;
    $("#cms-hero-title").value=cms.heroTitle||defaultCms.heroTitle;
    $("#cms-hero-description").value=cms.heroDescription||defaultCms.heroDescription;
    $("#cms-story").value=cms.story||"";
    $("#cms-delivery").value=cms.delivery||"";
    $("#cms-announcement-title").value=cms.announcement?.title||defaultCms.announcement.title;
    $("#cms-announcement-body").value=cms.announcement?.body||defaultCms.announcement.body;
    $("#cms-announcement-date").value=cms.announcement?.date||"";
    const benefits=Array.isArray(cms.benefits)&&cms.benefits.length===3?cms.benefits:defaultCms.benefits;
    $("#benefit-editor").innerHTML=benefits.map((b,i)=>'<div class="faq-item"><input class="input benefit-title" value="'+safe(b.title||"")+'" placeholder="Headline"><input class="input benefit-desc" value="'+safe(b.desc||"")+'" placeholder="Description"><input class="input benefit-icon" value="'+safe(b.icon||"✦")+'" placeholder="Icon"></div>').join("");
    const steps=Array.isArray(cms.brewSteps)&&cms.brewSteps.length===3?cms.brewSteps:defaultCms.brewSteps;
    $("#brew-editor").innerHTML=steps.map((s,i)=>'<div class="faq-item"><input class="input brew-title" value="'+safe(s.title||"")+'" placeholder="Step title"><textarea class="textarea brew-desc" rows="2" placeholder="Step description">'+safe(s.desc||"")+'</textarea></div>').join("");
    const root=$("#faq-editor"), faqs=Array.isArray(cms.faqs)?cms.faqs:[];
    root.innerHTML=faqs.length ? faqs.map((f,i)=>'<div class="faq-item"><input class="input faq-q" value="'+safe(f.q||"")+'" placeholder="Question"><textarea class="textarea faq-a" rows="3" placeholder="Answer">'+safe(f.a||"")+'</textarea><button type="button" class="table-action" data-delete-faq="'+i+'">Delete</button></div>').join("") : '<div class="empty">No FAQ items yet. Add the client’s real questions and answers.</div>';
  }

  function saveCmsFromEditor(){
    const faqRows=$$(".faq-item").filter(row=>$(".faq-q",row));
    const faqs=faqRows.map(row=>({q:$(".faq-q",row)?.value.trim()||"",a:$(".faq-a",row)?.value.trim()||""})).filter(f=>f.q||f.a);
    const benefits=$$(".benefit-title").map((el,i)=>({title:el.value.trim(),desc:$$(".benefit-desc")[i]?.value.trim()||"",icon:$$(".benefit-icon")[i]?.value.trim()||"✦"})).slice(0,3);
    const brewSteps=$$(".brew-title").map((el,i)=>({title:el.value.trim(),desc:$$(".brew-desc")[i]?.value.trim()||""})).slice(0,3);
    cms={...cms,
      heroEyebrow:$("#cms-hero-eyebrow").value.trim(),
      heroTitle:$("#cms-hero-title").value.trim(),
      heroDescription:$("#cms-hero-description").value.trim(),
      story:$("#cms-story").value.trim(),
      delivery:$("#cms-delivery").value.trim(),
      announcement:{
        title:$("#cms-announcement-title").value.trim(),
        body:$("#cms-announcement-body").value.trim(),
        date:$("#cms-announcement-date").value
      },
      benefits:benefits.length===3?benefits:defaultCms.benefits,
      brewSteps:brewSteps.length===3?brewSteps:defaultCms.brewSteps,
      faqs
    };
    saveCms();
    log("CMS content saved","cms","site","Hero, story, benefits, brew steps, delivery policy, and FAQ content saved");
    toast("Content saved");
  }
  function addFaq(){cms.faqs=cms.faqs||[];cms.faqs.push({q:"",a:""});write(KEY.cms,cms);renderCms();}

  function renderTickets(){
    tickets=read(KEY.tickets,[]);
    const search=($("#ticket-search")?.value||"").toLowerCase().trim();
    const status=$("#ticket-status-filter")?.value||"";
    const list=tickets.filter(t=>{
      const hay=[t.id,t.orderId,t.customer,t.contact,t.message].join(" ").toLowerCase();
      return (!search||hay.includes(search))&&(!status||t.status===status);
    });
    const root=$("#tickets-table");
    if(!list.length){root.innerHTML='<div class="empty"><strong>No support tickets</strong>Customer inquiries linked to orders will appear here.</div>';return;}
    root.innerHTML='<table><thead><tr><th>Ticket</th><th>Order</th><th>Customer</th><th>Inquiry</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>'+
      list.map(t=>'<tr><td>'+safe(t.id)+'</td><td>'+safe(t.orderId||"—")+'</td><td>'+safe(t.customer||"—")+'<br><span class="panel-note">'+safe(t.contact||"")+'</span></td><td>'+safe(t.message)+'</td><td><span class="status-badge '+(["Resolved","Closed"].includes(t.status)?"delivered":"pending")+'">'+safe(t.status)+'</span></td><td>'+dateTime(t.updatedAt||t.createdAt)+'</td><td><button class="table-action" data-edit-ticket="'+safe(t.id)+'">Edit</button><button class="table-action" data-delete-ticket="'+safe(t.id)+'">Delete</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function openTicket(id){
    const d=$("#ticket-dialog"), t=tickets.find(x=>x.id===id);
    $("#ticket-name").value=t?.customer||"";
    $("#ticket-order").value=t?.orderId||"";
    $("#ticket-contact").value=t?.contact||"";
    $("#ticket-status").value=t?.status||"Open";
    $("#ticket-message").value=t?.message||"";
    $("#ticket-notes").value=t?.notes||"";
    $("#ticket-form").dataset.editId=t?.id||"";
    if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  }
  function saveTicketFromForm(e){
    e.preventDefault();
    const editId=$("#ticket-form").dataset.editId||"";
    const payload={id:editId||uid("TKT"),customer:$("#ticket-name").value.trim(),orderId:$("#ticket-order").value.trim(),contact:$("#ticket-contact").value.trim(),status:$("#ticket-status").value,message:$("#ticket-message").value.trim(),notes:$("#ticket-notes").value.trim(),createdAt:editId?(tickets.find(t=>t.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
    const idx=tickets.findIndex(t=>t.id===editId);
    if(idx>=0){tickets[idx]=payload;log("Ticket updated","ticket",editId,payload.status);}else{tickets.unshift(payload);log("Ticket created","ticket",payload.id,payload.orderId||"No linked order");}
    saveTickets();$("#ticket-dialog").close();toast("Ticket saved");renderTickets();renderOverview();renderAudit();
  }

  function renderAudit(){
    const list=read(KEY.audit,[]);
    const root=$("#audit-table");
    if(!list.length){root.innerHTML='<div class="empty"><strong>No audit entries</strong>Manual overrides and admin changes will be recorded here.</div>';return;}
    root.innerHTML='<table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>ID</th><th>Details</th></tr></thead><tbody>'+
      list.map(x=>'<tr><td>'+dateTime(x.at)+'</td><td>'+safe(x.action)+'</td><td>'+safe(x.entity)+'</td><td>'+safe(x.entityId)+'</td><td>'+safe(x.details)+'</td></tr>').join("")+
      '</tbody></table>';
  }

  function csvCell(v){return '"'+String(v??"").replace(/"/g,'""')+'"';}
  function downloadCsv(filename, rows){
    const csv=rows.map(row=>row.map(csvCell).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function exportOrders(){downloadCsv("kapeng-barako-orders.csv",[["Order ID","Created","Customer","Phone","Email","Address","Payment","Fulfillment","Status","Total","COGS","Shipping Subsidy","Affiliate Commission"],...orders.map(o=>[o.id,o.createdAt,o.customer.name,o.customer.phone,o.customer.email,o.customer.address,o.payment,o.fulfillment,o.status,o.total,o.cogs,o.shippingSubsidy,o.affiliateCommission])]);}
  function exportCustomers(){const customers=buildCustomers(getOrders());downloadCsv("kapeng-barako-customers.csv",[["Customer","Phone","Email","Location","Orders","Total Spend","Last Order"],...customers.map(c=>[c.name,c.phone,c.email,c.location,c.orders,c.revenue,c.lastOrder])]);}
  function exportFinancials(){downloadCsv("kapeng-barako-financials.csv",[["Order ID","Payment","Revenue","COGS","Shipping Subsidy","Affiliate Commission","Tracked Net"],...orders.map(o=>[o.id,o.payment,o.total,o.cogs,o.shippingSubsidy,o.affiliateCommission,o.total-o.cogs-o.shippingSubsidy-o.affiliateCommission])]);}
  function exportAudit(){downloadCsv("kapeng-barako-audit.csv",[["Time","Action","Entity","ID","Details"],...read(KEY.audit,[]).map(x=>[x.at,x.action,x.entity,x.entityId,x.details])]);}
  function exportCms(){const blob=new Blob([JSON.stringify(cms,null,2)],{type:"application/json;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kapeng-barako-cms.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

  function printReport(){
    orders=getOrders();
    const revenue=orders.reduce((s,o)=>s+o.total,0), cogs=orders.reduce((s,o)=>s+o.cogs,0), shipping=orders.reduce((s,o)=>s+o.shippingSubsidy,0), affiliate=orders.reduce((s,o)=>s+o.affiliateCommission,0);
    const p=window.open("","_blank","width=1000,height=900");
    if(!p){toast("Allow pop-ups to print the report.");return;}
    p.document.write('<!doctype html><html><head><title>Kapeng Barako — Sales Report</title><style>body{font-family:Arial,sans-serif;margin:30px;color:#2B1B12}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:12px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.box{border:1px solid #ddd;padding:12px;border-radius:8px}.muted{color:#666;font-size:11px}</style></head><body><h1>Kapeng Barako — Sales Report</h1><p class="muted">Generated '+safe(dateTime(new Date().toISOString()))+'</p><div class="summary">'+[
      ["Revenue",revenue],["COGS",cogs],["Shipping subsidy",shipping],["Tracked net",revenue-cogs-shipping-affiliate]
    ].map(x=>'<div class="box"><strong>'+x[0]+'</strong><br>'+money(x[1])+'</div>').join("")+'</div><table><tr><th>Order</th><th>Payment</th><th>Revenue</th><th>COGS</th><th>Shipping</th><th>Affiliate</th><th>Net</th></tr>'+
      orders.map(o=>'<tr><td>'+safe(o.id)+'</td><td>'+safe(o.payment)+'</td><td>'+money(o.total)+'</td><td>'+money(o.cogs)+'</td><td>'+money(o.shippingSubsidy)+'</td><td>'+money(o.affiliateCommission)+'</td><td>'+money(o.total-o.cogs-o.shippingSubsidy-o.affiliateCommission)+'</td></tr>').join("")+
      '</table><p class="muted">Use the browser print dialog and choose Save as PDF for a PDF copy.</p><script>window.onload=()=>window.print();</script></body></html>');
    p.document.close();
  }

  function refresh(){
    orders=getOrders();inventory=read(KEY.inventory,[]);promos=read(KEY.promos,[]);tickets=read(KEY.tickets,[]);
    renderOverview();
    const current=$(".nav-item.active")?.dataset.section||"overview";
    navTo(current);
    $("#sync-status").textContent="Local data refreshed";
    setTimeout(()=>$("#sync-status").textContent="Local data sync",1800);
  }

  document.addEventListener("click", e => {
    const nav=e.target.closest("[data-section]");
    if(nav) navTo(nav.dataset.section);
    const jump=e.target.closest("[data-section-jump]");
    if(jump) navTo(jump.dataset.sectionJump);

    const open=e.target.closest("[data-open-order]");
    if(open) openOrder(open.dataset.openOrder);
    const edit=e.target.closest("[data-edit-order]");
    if(edit) openOrder(edit.dataset.editOrder);
    const wb=e.target.closest("[data-waybill]");
    if(wb) generateWaybill(wb.dataset.waybill);
    const notif=e.target.closest("[data-notify-order]");
    if(notif) notifyOrder(notif.dataset.notifyOrder);

    const galleryAction=e.target.closest("[data-action]")?.dataset.action;
    if(galleryAction==="save-gallery") saveGalleryFromEditor();
    if(galleryAction==="gallery-reset") resetGallery();

    const pr=e.target.closest("[data-edit-product]");
    if(pr) openProduct(pr.dataset.editProduct);
    const pnew=e.target.closest("[data-delete-product]");
    if(pnew && confirm("Delete this product from the storefront?")){products=products.filter(p=>String(p.id)!==String(pnew.dataset.deleteProduct));saveProducts();log("Product deleted","product",pnew.dataset.deleteProduct);toast("Product deleted");renderProducts();renderAudit();}

    const ie=e.target.closest("[data-edit-inv]");
    if(ie) openInventory(ie.dataset.editInv);
    const idel=e.target.closest("[data-delete-inv]");
    if(idel && confirm("Delete this inventory record?")){inventory=inventory.filter(i=>i.id!==idel.dataset.deleteInv);saveInventory();log("Inventory deleted","inventory",idel.dataset.deleteInv);toast("Inventory record deleted");renderInventory();renderOverview();renderAudit();}

    const pe=e.target.closest("[data-edit-promo]");
    if(pe) openPromo(pe.dataset.editPromo);
    const pdel=e.target.closest("[data-delete-promo]");
    if(pdel && confirm("Delete this promo rule?")){promos=promos.filter(p=>p.id!==pdel.dataset.deletePromo);savePromos();log("Promo deleted","promo",pdel.dataset.deletePromo);toast("Promo deleted");renderPromos();renderAudit();}

    const te=e.target.closest("[data-edit-ticket]");
    if(te) openTicket(te.dataset.editTicket);
    const tdel=e.target.closest("[data-delete-ticket]");
    if(tdel && confirm("Delete this support ticket?")){tickets=tickets.filter(t=>t.id!==tdel.dataset.deleteTicket);saveTickets();log("Ticket deleted","ticket",tdel.dataset.deleteTicket);toast("Ticket deleted");renderTickets();renderOverview();renderAudit();}

    const fd=e.target.closest("[data-delete-faq]");
    if(fd){cms.faqs.splice(Number(fd.dataset.deleteFaq),1);write(KEY.cms,cms);renderCms();}

    const close=e.target.closest("[data-close-dialog]");
    if(close) close.closest("dialog")?.close();

    const invf=e.target.closest("[data-inv-filter]");
    if(invf){invFilter=invf.dataset.invFilter;$$("[data-inv-filter]").forEach(b=>b.classList.toggle("active",b===invf));renderInventory();}

    const ov=e.target.closest("[data-order-view]");
    if(ov){orderView=ov.dataset.orderView;$$("[data-order-view]").forEach(b=>b.classList.toggle("active",b===ov));renderOrders();}

    const segment=e.target.closest("[data-segment]");
    if(segment){currentSegment=segment.dataset.segment;applySegment();}

    const action=e.target.closest("[data-action]")?.dataset.action;
    if(action==="refresh") refresh();
    if(action==="open-order") openOrder("");
    if(action==="open-product") openProduct("");
    if(action==="open-inventory") openInventory("");
    if(action==="open-promo") openPromo("");
    if(action==="save-settings") saveSettingsFromForm();
    if(action==="open-ticket") openTicket("");
    if(action==="save-free-ship") saveShippingRule();
    if(action==="cms-save") saveCmsFromEditor();
    if(action==="cms-export") exportCms();
    if(action==="add-faq") addFaq();
    if(action==="export-orders") exportOrders();
    if(action==="export-financials") exportFinancials();
    if(action==="export-customers") exportCustomers();
    if(action==="save-regional-shipping") saveRegionalShipping();
    if(action==="print-report") printReport();
    if(action==="export-audit") exportAudit();
    if(action==="open-menu") document.body.classList.add("menu-open");
    if(action==="close-menu") document.body.classList.remove("menu-open");
    if(action==="logout"){
      window.KBAdminAuth?.logout();
    }
  });

  ["order-search","order-payment-filter","order-courier-filter","order-status-filter"].forEach(id=>$("#"+id)?.addEventListener("input",renderOrders));
  ["ticket-search","ticket-status-filter"].forEach(id=>$("#"+id)?.addEventListener("input",renderTickets));
  $("#customer-search")?.addEventListener("input",renderCustomers);

  $("#order-form")?.addEventListener("submit",saveOrderFromForm);
  $("#product-form")?.addEventListener("submit",saveProductFromForm);
  $("#inventory-form")?.addEventListener("submit",saveInventoryFromForm);
  $("#promo-form")?.addEventListener("submit",savePromoFromForm);
  $("#ticket-form")?.addEventListener("submit",saveTicketFromForm);

  window.addEventListener("storage", e => {
    if([KEY.orders,KEY.lastOrder,KEY.inventory,KEY.promos,KEY.products,KEY.settings,KEY.gallery,KEY.cms,KEY.tickets,KEY.audit,KEY.shipping].includes(e.key)){
      refresh();
      $("#sync-status").textContent="Updated from another tab";
    }
  });


  function applySegment(){
    orders=getOrders();
    const names=new Map();
    orders.forEach(o=>names.set(o.customer.name,(names.get(o.customer.name)||0)+1));
    if(currentSegment==="repeat"){
      const repeat=[...names.entries()].filter(x=>x[1]>=2).map(x=>x[0]);
      toast(repeat.length+" repeat customer(s) in current records");
    } else if(currentSegment==="pending"){
      toast(orders.filter(o=>o.status==="Pending").length+" customer(s) need payment/order follow-up");
    } else {
      toast(names.size+" unique customer name(s) in current records");
    }
  }

  $("#order-dialog")?.addEventListener("close",()=>$("#order-form")?.reset());
  $("#product-dialog")?.addEventListener("close",()=>$("#product-form")?.reset());
  $("#inventory-dialog")?.addEventListener("close",()=>$("#inventory-form")?.reset());
  $("#promo-dialog")?.addEventListener("close",()=>$("#promo-form")?.reset());

  renderOverview();
  renderOrders();
  renderCustomers();
  renderInventory();
  renderFinancials();
  renderProducts();
  renderPromos();
  renderSettings();
  renderRegionalShipping();
  renderCms();
  renderTickets();
  renderAudit();
})();
