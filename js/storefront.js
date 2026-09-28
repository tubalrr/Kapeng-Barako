(() => {
  "use strict";

  const PRODUCTS_KEY = "kb_rebuild_products";
  const CART_KEY = "kb_cart";
  const ORDERS_KEY = "kb_orders";
  const SETTINGS_KEY = "kb_settings";
  const PROMOS_KEY = "kb_promos";

  const DEFAULT_PRODUCTS = [
    {id:"KB250",name:"Barako 250g",size:"250g",price:350,stock:7,badge:"BEST SELLER",roast:"Dark",grind:"Medium",note:"Bold, aromatic, unmistakably Barako."},
    {id:"KB500",name:"Barako 500g",size:"500g",price:620,stock:7,badge:"FRESH ROAST",roast:"Medium",grind:"Whole",note:"A deeper everyday supply for the serious cup."},
    {id:"KB1K",name:"Barako 1kg",size:"1kg",price:1150,stock:7,badge:"VALUE",roast:"Dark",grind:"Coarse",note:"The full ritual, ready for the week."}
  ];
  const DEFAULT_SETTINGS = {
    email:"ILAG",phone:"ILAG",location:"ILAG",
    facebook:"",instagram:"",tiktok:"",
    gcashInstructions:"Add GCash number or QR instructions in Admin → Settings.",
    bankInstructions:"Add bank details in Admin → Settings."
  };

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const read=(key,fallback)=>{try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:0});
  const products=()=>{const p=read(PRODUCTS_KEY,null);return Array.isArray(p)&&p.length?p:DEFAULT_PRODUCTS};
  let cart=read(CART_KEY,[]);
  let seconds=180,timer=null;

  function toast(msg){
    let el=$("#kb-toast");if(!el){el=document.createElement("div");el.id="kb-toast";el.className="kb-toast";document.body.appendChild(el)}
    el.textContent=msg;el.classList.add("show");clearTimeout(window.__kbToast);window.__kbToast=setTimeout(()=>el.classList.remove("show"),2200);
  }
  function setModal(id,open){
    const m=$(id);if(!m)return;
    m.hidden=!open;document.body.classList.toggle("modal-open",open);
  }

  function renderProducts(){
    const root=$("#product-grid");if(!root)return;
    root.innerHTML=products().map((p,i)=>{
      const roast=["Light","Medium","Dark"].map(x=>'<button class="pill '+(x===p.roast?"active":"")+'" type="button" data-roast="'+esc(p.id)+'" data-value="'+x+'">'+x+'</button>').join("");
      const grind=["Whole","Coarse","Fine"].map(x=>'<button class="pill '+(x===p.grind?"active":"")+'" type="button" data-grind="'+esc(p.id)+'" data-value="'+x+'">'+x+'</button>').join("");
      const low=Number(p.stock)<=5;
      return '<article class="product-card" data-product-id="'+esc(p.id)+'">'+
        '<div class="product-media"><span class="stock-badge '+(low?"urgent":"")+'">'+(Number(p.stock)>0?"⚡ "+Number(p.stock)+" packs left":"SOLD OUT")+'</span><span class="size-label">'+esc(p.size)+'</span><div class="bean-cluster"><i></i><i></i><i></i><i></i></div></div>'+
        '<div class="product-body"><span class="mini-label">'+esc(p.badge||"FRESH ROAST")+'</span><h3>'+esc(p.name)+'</h3><div class="subline">'+esc(p.note||"Small-batch roasted.")+'</div>'+
        '<div class="price-row"><div><small>FROM</small><div class="price">'+money(p.price)+'</div></div><span class="size-label">'+esc(p.size)+'</span></div>'+
        '<div class="option-group"><small>Roast</small><div class="pills">'+roast+'</div></div>'+
        '<div class="option-group"><small>Grind</small><div class="pills">'+grind+'</div></div>'+
        '<button class="button gold add-btn" type="button" data-add-product="'+esc(p.id)+'" '+(Number(p.stock)<=0?"disabled":"")+'>ADD TO CART →</button></div></article>';
    }).join("");
  }

  function saveCart(){write(CART_KEY,cart)}
  function renderCart(){
    const root=$("#cart-list");if(!root)return;
    const count=cart.reduce((n,x)=>n+Number(x.qty||0),0),subtotal=cart.reduce((n,x)=>n+Number(x.price||0)*Number(x.qty||0),0);
    $("#cart-count").textContent=count;$("#hero-cart-count").textContent=count;$("#cart-items").textContent=count;$("#cart-total").textContent=money(subtotal);
    if(!cart.length){root.innerHTML='<div class="empty">Your cart is empty.</div>';return}
    root.innerHTML=cart.map((x,i)=>'<div class="cart-item"><div><h3>'+esc(x.name)+'</h3><small>'+esc(x.size)+' · '+esc(x.roast)+' roast · '+esc(x.grind)+' grind</small><div class="qty"><button type="button" data-minus="'+i+'">−</button><span>'+x.qty+'</span><button type="button" data-plus="'+i+'">+</button></div><button class="remove-item" type="button" data-remove="'+i+'">Remove</button></div><b class="cart-price">'+money(Number(x.price)*Number(x.qty))+'</b></div>').join("");
  }

  function currentAddress(){return $("#checkout-form [name='address']")?.value||""}
  function region(address){const a=String(address).toLowerCase();return /batangas/.test(a)?"batangas":/manila|quezon city|pasig|makati|taguig/.test(a)?"manila":"province"}
  function shippingFee(address){
    const packCount=cart.reduce((n,x)=>n+Number(x.qty||0),0);if(packCount>=2)return 0;
    const settings=read(SETTINGS_KEY,DEFAULT_SETTINGS),custom=read("kb_shipping_rule",{});
    const rates={batangas:Number(custom?.regional?.batangas??0),manila:Number(custom?.regional?.manila??150),province:Number(custom?.regional?.province??220)};
    return rates[region(address)]||0;
  }
  function promoDiscount(code,subtotal){
    const promos=read(PROMOS_KEY,[]),p=(Array.isArray(promos)?promos:[]).find(x=>String(x.code||"").toUpperCase()===String(code||"").trim().toUpperCase()&&x.active!==false);
    if(!p)return {amount:0,code:""};
    const min=Number(p.minPacks||0),packs=cart.reduce((n,x)=>n+Number(x.qty||0),0);if(packs<min)return {amount:0,code:""};
    const raw=Number(p.value||0),amount=p.type==="percent"?subtotal*raw/100:raw;return {amount:Math.min(subtotal,Math.max(0,amount)),code:p.code};
  }
  function checkoutTotals(){
    const subtotal=cart.reduce((n,x)=>n+Number(x.price||0)*Number(x.qty||0),0);
    const shipping=shippingFee(currentAddress()),promo=promoDiscount($("#voucher-code")?.value||"",subtotal);
    return {subtotal,shipping,discount:promo.amount,code:promo.code,total:Math.max(0,subtotal+shipping-promo.amount)};
  }
  function renderCheckout(){
    const t=checkoutTotals();
    $("#checkout-subtotal").textContent=money(t.subtotal);$("#checkout-shipping").textContent=t.shipping===0?"FREE":money(t.shipping);$("#checkout-discount").textContent=t.discount?"−"+money(t.discount):"—";$("#checkout-total").textContent=money(t.total);
  }

  function addToCart(id){
    const p=products().find(x=>String(x.id)===String(id));if(!p)return;
    const existing=cart.find(x=>String(x.id)===String(p.id));
    const qty=(existing?.qty||0)+1;if(qty>Number(p.stock||0)){toast("Only "+Number(p.stock||0)+" pack(s) left.");return}
    if(existing)existing.qty=qty;else cart.push({id:p.id,name:p.name,size:p.size,price:p.price,stock:p.stock,roast:p.roast,grind:p.grind,qty:1});
    saveCart();renderCart();setModal("#cart-modal",true);
  }

  function deductStock(items){
    const live=products().map(x=>({...x}));
    const changes=[];
    (items||[]).forEach(item=>{
      const p=live.find(x=>String(x.id)===String(item.id));if(!p)return;
      const before=Number(p.stock||0),after=Math.max(0,before-Number(item.qty||0));p.stock=after;
      changes.push(p.name+": "+before+" → "+after);
    });
    if(changes.length)write(PRODUCTS_KEY,live);
    return changes;
  }

  function placeOrder(e){
    e.preventDefault();if(!cart.length){toast("Your cart is empty.");return}
    const live=products();
    const shortage=cart.find(item=>{const p=live.find(x=>String(x.id)===String(item.id));return !p||Number(item.qty)>Number(p.stock||0)});
    if(shortage){toast("Stock changed. Only "+Number(live.find(x=>String(x.id)===String(shortage.id))?.stock||0)+" left.");renderProducts();return}
    const fd=new FormData(e.currentTarget),t=checkoutTotals();
    const order={id:"KB-"+Date.now().toString(36).toUpperCase(),createdAt:new Date().toISOString(),customer:{name:String(fd.get("name")||"").trim(),phone:String(fd.get("phone")||"").trim(),email:String(fd.get("email")||"").trim(),address:String(fd.get("address")||"").trim()},payment:fd.get("payment"),fulfillment:fd.get("fulfillment"),voucher:String(fd.get("voucher")||"").trim().toUpperCase(),subtotal:t.subtotal,shippingFee:t.shipping,discount:t.discount,total:t.total,status:"Pending",statusUpdatedAt:new Date().toISOString(),stockDeducted:true,items:cart.map(x=>({id:x.id,name:x.name,size:x.size,price:x.price,qty:x.qty,roast:x.roast,grind:x.grind}))};
    const orders=read(ORDERS_KEY,[]);write(ORDERS_KEY,[order,...(Array.isArray(orders)?orders:[])]);write("kb_last_order",order);deductStock(order.items);
    cart=[];saveCart();renderProducts();renderCart();e.currentTarget.hidden=true;$("#order-success").hidden=false;$("#success-text").textContent="Order "+order.id+" recorded. Save this Order ID for tracking.";
  }

  function trackOrder(e){
    e.preventDefault();const id=String($("#track-id").value||"").trim().replace(/^#/,"").toUpperCase(),orders=read(ORDERS_KEY,[]),order=(Array.isArray(orders)?orders:[]).find(x=>String(x.id||"").toUpperCase()===id);
    const root=$("#track-result");if(!order){root.innerHTML='<div class="empty">Order not found. Check the Order ID and try again.</div>';return}
    const steps=["Pending","Verified Payment","Processing/Roasting","Ready to Ship","Dispatched","Delivered"],idx=Math.max(0,steps.indexOf(order.status));
    root.innerHTML='<div class="track-head"><div><span class="mini-label">ORDER</span><b>#'+esc(order.id)+'</b></div><span class="track-status">'+esc(order.status)+'</span></div><div class="track-customer">'+esc(order.customer?.name||"Customer")+'<br>'+esc(order.customer?.address||"")+'</div><div class="track-line">'+steps.map((s,i)=>'<div class="track-step '+(i<idx?"done ":"")+(i===idx?"active":"")+'"><div class="track-dot">'+(i<idx?"✓":i+1)+'</div><div><h4>'+esc(s)+'</h4><p>'+esc(i<=idx?"Recorded":"Waiting")+'</p></div></div>').join("")+'</div>';
  }

  function setupMenu(){
    const toggle=()=>{const open=$("#mobile-sidebar").classList.toggle("is-open");$("#menu-overlay").classList.toggle("is-open",open);$("#menu-overlay").hidden=!open;$("#menu-button").classList.toggle("is-open",open);$("#menu-button").setAttribute("aria-expanded",String(open));document.body.classList.toggle("sidebar-open",open)};
    $("#menu-button")?.addEventListener("click",toggle);$("#sidebar-close")?.addEventListener("click",toggle);$("#menu-overlay")?.addEventListener("click",toggle);
    $$("#mobile-sidebar a").forEach(a=>a.addEventListener("click",()=>{if($("#mobile-sidebar").classList.contains("is-open"))toggle()}));
  }

  function setupTimer(){
    const display=()=>{$("#timer-display").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0")};
    $("#timer-start")?.addEventListener("click",()=>{if(timer)return;if(seconds<=0)seconds=180;timer=setInterval(()=>{seconds--;display();if(seconds<=0){clearInterval(timer);timer=null;toast("Brew timer complete.")}},1000)});
    $("#timer-pause")?.addEventListener("click",()=>{clearInterval(timer);timer=null});
    $("#timer-reset")?.addEventListener("click",()=>{clearInterval(timer);timer=null;seconds=180;display()});display();
  }

  function setupConversion(){
    $("#wholesale-toggle")?.addEventListener("change",e=>$("#wholesale-panel").hidden=!e.target.checked);
    $("#wholesale-request")?.addEventListener("click",()=>{const kg=Math.max(10,Number($("#wholesale-kg").value||10));write("kb_wholesale_request",{kg,roast:$("#wholesale-roast").value,createdAt:new Date().toISOString()});toast("Wholesale inquiry saved.")});
    const pselect=$("#subscription-product"),wselect=$("#subscription-weight");
    const refreshWeights=()=>{const p=products().find(x=>String(x.id)===String(pselect.value));wselect.innerHTML=p?'<option>'+esc(p.size)+'</option>':"<option>Select</option>"};
    if(pselect){pselect.innerHTML=products().map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");refreshWeights();pselect.addEventListener("change",refreshWeights)}
    $("#subscription-save")?.addEventListener("click",()=>{write("kb_subscription_preference",{product:pselect.value,weight:wselect.value,day:$("#subscription-day").value,createdAt:new Date().toISOString()});toast("Delivery preference saved.")});
  }

  function renderSettings(){
    const s={...DEFAULT_SETTINGS,...read(SETTINGS_KEY,{})};
    $$("[data-contact]").forEach(el=>{const key=el.dataset.contact;el.textContent=s[key]||"ILAG";if(key==="email")el.href="mailto:"+(s[key]||"ILAG")});
    $$("[data-social]").forEach(el=>{const url=String(s[el.dataset.social]||"");if(/^https?:\/\//i.test(url))el.href=url;else{el.removeAttribute("href");el.style.opacity=".55";el.style.pointerEvents="none"}});
    $("#payment-help").textContent=s.gcashInstructions||DEFAULT_SETTINGS.gcashInstructions;
  }

  function init(){
    renderProducts();renderCart();renderCheckout();renderSettings();setupMenu();setupTimer();setupConversion();
    $("#open-cart")?.addEventListener("click",()=>setModal("#cart-modal",true));$("#hero-cart")?.addEventListener("click",()=>setModal("#cart-modal",true));
    $("#hero-track")?.addEventListener("click",()=>setModal("#track-modal",true));
    $("#checkout-open")?.addEventListener("click",()=>{if(!cart.length){toast("Add a coffee first.");return}setModal("#cart-modal",false);setModal("#checkout-modal",true);renderCheckout()});
    $$("[data-close-modal]").forEach(x=>x.addEventListener("click",()=>setModal("#"+x.closest(".modal").id,false)));
    $("#checkout-form")?.addEventListener("submit",placeOrder);$("#track-form")?.addEventListener("submit",trackOrder);
    $("#checkout-form [name='address']")?.addEventListener("input",renderCheckout);$("#voucher-code")?.addEventListener("input",renderCheckout);
    $("#brew-video")?.addEventListener("click",()=>$("#brew-dialog").showModal());
    $$("[data-close-dialog]").forEach(x=>x.addEventListener("click",()=>x.closest("dialog").close()));
    document.addEventListener("click",e=>{
      const add=e.target.closest("[data-add-product]");if(add){addToCart(add.dataset.addProduct);return}
      const plus=e.target.closest("[data-plus]");if(plus){const i=Number(plus.dataset.plus),p=cart[i]&&products().find(x=>String(x.id)===String(cart[i].id));if(p&&cart[i].qty<p.stock)cart[i].qty++;else toast("Stock limit reached.");saveCart();renderCart();return}
      const minus=e.target.closest("[data-minus]");if(minus){const i=Number(minus.dataset.minus);if(cart[i].qty>1)cart[i].qty--;else cart.splice(i,1);saveCart();renderCart();renderCheckout();return}
      const remove=e.target.closest("[data-remove]");if(remove){cart.splice(Number(remove.dataset.remove),1);saveCart();renderCart();renderCheckout();return}
      const roast=e.target.closest("[data-roast]");if(roast){const card=roast.closest(".product-card");card.querySelectorAll("[data-roast]").forEach(x=>x.classList.remove("active"));roast.classList.add("active");return}
      const grind=e.target.closest("[data-grind]");if(grind){const card=grind.closest(".product-card");card.querySelectorAll("[data-grind]").forEach(x=>x.classList.remove("active"));grind.classList.add("active");return}
    });
    window.addEventListener("storage",e=>{if([PRODUCTS_KEY,CART_KEY,ORDERS_KEY,SETTINGS_KEY,PROMOS_KEY].includes(e.key)){cart=read(CART_KEY,[]);renderProducts();renderCart();renderCheckout();renderSettings()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();