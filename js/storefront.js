(() => {
  "use strict";

  const fallbackProducts = [
    {id:1,name:"Barako Strong",origin:"Batangas",roast:"Dark Roast",price:189,weight:"250g",note:"Bold, smoky roast",emoji:"☕️",bg:"#F6E8D5",stock:18,variants:[{weight:"250g",price:189},{weight:"500g",price:349},{weight:"1kg",price:649}],grinds:["Whole Bean","Coarse","Medium","Fine"]},
    {id:2,name:"QC Blend",origin:"Cavite",roast:"Medium-Dark",price:245,weight:"500g",note:"Chocolate and brown sugar",emoji:"🤎",bg:"#EDE3D3",stock:9,variants:[{weight:"250g",price:139},{weight:"500g",price:245},{weight:"1kg",price:459}],grinds:["Whole Bean","Coarse","Medium","Fine"]},
    {id:3,name:"Cold Brew Kit",origin:"Batangas",roast:"Medium Roast",price:320,weight:"Set",note:"Easy to prepare at home",emoji:"🧊",bg:"#E8DDD0",stock:6,variants:[{weight:"1 Set",price:320},{weight:"2 Sets",price:599}],grinds:["Coarse","Medium"]},
    {id:4,name:"Barako Drip Pack",origin:"Batangas",roast:"Dark Roast",price:165,weight:"10 pcs",note:"Simple coffee for the office",emoji:"✨",bg:"#F5EEE4",stock:24,variants:[{weight:"10 pcs",price:165},{weight:"20 pcs",price:299}],grinds:["Medium"]}
  ];
  const fallbackCms = {
    heroEyebrow:"BATANGAS LIBERICA • SMALL-BATCH ROAST",
    heroTitle:"Kapeng Barako.\nBold by nature.\nRoasted in Batangas.",
    heroDescription:"Small-batch Liberica coffee, roasted with intent in Batangas — rich aroma, deep character, unmistakably Barako.",
    story:"Mula sa piling Liberica beans ng Batangas, bawat batch ng Kapeng Barako ay ako mismo ang nagroroast, binabantayan ang init, oras, at kulay hanggang lumabas ang tamang tapang at aroma. Hindi tulad ng commercial coffee na mass-produced para sa consistent volume, ang aming roast ay small-batch at hands-on, kaya bawat tasa ay may mas malalim na character, mas mabangong aroma, at tunay na lutong Barako.",
    delivery:"Payment: GCash, Maya, Cash on Delivery (COD). Fulfillment: Lalamove, J&T, LBC, or meetup within Quezon City. Shipping fee is based on the selected courier and delivery distance/location. Free shipping when you buy 2 packs or more.",
    benefits:[
      {title:"Matapang / Pure",desc:"Puro at walang halong iba",icon:"01"},
      {title:"Gawang Batangas",desc:"Galing sa mga piling sakahan ng Batangas",icon:"02"},
      {title:"Fresh Roast",desc:"Personal na nire-roast sa maliliit na batch",icon:"03"}
    ],
    brewSteps:[
      {title:"Pakulo",desc:"Pakuluan ang malinis na tubig hanggang umabot sa tamang init."},
      {title:"Lagay kape",desc:"Ilagay ang tamang dami ng Barako coffee ayon sa gusto mong tapang."},
      {title:"Salain",desc:"Hayaang lumabas ang aroma at salain bago ihain nang mainit."}
    ],
    faqs:[
      {q:"Matapang ba masyado?",a:"May bold na Barako character, pero puwedeng i-adjust ang dami ng kape at tubig ayon sa panlasa."},
      {q:"Ilang araw shelf life / May expiration ba?",a:"Ang actual shelf life at expiration date ay dapat sundin ayon sa packaging at batch label ng buyer. Ilagay ang tunay na expiry details bago magbenta."},
      {q:"Pwede ba sa may acid?",a:"Iba-iba ang tolerance ng bawat tao. Kung may acid reflux o sensitibong tiyan, mas ligtas na tanungin ang iyong healthcare professional kung angkop sa iyo ang kape."}
    ]
  };
  const fallbackSettings = {
    paymentMethods:["GCash","Cash on Delivery (COD)","Bank Transfer"],
    fulfillmentMethods:["Lalamove","J&T","LBC","QC Meetup"],
    shippingNote:"Courier fee is based on the selected courier and delivery distance/location. Final fee is confirmed before fulfillment.",
    orderNote:"We confirm the final delivery details before fulfillment.",
    gcashInstructions:"ILAG — add the buyer’s GCash name/number or QR instructions in Admin → Store Settings.",
    bankTransferInstructions:"ILAG — add the buyer’s bank name, account name/number, and transfer instructions in Admin → Store Settings.",
    email:"ILAG",phone:"ILAG",location:"ILAG",
    facebook:"ILAG",instagram:"ILAG",tiktok:"ILAG",tagline:"Gawa sa Batangas"
  };
  const fallbackGallery = [
    {id:1,image:"images/gallery-01.svg",title:"Roasted Liberica Beans",caption:"Close-up coffee bean study"},
    {id:2,image:"images/gallery-02.svg",title:"Coffee Farm Origins",caption:"Green farm and coffee cherries"},
    {id:3,image:"images/gallery-03.svg",title:"Steaming Barako Cup",caption:"A warm traditional coffee moment"},
    {id:4,image:"images/gallery-04.svg",title:"Green Beans Drying",caption:"Raw coffee beans under the sun"},
    {id:5,image:"images/gallery-05.svg",title:"Small-Batch Roasting",caption:"Artisanal roasting and packaging"},
    {id:6,image:"images/gallery-06.svg",title:"Rustic Coffee Life",caption:"Local farming and coffee atmosphere"}
  ];
  const read=(key,fallback)=>{try{const x=localStorage.getItem(key);return x?JSON.parse(x):fallback}catch{return fallback}};
  const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:2});
  const products=(typeof window.KBStore?.getProducts==="function"?window.KBStore.getProducts():read("kb_products",fallbackProducts)).map(p=>({
    ...p,
    variants:Array.isArray(p.variants)&&p.variants.length?p.variants:[{weight:p.weight||"Pack",price:Number(p.price||0)}],
    grinds:Array.isArray(p.grinds)&&p.grinds.length?p.grinds:["Whole Bean","Coarse","Medium","Fine"]
  }));
  const cms={...fallbackCms,...(typeof window.KBStore?.getCms==="function"?window.KBStore.getCms():read("kb_cms",{}))};
  const settings={...fallbackSettings,...(typeof window.KBStore?.getSettings==="function"?window.KBStore.getSettings():read("kb_settings",{}))};
  settings.paymentMethods=Array.isArray(settings.paymentMethods)&&settings.paymentMethods.length?[...settings.paymentMethods]:[...fallbackSettings.paymentMethods];
  settings.paymentMethods=[...new Set(settings.paymentMethods.map(x=>x==="Cash on Delivery"?"Cash on Delivery (COD)":x))];
  ["GCash","Cash on Delivery (COD)","Bank Transfer"].forEach(method=>{if(!settings.paymentMethods.includes(method))settings.paymentMethods.push(method);});
  const shipping={enabled:true,minPacks:2,...read("kb_shipping_rule",{})};
  let trackedOrderId="";
  const TRACK_STEPS=[
    {statuses:["Pending"],title:"Order received",desc:"Your order is recorded and awaiting confirmation."},
    {statuses:["Verified Payment"],title:"Order confirmed",desc:"Payment has been verified and the order is confirmed."},
    {statuses:["Processing/Roasting"],title:"Roasting",desc:"Your coffee is being prepared in the current roast batch."},
    {statuses:["Ready to Ship"],title:"Packed / ready",desc:"Your order is packed and ready for dispatch."},
    {statuses:["Dispatched"],title:"Out for delivery",desc:"Your order has been handed to the selected fulfillment method."},
    {statuses:["Delivered"],title:"Delivered",desc:"The order is marked as delivered."}
  ];
  const gallery=(typeof window.KBStore?.getGallery==="function"?window.KBStore.getGallery():read("kb_gallery",fallbackGallery));
  const cartKey="kb_cart";
  let cart=read(cartKey,[]);
  let picks={};
  let voucherApplied=null;

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const setText=(sel,v)=>{const el=$(sel);if(el)el.textContent=v??""};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const saveCart=()=>localStorage.setItem(cartKey,JSON.stringify(cart));
  const productById=id=>products.find(p=>String(p.id)===String(id));
  const choiceFor=p=>{
    const pick=picks[p.id]||{};
    const variant=p.variants.find(v=>v.weight===pick.weight)||p.variants[0];
    const grind=pick.grind||p.grinds[Math.min(2,p.grinds.length-1)];
    return {variant,grind};
  };
  const packsInCart=()=>cart.reduce((sum,i)=>{
    const weight=String(i.weight||"").toLowerCase();
    const n=parseFloat(weight.replace(/[^\d.]/g,""));
    return sum + (weight.includes("kg") ? i.qty*n : weight.includes("g") ? i.qty*(n/250) : i.qty);
  },0);
  const cartSubtotal=()=>cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0);
  const freeShip=()=>shipping.enabled!==false&&packsInCart()>=Number(shipping.minPacks||2);
  const cartShippingLabel=()=>freeShip()?"FREE":"Calculated after pack count";
  const normalizeTrackId=value=>String(value||"").trim().replace(/^#/,"").toUpperCase();
  const findTrackedOrder=value=>{
    const wanted=normalizeTrackId(value);
    if(!wanted)return null;
    const stored=read("kb_orders",[]);
    const list=Array.isArray(stored)?stored:[];
    const match=list.find(o=>normalizeTrackId(o?.id)===wanted);
    if(match)return match;
    const last=read("kb_last_order",null);
    return last&&normalizeTrackId(last.id)===wanted?last:null;
  };
  const trackStepIndex=status=>{
    const n=TRACK_STEPS.findIndex(step=>step.statuses.includes(status));
    return n<0?0:n;
  };
  function renderTrackResult(order){
    const root=$("#track-result");
    if(!root)return;
    if(!order){
      root.hidden=false;
      root.innerHTML='<div class="track-empty"><strong>Order not found.</strong><br>Check the Order Number and try again.</div>';
      return;
    }
    root.hidden=false;
    const cancelled=order.status==="Cancelled";
    const activeIndex=trackStepIndex(order.status);
    const timeline=TRACK_STEPS.map((step,index)=>{
      const done=!cancelled&&index<activeIndex;
      const current=!cancelled&&index===activeIndex;
      const marker=done?"✓":current?"•":String(index+1);
      return '<div class="track-step '+(done?"done ":"")+(current?"current":"")+'"><div class="track-dot">'+marker+'</div><div><h4>'+esc(step.title)+'</h4><p>'+esc(done?"Completed":step.desc)+'</p></div></div>';
    }).join("");
    const updated=new Date(order.statusUpdatedAt||order.createdAt||Date.now()).toLocaleString("en-PH",{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    const customer=order.customer?.name?'<br><strong>Customer:</strong> '+esc(order.customer.name):"";
    root.innerHTML='<div class="track-result-head"><div><div class="track-result-id">#'+esc(order.id)+'</div><div class="track-result-meta">Updated '+esc(updated)+'</div></div><span class="track-status-chip '+(cancelled?"cancelled":"")+'">'+esc(order.status)+'</span></div>'+
      (cancelled?'<div class="track-empty" style="margin-top:13px"><strong>This order is cancelled.</strong><br>Please contact the store if you need help with the order record.</div>':
      '<div class="track-courier"><strong>Fulfillment:</strong> '+esc(order.fulfillment||"Pending assignment")+customer+'</div><div class="track-timeline">'+timeline+'</div>');
  }
  function refreshTrackedOrder(){
    if(!trackedOrderId||$("#track-layer")?.hidden)return;
    renderTrackResult(findTrackedOrder(trackedOrderId));
  }
  const showLayer=id=>{const el=$(id);if(el){el.hidden=false;document.body.classList.add("locked")}};
  const hideLayer=id=>{const el=$(id);if(el){el.hidden=true;if(![...$$(".modal-layer")].some(x=>!x.hidden))document.body.classList.remove("locked")}};

  function syncUi(){
    const count=cart.reduce((s,i)=>s+Number(i.qty||0),0);
    setText("#cart-count",count);setText("#hero-cart-count",count);setText("#products-cart-count",count);
    const sub=cartSubtotal();
    setText("#cart-items-total",count);setText("#cart-total",money(sub));setText("#checkout-total",money(sub));setText("#cart-shipping",cartShippingLabel());
    renderCart();renderCheckoutOptions();
  }

  function renderHero(){
    const first=products[0]; if(!first)return;
    setText("#featured-name",first.name);
    setText("#featured-meta",(first.variants?.[0]?.weight||first.weight||"")+(first.roast?" · "+first.roast:""));
    $("#featured-add").onclick=()=>addProduct(first,first.variants?.[0],first.grinds?.[0]);
    const benefits=(cms.benefits?.length===3?cms.benefits:fallbackCms.benefits).slice(0,3);
    $("#hero-benefits").innerHTML=benefits.map(x=>'<div class="benefit-mini"><span>'+esc(x.title)+'</span><strong>'+esc(x.desc)+'</strong></div>').join("");
  }

  function renderContent(){
    setText("[data-cms='heroEyebrow']",cms.heroEyebrow);
    const title=$("#hero-copy-title");
    const h1=$(".hero h1"); if(h1){h1.innerHTML=esc(cms.heroTitle||fallbackCms.heroTitle).replace(/\n/g,"<br>");}
    setText("[data-cms='heroDescription']",cms.heroDescription);
    setText("#story-copy",cms.story);
    const benefits=(cms.benefits?.length===3?cms.benefits:fallbackCms.benefits).slice(0,3);
    $("#benefit-grid").innerHTML=benefits.map((x,i)=>'<article class="benefit-card"><div class="benefit-icon">'+String(i+1).padStart(2,"0")+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.desc)+'</p></article>').join("");
    setText("#delivery-intro",cms.delivery);
    setText("#shipping-note",settings.shippingNote);
    setText("#shipping-promo",shipping.enabled===false?"Shipping promo is currently unavailable.":"Free shipping when you buy "+Number(shipping.minPacks||2)+" packs or more");
    $("#brew-steps").innerHTML=(cms.brewSteps?.length===3?cms.brewSteps:fallbackCms.brewSteps).map((x,i)=>'<div class="step"><div class="step-num">'+(i+1)+'</div><div><h3>Step '+(i+1)+': '+esc(x.title)+'</h3><p>'+esc(x.desc)+'</p></div></div>').join("");
    $("#faq-list").innerHTML=(cms.faqs?.length?cms.faqs:fallbackCms.faqs).map(x=>'<details class="faq-item"><summary>'+esc(x.q)+'</summary><div class="faq-answer">'+esc(x.a)+'</div></details>').join("");
    setText("[data-store-location]",settings.location||"ILAG");setText("[data-store-email]",settings.email||"ILAG");setText("[data-store-phone]",settings.phone||"ILAG");setText("#footer-tagline",settings.tagline||"Gawa sa Batangas");
    renderPayments();renderFulfillment();renderGallery();renderSocials();
  }

  function renderPaymentHelp(){
    const method=$("#checkout-payment")?.value||"";
    const help=$("#payment-instructions"), ref=$("#payment-reference-wrap"), proof=$("#payment-proof-wrap"), proofInput=$("#payment-proof");
    if(!help)return;
    if(method==="GCash"){
      help.innerHTML="<strong>GCash:</strong> "+esc(settings.gcashInstructions||"Add the store’s GCash payment instructions in Admin → Store Settings.");
      ref.hidden=false;proof.hidden=false;
    }else if(method==="Bank Transfer"){
      help.innerHTML="<strong>Bank Transfer:</strong> "+esc(settings.bankTransferInstructions||"Add the store’s bank details in Admin → Store Settings.");
      ref.hidden=false;proof.hidden=false;
    }else if(method==="Cash on Delivery (COD)"||method==="Cash on Delivery"){
      help.innerHTML="<strong>COD:</strong> No online payment reference is required. Pay according to the confirmed delivery arrangement.";
      ref.hidden=true;proof.hidden=true;
      if($("#payment-reference"))$("#payment-reference").value="";
      if(proofInput)proofInput.value="";
    }else{
      help.textContent="Follow the payment instructions confirmed by the store.";
      ref.hidden=true;proof.hidden=true;
    }
  }
  function brandAsset(name,type){
    const key=String(name||"").toLowerCase();
    const map={
      "facebook":"facebook",
      "instagram":"instagram",
      "tiktok":"tiktok",
      "gcash":"gcash",
      "lalamove":"lalamove",
      "j&t":"jtexpress",
      "lbc":"lbcexpress"
    };
    const slug=map[key];
    return slug?'https://cdn.simpleicons.org/'+slug:'';
  }
  function brandTag(name,type){
    const label=name==="QC Meetup"?"Meetup — Quezon City":name;
    const src=brandAsset(name,type);
    return '<span class="tag brand-tag">'+(src?'<img class="brand-icon" src="'+src+'" alt="" loading="lazy">':'<span class="brand-fallback" aria-hidden="true">•</span>')+'<span>'+esc(label)+'</span></span>';
  }

  function renderPayments(){
    const list=Array.isArray(settings.paymentMethods)&&settings.paymentMethods.length?settings.paymentMethods:fallbackSettings.paymentMethods;
    $("#payment-list").innerHTML=list.map(x=>brandTag(x,"payment")).join("");
    $("#checkout-payment").innerHTML=list.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
    renderPaymentHelp();
  }
  function renderFulfillment(){
    const list=Array.isArray(settings.fulfillmentMethods)&&settings.fulfillmentMethods.length?settings.fulfillmentMethods:fallbackSettings.fulfillmentMethods;
    $("#fulfillment-list").innerHTML=list.map(x=>brandTag(x,"fulfillment")).join("");
    $("#checkout-fulfillment").innerHTML=list.map(x=>'<option value="'+esc(x)+'">'+esc(x==="QC Meetup"?"Meetup — Quezon City":x)+'</option>').join("");
  }
  function linkOrDisabled(el,url,label){
    if(!el)return;
    if(url&&url!=="ILAG"){el.href=url;el.classList.remove("disabled");el.removeAttribute("aria-disabled");el.title=label;}
    else {el.href="#";el.classList.add("disabled");el.setAttribute("aria-disabled","true");el.title="Set "+label+" in Admin → Store Settings";}
  }
  function renderSocials(){
    linkOrDisabled($("#social-fb"),settings.facebook,"Facebook");
    linkOrDisabled($("#social-ig"),settings.instagram,"Instagram");
    linkOrDisabled($("#social-tiktok"),settings.tiktok,"TikTok");
  }

  function renderProducts(){
    const root=$("#product-grid");
    root.innerHTML=products.map(p=>{
      const c=choiceFor(p), low=Number(p.stock||0)<=5;
      const variants=p.variants.map(v=>'<button type="button" class="variant-btn '+(v.weight===c.variant.weight?"active":"")+'" data-variant="'+esc(p.id)+'" data-weight="'+esc(v.weight)+'">'+esc(v.weight)+'</button>').join("");
      const grinds=p.grinds.map(g=>'<option value="'+esc(g)+'" '+(g===c.grind?"selected":"")+'>'+esc(g)+'</option>').join("");
      return '<article class="product-card">'+
        '<div class="product-art product-art-premium product-art-'+((Number(p.id)||1)%4||4)+'"><span class="stock-pill '+(low?"low urgent":"")+'">'+(Number(p.stock||0)>0?esc(low?"⚡ Only "+Number(p.stock)+" stock"+(Number(p.stock)===1?"":"s")+" left!":"In stock"):"Out of stock")+'</span><span class="product-price">'+money(c.variant.price)+'</span></div>'+
        '<div class="product-body"><div class="product-title-row"><h3>'+esc(p.name)+'</h3><span class="tag">'+esc(p.roast||"Fresh roast")+'</span></div>'+
        '<p>'+esc(p.note||"")+'</p><span class="product-label">Weight</span><div class="variant-row">'+variants+'</div>'+
        '<label class="product-label">Grind<select class="product-select" data-grind="'+esc(p.id)+'">'+grinds+'</select></label>'+
        '<div class="product-foot"><strong class="product-price-display">'+money(c.variant.price)+'</strong><button type="button" class="add-product" data-add="'+esc(p.id)+'" '+(Number(p.stock||0)<=0?"disabled":"")+'>Add to Cart</button></div></div>'+
      '</article>';
    }).join("");
  }

  function addProduct(p,variant,grind){
    const existing=cart.find(i=>String(i.id)===String(p.id)&&i.weight===variant.weight&&i.grind===grind);
    if(existing)existing.qty+=1;
    else cart.push({id:p.id,name:p.name,price:Number(variant.price||0),weight:variant.weight,grind,qty:1,emoji:p.emoji||"☕",bg:p.bg||"#F1E6D3"});
    saveCart();syncUi();
    showLayer("#cart-layer");
    toast(p.name+" added to cart");
  }
  function renderCart(){
    const root=$("#cart-list");
    if(!cart.length){root.innerHTML='<div class="empty-cart"><div><div style="font-size:46px">☕</div><strong>Your cart is empty.</strong><span>Add a coffee to begin your order.</span></div></div>';return}
    root.innerHTML=cart.map((i,idx)=>'<div class="cart-item"><div class="cart-item-art">KB</div><div><h3>'+esc(i.name)+'</h3><small>'+esc(i.weight)+(i.grind?" · "+esc(i.grind):"")+'</small><div class="qty"><button type="button" data-qty-minus="'+idx+'">−</button><span>'+Number(i.qty)+'</span><button type="button" data-qty-plus="'+idx+'">+</button></div><button type="button" class="remove-item" data-remove="'+idx+'">Remove</button></div><div class="cart-item-price">'+money(i.price*i.qty)+'</div></div>').join("");
  }

  function renderCheckoutOptions(){
    if($("#checkout-promo"))$("#checkout-promo").textContent=freeShip()?"Free shipping unlocked — 2 packs or more.":"Free shipping is available when you reach "+Number(shipping.minPacks||2)+" packs or more.";
    setText("#checkout-note",settings.orderNote||fallbackSettings.orderNote);
  }

  function submitOrder(e){
    e.preventDefault();
    if(!cart.length){toast("Your cart is empty.");return}
    const fd=new FormData(e.currentTarget);
    const order={
      id:"KB-"+Date.now().toString(36).toUpperCase(),
      createdAt:new Date().toISOString(),
      customer:{
        name:String(fd.get("name")||"").trim(),
        phone:String(fd.get("phone")||"").trim(),
        email:String(fd.get("email")||"").trim(),
        address:String(fd.get("address")||"").trim()
      },
      payment:String(fd.get("payment")||""),
      fulfillment:String(fd.get("fulfillment")||""),
      voucher:String(fd.get("voucher")||"").trim().toUpperCase(),
      paymentReference:String(fd.get("paymentReference")||"").trim(),
      paymentProofName:$("#payment-proof")?.files?.[0]?.name||"",
      shippingFree:freeShip(),
      total:cartSubtotal(),
      status:"Pending",
      statusUpdatedAt:new Date().toISOString(),
      cogs:0,shippingSubsidy:0,affiliateCommission:0,
      items:cart.map(i=>({id:i.id,name:i.name,price:i.price,weight:i.weight,grind:i.grind,qty:i.qty}))
    };
    const current=read("kb_orders",[]);
    const list=Array.isArray(current)?current:[];
    localStorage.setItem("kb_orders",JSON.stringify([order,...list.filter(x=>x?.id!==order.id)]));
    localStorage.setItem("kb_last_order",JSON.stringify(order));
    cart=[];saveCart();syncUi();
    $("#checkout-form").hidden=true;$("#order-success").hidden=false;
    setText("#success-text","Order "+order.id+" has been recorded. The store will confirm payment and fulfillment details using the contact information provided.");
  }

  function toast(message){
    let el=$("#store-toast");
    if(!el){el=document.createElement("div");el.id="store-toast";el.style.cssText="position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(15px);z-index:600;background:#2B1B12;color:#fff;padding:11px 15px;border-radius:999px;font:700 11px Inter,system-ui;opacity:0;transition:.2s;max-width:calc(100% - 24px);text-align:center";document.body.appendChild(el)}
    el.textContent=message;el.style.opacity="1";el.style.transform="translateX(-50%)";
    clearTimeout(window.__kbToast);window.__kbToast=setTimeout(()=>{el.style.opacity="0";el.style.transform="translateX(-50%) translateY(15px)"},2200);
  }

  function renderGallery(){
    $("#gallery-grid").innerHTML=gallery.slice(0,6).map((g,i)=>'<figure class="gallery-card"><img src="'+esc(g.image)+'" alt="'+esc(g.title||"Coffee gallery placeholder")+'" loading="lazy"><figcaption><span>Placeholder • '+String(i+1).padStart(2,"0")+'</span><strong>'+esc(g.title||"Gallery image")+'</strong><small>'+esc(g.caption||"")+'</small></figcaption></figure>').join("");
  }

  function bind(){
    $("#open-cart").onclick=()=>showLayer("#cart-layer");
    $("#hero-cart").onclick=()=>showLayer("#cart-layer");
    $("#products-cart").onclick=()=>showLayer("#cart-layer");
    $("#close-cart").onclick=()=>hideLayer("#cart-layer");
    $("#cart-backdrop").onclick=()=>hideLayer("#cart-layer");
    $("#close-checkout").onclick=()=>hideLayer("#checkout-layer");
    $("#checkout-backdrop").onclick=()=>hideLayer("#checkout-layer");
    $("#checkout-button").onclick=()=>{if(!cart.length){toast("Add a product first.");return}hideLayer("#cart-layer");showLayer("#checkout-layer");$("#checkout-form").hidden=false;$("#order-success").hidden=true;syncUi();renderPaymentHelp()};
    $("#success-close").onclick=()=>hideLayer("#checkout-layer");
    $("#open-track").onclick=()=>{showLayer("#track-layer");$("#track-order-id").focus();};
    $("#hero-track").onclick=()=>{showLayer("#track-layer");$("#track-order-id").focus();};
    $("#mobile-track").onclick=()=>{showLayer("#track-layer");$("#mobile-nav").style.display="none";$("#menu-button").setAttribute("aria-expanded","false");$("#track-order-id").focus();};
    $("#close-track").onclick=()=>hideLayer("#track-layer");
    $("#track-backdrop").onclick=()=>hideLayer("#track-layer");
    $("#track-form").addEventListener("submit",e=>{e.preventDefault();trackedOrderId=normalizeTrackId($("#track-order-id").value);renderTrackResult(findTrackedOrder(trackedOrderId));});
    $("#checkout-payment").addEventListener("change",renderPaymentHelp);
    $("#payment-proof").addEventListener("change",()=>{
      const f=$("#payment-proof")?.files?.[0];
      setText("#payment-proof-note",f?"Selected file: "+f.name+" — filename only in current static mode.":"On GitHub Pages mode, the file is not uploaded to a server; only its filename is attached to the local order record.");
    });
    $("#brew-play").onclick=()=>$("#brew-dialog").showModal();
    $$("[data-close-dialog]").forEach(x=>x.onclick=()=>x.closest("dialog")?.close());
    $("#checkout-form").addEventListener("submit",submitOrder);
    $("#menu-button").onclick=()=>{
      const nav=$("#mobile-nav"),open=nav.style.display==="block";
      nav.style.display=open?"none":"block";$("#menu-button").setAttribute("aria-expanded",String(!open));
    };
    $$("#mobile-nav a").forEach(a=>a.onclick=()=>{$("#mobile-nav").style.display="none";$("#menu-button").setAttribute("aria-expanded","false")});
    document.addEventListener("click",e=>{
      const v=e.target.closest("[data-variant]");
      if(v){
        picks[v.dataset.variant]={...(picks[v.dataset.variant]||{}),weight:v.dataset.weight};
        renderProducts();
        return;
      }
      const g=e.target.closest("[data-grind]");
      if(g){
        picks[g.dataset.grind]={...(picks[g.dataset.grind]||{}),grind:g.value};
        renderProducts();
        return;
      }
      const add=e.target.closest("[data-add]");
      if(add){const p=productById(add.dataset.add);const c=choiceFor(p);addProduct(p,c.variant,c.grind);return}
      const plus=e.target.closest("[data-qty-plus]");
      if(plus){cart[Number(plus.dataset.qtyPlus)].qty+=1;saveCart();syncUi();return}
      const minus=e.target.closest("[data-qty-minus]");
      if(minus){const i=Number(minus.dataset.qtyMinus);if(cart[i].qty>1)cart[i].qty-=1;else cart.splice(i,1);saveCart();syncUi();return}
      const rem=e.target.closest("[data-remove]");
      if(rem){cart.splice(Number(rem.dataset.remove),1);saveCart();syncUi();return}
    });
  }

  function init(){
    renderContent();renderHero();renderProducts();syncUi();bind();
    window.addEventListener("storage",e=>{
      if(["kb_products","kb_settings","kb_cms","kb_gallery","kb_shipping_rule"].includes(e.key))window.location.reload();
      if(e.key==="kb_orders"||e.key==="kb_last_order")refreshTrackedOrder();
      if(e.key==="kb_cart"){cart=read(cartKey,[]);syncUi()}
    });
  }
  setInterval(refreshTrackedOrder,3000);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();