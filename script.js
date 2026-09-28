(() => {
"use strict";

const CART_KEY = "kb_cart";
const ORDER_KEY = "kb_orders";
const PRODUCT_KEY = "kb_rebuild_products";

const DEFAULT_PRODUCTS = [
  {id:"KB250",name:"Barako 250g",size:"250g",price:350,stock:7},
  {id:"KB500",name:"Barako 500g",size:"500g",price:620,stock:7},
  {id:"KB1K",name:"Barako 1kg",size:"1kg",price:1150,stock:7}
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const read = (k,f) => { try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const write = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const money = n => "₱" + Number(n || 0).toLocaleString("en-PH",{maximumFractionDigits:0});
const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getProducts = () => {
  const saved = read(PRODUCT_KEY,null);
  if(Array.isArray(saved)) return saved;
  return DEFAULT_PRODUCTS.map(p => ({...p}));
};

let cart = Array.isArray(read(CART_KEY,[])) ? read(CART_KEY,[]) : [];
let brewSeconds = 180;
let brewTimer = null;

function toast(message){
  const el = $("#toast");
  if(!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__kbToast);
  window.__kbToast = setTimeout(()=>el.classList.remove("show"),2200);
}

function setModal(id,open){
  const el=$(id);
  if(!el) return;
  el.hidden=!open;
  document.body.classList.toggle("no-scroll",open);
}

function cartCount(){
  return cart.reduce((n,i)=>n+Number(i.qty||0),0);
}

function cartTotal(){
  return cart.reduce((n,i)=>n+Number(i.price||0)*Number(i.qty||0),0);
}

function renderCart(){
  const count=cartCount();
  $("#cartCount").textContent=count;
  $("#heroCartCount").textContent=count;
  $("#cartTotal").textContent=money(cartTotal());
  const root=$("#cartItems");
  if(!cart.length){
    root.innerHTML='<div class="empty">Your cart is empty. Choose a Barako coffee to begin.</div>';
    $("#checkoutButton").disabled=true;
    return;
  }
  $("#checkoutButton").disabled=false;
  root.innerHTML=cart.map((item,i)=>
    '<div class="cart-item"><div><h3>'+esc(item.name)+'</h3><small>'+esc(item.size)+' • '+esc(item.roast)+' Roast • '+esc(item.grind)+' Grind</small><div class="qty"><button type="button" data-plus="'+i+'">+</button><span>'+Number(item.qty||0)+'</span><button type="button" data-minus="'+i+'">−</button></div><button class="remove-item" type="button" data-remove="'+i+'">REMOVE</button></div><strong class="cart-price">'+money(Number(item.price||0)*Number(item.qty||0))+'</strong></div>'
  ).join("");
}

function renderProducts(){
  const products=getProducts();
  const grid=$("#productGrid");
  if(grid && !products.length){
    grid.innerHTML='<div class="catalog-empty"><span>PRODUCTION CATALOG</span><h3>Products coming soon.</h3><p>The catalog is currently empty. Products are added by the store administrator using real product data.</p></div>';
    return;
  }
  if(grid) grid.querySelectorAll(".catalog-empty").forEach(x=>x.remove());
  if(grid){
    products.forEach(p=>{
      let card=grid.querySelector('[data-product-id="'+CSS.escape(String(p.id))+'"]');
      if(!card){
        card=document.createElement("article");
        card.className="product-card";
        card.dataset.productId=p.id;
        card.innerHTML=
          '<div class="product-image product-image-generic">'+
            '<span class="stock-badge" data-stock-badge="'+esc(p.id)+'"></span>'+
            '<span class="image-size">'+esc(p.size||"")+'</span>'+
            '<div class="bean-cluster bean-cluster-large"><i></i><i></i><i></i><i></i></div>'+
          '</div>'+
          '<div class="product-content">'+
            '<div class="product-title-line">'+
              '<div><span class="product-badge">'+esc(p.badge||"NEW")+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(p.note||"Fresh Kapeng Barako.")+'</p></div>'+
              '<strong class="product-price" data-price="'+esc(p.id)+'"></strong>'+
            '</div>'+
            '<div class="selector-block"><span>ROAST</span><div class="pills" data-roast-group="'+esc(p.id)+'"><button type="button" class="pill '+(p.roast==="Light"?"active":"")+'">Light</button><button type="button" class="pill '+(p.roast==="Medium"?"active":"")+'">Medium</button><button type="button" class="pill '+(p.roast==="Dark"?"active":"")+'">Dark</button></div></div>'+
            '<div class="selector-block"><span>GRIND</span><div class="pills" data-grind-group="'+esc(p.id)+'"><button type="button" class="pill '+(p.grind==="Whole"?"active":"")+'">Whole</button><button type="button" class="pill '+(p.grind==="Coarse"?"active":"")+'">Coarse</button><button type="button" class="pill '+(p.grind==="Fine"?"active":"")+'">Fine</button></div></div>'+
            '<button class="button button-gold add-to-cart" type="button" data-add-to-cart="'+esc(p.id)+'">ADD TO CART →</button>'+
          '</div>';
        grid.appendChild(card);
      }

      const stock=Math.max(0,Number(p.stock||0));
      const badge=card.querySelector("[data-stock-badge]");
      const button=card.querySelector("[data-add-to-cart]");
      const price=card.querySelector("[data-price]");
      if(price) price.textContent=money(p.price);
      if(badge){
        badge.textContent=stock ? (stock<=5 ? "⚡ Only "+stock+" packs left" : "⚡ "+stock+" packs left") : "SOLD OUT";
        badge.classList.toggle("urgent",stock>0 && stock<=5);
      }
      if(button){
        button.disabled=stock<=0;
        button.textContent=stock<=0 ? "SOLD OUT" : "ADD TO CART →";
      }
    });
  }
}
function selected(card,attr,fallback){
  const active=card?.querySelector("["+attr+"] .pill.active");
  return active ? active.textContent.trim() : fallback;
}

function addToCart(id){
  const product=getProducts().find(p=>String(p.id)===String(id));
  if(!product) return;
  const card=document.querySelector('[data-product-id="'+CSS.escape(String(id))+'"]');
  const roast=selected(card,"data-roast-group","Dark");
  const grind=selected(card,"data-grind-group","Whole");
  const existing=cart.find(x=>String(x.id)===String(id)&&x.roast===roast&&x.grind===grind);
  const next=Number(existing?.qty||0)+1;
  const stock=Math.max(0,Number(product.stock||0));
  if(stock<=0){toast("Sold out: "+product.name+".");return}
  if(next>stock){toast("Only "+stock+" pack(s) left.");return}
  if(existing) existing.qty=next;
  else cart.push({id:product.id,name:product.name,size:product.size,price:Number(product.price||0),roast,grind,qty:1});
  write(CART_KEY,cart);
  renderCart();
  setModal("#cartModal",true);
  toast(product.name+" added to cart.");
}

function changeQty(index,delta){
  const item=cart[index];
  if(!item) return;
  const product=getProducts().find(p=>String(p.id)===String(item.id));
  const next=Number(item.qty||0)+delta;
  const stock=Number(product?.stock||0);
  if(next<=0) cart.splice(index,1);
  else if(next<=stock) item.qty=next;
  else toast("Stock limit: "+stock+" pack(s).");
  write(CART_KEY,cart);
  renderCart();
}

function shippingFee(address){
  if(cartCount()>=2) return 0;
  const rule=read("kb_shipping_rule",{});
  const a=String(address||"").toLowerCase();
  if(a.includes("batangas")) return Number(rule?.regional?.batangas??0);
  if(/manila|quezon city|makati|pasig|taguig/.test(a)) return Number(rule?.regional?.manila??150);
  return Number(rule?.regional?.province??220);
}

function promoDiscount(code,subtotal){
  const list=read("kb_promos",[]);
  if(!Array.isArray(list)) return 0;
  const wanted=String(code||"").trim().toUpperCase();
  const p=list.find(x=>String(x.code||"").toUpperCase()===wanted&&x.active!==false);
  if(!p || cartCount()<Number(p.minPacks||0)) return 0;
  const v=Number(p.value||0);
  return Math.min(subtotal,p.type==="percent"?subtotal*v/100:v);
}

function checkoutBox(){
  if($(".checkout-inline")) return;
  const box=document.createElement("div");
  box.className="checkout-inline";
  box.innerHTML='<div class="inline-head"><span>CHECKOUT</span><button type="button" id="cancelCheckout">×</button></div><form id="checkoutFormInline" class="checkout-form">'+
    '<label>Full name<input name="name" required></label>'+
    '<label>Phone<input name="phone" required></label>'+
    '<label>Email<input name="email" type="email"></label>'+
    '<label>Payment<select name="payment"><option>GCash</option><option>Cash on Delivery (COD)</option><option>Bank Transfer</option></select></label>'+
    '<label>Delivery address<textarea name="address" rows="3" required></textarea></label>'+
    '<label>Voucher<input name="voucher" placeholder="Optional"></label>'+
    '<label>Fulfillment<select name="fulfillment"><option>Lalamove</option><option>J&T</option><option>LBC</option><option>QC Meetup</option></select></label>'+
    '<div class="inline-summary"><div><span>Subtotal</span><strong id="inlineSubtotal">₱0</strong></div><div><span>Shipping</span><strong id="inlineShipping">—</strong></div><div><span>Discount</span><strong id="inlineDiscount">—</strong></div><div class="grand"><span>Total</span><strong id="inlineTotal">₱0</strong></div></div>'+
    '<button class="button button-gold full" type="submit">PLACE ORDER →</button>'+
    '<small>Order data is saved in this browser only.</small></form>';
  $("#cartModal .cart-panel").appendChild(box);
  $("#checkoutButton").hidden=true;

  function refresh(){
    const form=$("#checkoutFormInline");
    const subtotal=cartTotal();
    const shipping=shippingFee(form?.address?.value||"");
    const discount=promoDiscount(form?.voucher?.value||"",subtotal);
    $("#inlineSubtotal").textContent=money(subtotal);
    $("#inlineShipping").textContent=shipping===0 ? "FREE" : money(shipping);
    $("#inlineDiscount").textContent=discount ? "−"+money(discount) : "—";
    $("#inlineTotal").textContent=money(Math.max(0,subtotal+shipping-discount));
  }

  $("#checkoutFormInline").addEventListener("input",refresh);
  $("#checkoutFormInline").addEventListener("submit",placeOrder);
  $("#cancelCheckout").addEventListener("click",()=>{box.remove();$("#checkoutButton").hidden=false});
  refresh();
}

function placeOrder(event){
  event.preventDefault();
  const form=event.currentTarget;
  const live=getProducts();
  const shortage=cart.find(item=>{
    const p=live.find(x=>String(x.id)===String(item.id));
    return !p || Number(item.qty||0)>Number(p.stock||0);
  });
  if(shortage){
    toast("Stock has changed. Please review your cart.");
    renderProducts();
    return;
  }

  const fd=new FormData(form);
  const subtotal=cartTotal();
  const shipping=shippingFee(fd.get("address"));
  const discount=promoDiscount(fd.get("voucher"),subtotal);
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
    subtotal,
    shippingFee:shipping,
    discount,
    total:Math.max(0,subtotal+shipping-discount),
    status:"Pending",
    statusUpdatedAt:new Date().toISOString(),
    stockDeducted:true,
    items:cart.map(x=>({...x}))
  };

  const updated=live.map(product=>{
    const line=order.items.find(item=>String(item.id)===String(product.id));
    return line ? {...product,stock:Math.max(0,Number(product.stock||0)-Number(line.qty||0))} : product;
  });

  const orders=read(ORDER_KEY,[]);
  write(PRODUCT_KEY,updated);
  write(ORDER_KEY,[order,...(Array.isArray(orders)?orders:[])]);
  write("kb_last_order",order);
  cart=[];
  write(CART_KEY,cart);
  renderProducts();
  renderCart();
  $(".checkout-inline")?.remove();
  $("#checkoutButton").hidden=false;
  toast("Order "+order.id+" recorded.");
}

function trackOrder(event){
  event.preventDefault();
  const id=String($("#trackOrderId").value||"").trim().replace(/^#/,"").toUpperCase();
  const orders=read(ORDER_KEY,[]);
  const order=(Array.isArray(orders)?orders:[]).find(x=>String(x.id||"").toUpperCase()===id);
  const root=$("#trackResult");

  if(!order){
    root.innerHTML='<div class="empty">Order not found. Check your Order ID.</div>';
    return;
  }

  const steps=["Pending","Verified Payment","Processing/Roasting","Ready to Ship","Dispatched","Delivered"];
  const active=Math.max(0,steps.indexOf(order.status));

  root.innerHTML='<div class="track-customer"><strong>'+esc(order.id)+'</strong><br>'+esc(order.customer?.name||"Customer")+'<br>'+esc(order.customer?.address||"")+'</div>'+
    steps.map((step,i)=>'<div class="track-step '+(i<active?"done ":"")+(i===active?"active":"")+'"><div class="track-dot">'+(i<active?"✓":i+1)+'</div><div><h4>'+esc(step)+'</h4><p>'+(i<=active?"Recorded":"Waiting")+'</p></div></div>').join("");
}

function setupMenu(){
  const button=$("#menuButton"),sidebar=$("#mobileSidebar"),overlay=$("#menuOverlay");
  if(!button||!sidebar||!overlay) return;
  const setOpen=open=>{
    button.classList.toggle("is-open",open);
    sidebar.classList.toggle("is-open",open);
    overlay.classList.toggle("is-open",open);
    overlay.hidden=!open;
    button.setAttribute("aria-expanded",String(open));
    button.setAttribute("aria-label",open?"Close menu":"Open menu");
    document.body.classList.toggle("no-scroll",open);
  };
  button.addEventListener("click",()=>setOpen(!sidebar.classList.contains("is-open")));
  $("#sidebarClose")?.addEventListener("click",()=>setOpen(false));
  overlay.addEventListener("click",()=>setOpen(false));
  $$(".sidebar-nav a").forEach(a=>a.addEventListener("click",()=>setOpen(false)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")setOpen(false)});
}

function setupTimer(){
  const draw=()=>{$("#brewTimer").textContent=String(Math.floor(brewSeconds/60)).padStart(2,"0")+":"+String(brewSeconds%60).padStart(2,"0")};
  draw();
  $("#timerStart")?.addEventListener("click",()=>{
    if(brewTimer) return;
    if(brewSeconds<=0) brewSeconds=180;
    brewTimer=setInterval(()=>{
      brewSeconds--;
      draw();
      if(brewSeconds<=0){
        clearInterval(brewTimer);
        brewTimer=null;
        toast("Brew timer complete.");
      }
    },1000);
  });
  $("#timerPause")?.addEventListener("click",()=>{clearInterval(brewTimer);brewTimer=null});
  $("#timerReset")?.addEventListener("click",()=>{clearInterval(brewTimer);brewTimer=null;brewSeconds=180;draw()});
}

function setupControls(){
  $("#openCart")?.addEventListener("click",()=>setModal("#cartModal",true));
  $("#heroCartButton")?.addEventListener("click",()=>setModal("#cartModal",true));
  $("#heroTrackButton")?.addEventListener("click",()=>setModal("#trackModal",true));
  $("#checkoutButton")?.addEventListener("click",checkoutBox);
  $$("[data-close-cart]").forEach(x=>x.addEventListener("click",()=>setModal("#cartModal",false)));
  $$("[data-close-track]").forEach(x=>x.addEventListener("click",()=>setModal("#trackModal",false)));
  $("#trackForm")?.addEventListener("submit",trackOrder);

  document.addEventListener("click",event=>{
    const add=event.target.closest("[data-add-to-cart]");
    if(add){addToCart(add.dataset.addToCart);return}
    const plus=event.target.closest("[data-plus]");
    if(plus){changeQty(Number(plus.dataset.plus),1);return}
    const minus=event.target.closest("[data-minus]");
    if(minus){changeQty(Number(minus.dataset.minus),-1);return}
    const remove=event.target.closest("[data-remove]");
    if(remove){cart.splice(Number(remove.dataset.remove),1);write(CART_KEY,cart);renderCart();return}
    const pill=event.target.closest(".pill");
    if(pill){
      const group=pill.closest(".pills");
      if(group) group.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
      pill.classList.add("active");
    }
  });
  $("#wholesaleToggle")?.addEventListener("change",e=>$("#wholesaleForm").hidden=!e.target.checked);
  $("#wholesaleRequest")?.addEventListener("click",()=>{
    const kg=Math.max(10,Number($("#wholesaleKg").value||10));
    write("kb_wholesale_request",{kg,roast:$("#wholesaleRoast").value,createdAt:new Date().toISOString()});
    toast("Wholesale inquiry saved.");
  });
  $("#subscriptionSave")?.addEventListener("click",()=>{
    write("kb_subscription_preference",{product:$("#subscriptionProduct").value,day:$("#subscriptionDay").value,createdAt:new Date().toISOString()});
    toast("Auto-delivery preference saved.");
  });
  $("#brewVideoButton")?.addEventListener("click",()=>{
    const dialog=$("#brew-dialog");
    if(dialog?.showModal) dialog.showModal();
    else toast("Brew guide is unavailable.");
  });
  $("#brewDialogStart")?.addEventListener("click",()=>{
    $("#timerReset")?.click();
    $("#timerStart")?.click();
    $("#brew-dialog")?.close();
  });
  $$("[data-close-dialog]").forEach(x=>x.addEventListener("click",()=>x.closest("dialog")?.close()));
}

function setupPrivacyNotice(){
  const notice=$("#cookieNotice");
  const ok=$("#cookieOk");
  if(!notice||!ok) return;

  let consent="";
  try{ consent=localStorage.getItem("kb_cookie_consent")||""; }catch{}

  if(consent==="acknowledged"){
    notice.hidden=true;
    return;
  }

  notice.hidden=false;
  ok.addEventListener("click",()=>{
    try{localStorage.setItem("kb_cookie_consent","acknowledged");}catch{}
    notice.hidden=true;
  });
}

function init(){
  renderProducts();
  renderCart();
  setupMenu();
  setupTimer();
  setupControls();
  setupPrivacyNotice();
  window.addEventListener("storage",e=>{
    if([CART_KEY,ORDER_KEY,PRODUCT_KEY].includes(e.key)){
      cart=read(CART_KEY,[]);
      renderProducts();
      renderCart();
    }
  });
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
else init();

})();