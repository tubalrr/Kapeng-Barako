(() => {
  "use strict";
  const PRODUCTS_KEY="kb_rebuild_products", ORDERS_KEY="kb_orders", PROMOS_KEY="kb_promos", SETTINGS_KEY="kb_settings", CMS_KEY="kb_cms", GALLERY_KEY="kb_gallery", ADS_KEY="kb_ads";
  const DEFAULT_PRODUCTS=[
    {id:"KB250",name:"Barako 250g",size:"250g",price:350,stock:7,badge:"BEST SELLER",roast:"Dark",grind:"Medium",note:"Bold, aromatic, unmistakably Barako."},
    {id:"KB500",name:"Barako 500g",size:"500g",price:620,stock:7,badge:"FRESH ROAST",roast:"Medium",grind:"Whole",note:"A deeper everyday supply for the serious cup."},
    {id:"KB1K",name:"Barako 1kg",size:"1kg",price:1150,stock:7,badge:"VALUE",roast:"Dark",grind:"Coarse",note:"The full ritual, ready for the week."}
  ];
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}};
  const write=(k,v)=>{
    try{
      const existing=localStorage.getItem(k);
      if(existing!==null) localStorage.setItem("kb_backup_"+k,existing);
      localStorage.setItem(k,JSON.stringify(v));
    }catch{}
  };
  const money=n=>"₱"+Number(n||0).toLocaleString("en-PH");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let products=read(PRODUCTS_KEY,[]);if(!Array.isArray(products))products=[];
  let gallery=read(GALLERY_KEY,[]);if(!Array.isArray(gallery))gallery=[];
  let ads=read(ADS_KEY,{link:"",image:"",label:""});if(!ads||typeof ads!=="object"||Array.isArray(ads))ads={link:"",image:"",label:""};
  let orderSearch="";
  let lowStockSoundEnabled=localStorage.getItem("kb_low_stock_sound")==="1";
  let lastLowStockCount=-1;
  let catalogChannel=null;
  try{
    if("BroadcastChannel" in window){
      catalogChannel=new BroadcastChannel("kapeng-barako-catalog");
    }
  }catch{}
  function notifyCatalogChanged(){
    try{catalogChannel?.postMessage({type:"products-updated",at:Date.now()});}catch{}
  }

  let orders=Array.isArray(read(ORDERS_KEY,[]))?read(ORDERS_KEY,[]):[];
  let promos=Array.isArray(read(PROMOS_KEY,[]))?read(PROMOS_KEY,[]):[];

  function refreshData(){products=Array.isArray(read(PRODUCTS_KEY,products))?read(PRODUCTS_KEY,products):products;orders=Array.isArray(read(ORDERS_KEY,[]))?read(ORDERS_KEY,[]):[];promos=Array.isArray(read(PROMOS_KEY,[]))?read(PROMOS_KEY,[]):[]}
  function toast(msg){const t=$("#admin-toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__adminToast);window.__adminToast=setTimeout(()=>t.classList.remove("show"),2200)}

  function lowProducts(){return products.filter(p=>Number(p.stock||0)<=5)}
  function revenue(){return orders.reduce((n,o)=>n+Number(o.total||0),0)}
  function startOfDay(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()}
  function startOfWeek(d=new Date()){return startOfDay(d)-((d.getDay()+6)%7)*86400000}
  function todaySales(){const t=startOfDay();return orders.filter(o=>new Date(o.createdAt||0).getTime()>=t).reduce((n,o)=>n+Number(o.total||0),0)}
  function weekSales(){const t=startOfWeek();return orders.filter(o=>new Date(o.createdAt||0).getTime()>=t).reduce((n,o)=>n+Number(o.total||0),0)}
  function customers(){const m=new Map();orders.forEach(o=>{const c=o.customer||{};const key=(c.email||c.phone||c.name||"unknown").toLowerCase();if(!m.has(key))m.set(key,{name:c.name||"Unnamed",phone:c.phone||"",email:c.email||"",orders:0,revenue:0,address:c.address||""});const x=m.get(key);x.orders++;x.revenue+=Number(o.total||0);if(c.address)x.address=c.address});return [...m.values()]}

  function playLowStockAlert(){
    if(!lowStockSoundEnabled)return;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      const ctx=window.__kbAlertAudioCtx||new AudioCtx();
      window.__kbAlertAudioCtx=ctx;
      if(ctx.state==="suspended")ctx.resume().catch(()=>{});
      const now=ctx.currentTime;
      [0,1,2].forEach((step)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type="sine";
        osc.frequency.value=step===1?880:660;
        gain.gain.setValueAtTime(0.0001,now+step*0.16);
        gain.gain.exponentialRampToValueAtTime(0.08,now+step*0.16+0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001,now+step*0.16+0.12);
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(now+step*0.16);osc.stop(now+step*0.16+0.14);
      });
    }catch{}
  }

  function renderLowStockAlert(low){
    const root=$("#low-stock-alert"), card=$("#low-card");
    if(!root||!card)return;
    const count=low.length;
    card.classList.toggle("low",count>0);
    root.hidden=count===0;
    if(count===0){root.innerHTML="";lastLowStockCount=0;return;}
    const names=low.slice(0,4).map(p=>'<b>'+esc(p.name)+'</b> <span>('+Number(p.stock||0)+' packs)</span>').join(" · ");
    root.innerHTML='<div class="low-stock-icon">!</div><div><strong>LOW STOCK ALERT</strong><p>'+count+' product'+(count===1?" is":"s are")+' at ≤ 5 packs. '+names+(count>4?" · +"+(count-4)+" more":"")+'</p></div><span class="low-stock-badge">'+count+' LOW</span>';
    if(count>0 && count!==lastLowStockCount) playLowStockAlert();
    lastLowStockCount=count;
  }

  async function syncMainPageData(){
    try{
      const response=await fetch("../../index.html",{cache:"no-store"});
      if(!response.ok)return false;
      const html=await response.text();
      const doc=new DOMParser().parseFromString(html,"text/html");

      const existingProducts=read(PRODUCTS_KEY,null);
      if(!Array.isArray(existingProducts)||!existingProducts.length){
        const importedProducts=[...doc.querySelectorAll("#productGrid .product-card[data-product-id]")].map(card=>{
          const id=String(card.dataset.productId||"").trim();
          const title=card.querySelector("h3")?.textContent.trim()||"";
          const size=card.querySelector(".image-size")?.textContent.trim()||"";
          const priceText=card.querySelector(".product-price")?.textContent||"";
          const price=Number(priceText.replace(/[^0-9.]/g,""))||0;
          const stockText=card.querySelector("[data-stock-badge]")?.textContent||"";
          const stockMatch=stockText.match(/(\d+)\s*packs?/i);
          const stock=stockMatch?Number(stockMatch[1]):0;
          const badge=card.querySelector(".product-badge")?.textContent.trim()||"";
          const note=card.querySelector(".product-title-line p")?.textContent.trim()||"";
          const roast=card.querySelector('[data-roast-group] .pill.active')?.textContent.trim()||"";
          const grind=card.querySelector('[data-grind-group] .pill.active')?.textContent.trim()||"";
          return {id,name:title,size,price,stock,badge,roast,grind,note};
        }).filter(p=>p.id&&p.name);
        if(importedProducts.length){
          products=importedProducts;
          write(PRODUCTS_KEY,products);
        }
      }

      const existingGallery=read(GALLERY_KEY,null);
      if(!Array.isArray(existingGallery)||!existingGallery.length){
        const importedGallery=[...doc.querySelectorAll("#gallery .gallery-grid figure")].map((figure,index)=>{
          const img=figure.querySelector("img");
          const caption=figure.querySelector("figcaption")?.textContent.trim()||"";
          const title=caption.replace(/^\\d+\\s*[·.-]?\\s*/,"").trim();
          return {
            slot:index+1,
            title,
            image:img?.getAttribute("src")||"",
            alt:img?.getAttribute("alt")||title
          };
        }).filter(g=>g.image);
        if(importedGallery.length){
          gallery=importedGallery;
          write(GALLERY_KEY,gallery);
        }
      }
      return true;
    }catch(error){
      console.warn("Main page data sync skipped:",error);
      return false;
    }
  }

  function renderOverview(){
    refreshData();
    const low=lowProducts(), cs=customers();
    renderLowStockAlert(low);
    $("#metric-orders").textContent=orders.length;$("#metric-low").textContent=low.length;$("#metric-tickets").textContent="0";$("#metric-revenue").textContent=money(revenue());
    $("#metric-today").textContent=money(todaySales());$("#metric-week").textContent=money(weekSales());$("#metric-customers").textContent=cs.length;
    $("#low-card").classList.toggle("low",low.length>0);
    $("#count-pending").textContent=orders.filter(o=>o.status==="Pending").length;$("#count-processing").textContent=orders.filter(o=>o.status==="Processing/Roasting").length;$("#count-ready").textContent=orders.filter(o=>o.status==="Ready to Ship").length;$("#count-delivered").textContent=orders.filter(o=>o.status==="Delivered").length;
    renderQueue();renderChart();renderInventorySummary();
  }

  function renderQueue(){
    const queue=orders.filter(o=>!["Delivered","Cancelled"].includes(o.status)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).slice(0,10);
    const root=$("#fulfillment-queue");if(!queue.length){root.innerHTML='<div class="empty">No active fulfillment orders.</div>';return}
    root.innerHTML=queue.map(o=>'<div class="queue-item"><div><b>'+esc(o.id)+'</b><br><span>'+esc(o.customer?.name||"Customer")+'</span></div><div><span class="queue-status">'+esc(o.status||"Pending")+'</span><br><span>'+money(o.total)+'</span></div></div>').join("");
  }

  function renderChart(){
    const canvas=$("#sales-chart"), fallback=$("#chart-fallback");if(!canvas)return;
    const end=new Date();const labels=[],values=[];
    for(let i=6;i>=0;i--){const d=new Date(end.getFullYear(),end.getMonth(),end.getDate()-i);labels.push(d.toLocaleDateString("en-PH",{weekday:"short"}));const from=d.getTime(),to=from+86400000;values.push(orders.filter(o=>{const t=new Date(o.createdAt||0).getTime();return t>=from&&t<to}).reduce((n,o)=>n+Number(o.total||0),0))}
    if(window.Chart){
      fallback.hidden=true;
      if(window.__kbChart)window.__kbChart.destroy();
      window.__kbChart=new Chart(canvas,{type:"bar",data:{labels,datasets:[{label:"Sales",data:values,backgroundColor:"#C8A951",borderRadius:6,maxBarThickness:46}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:"#847562",font:{size:9}}},y:{beginAtZero:true,grid:{color:"rgba(245,233,211,.07)"},ticks:{color:"#847562",font:{size:9},callback:v=>"₱"+Number(v).toLocaleString("en-PH")}}}}});
    }else{
      canvas.style.display="none";fallback.hidden=false;const max=Math.max(...values,1);fallback.innerHTML=values.map((v,i)=>'<div style="flex:'+Math.max(v/max,.03)+'"><div class="chart-bar" style="height:'+Math.max((v/max)*230,8)+'px"></div><span class="chart-label">'+labels[i]+'</span></div>').join("");
    }
  }

  function renderInventorySummary(){
    const root=$("#inventory-table");if(!root)return;
    root.innerHTML='<table class="data-table"><thead><tr><th>Product</th><th>Size</th><th>Stock</th><th>State</th><th>Price</th></tr></thead><tbody>'+
      products.map(p=>{const stock=Number(p.stock||0);return '<tr><td><strong>'+esc(p.name)+'</strong></td><td>'+esc(p.size)+'</td><td><strong class="'+(stock<=5?"inventory-low":"")+'">'+stock+'</strong> packs</td><td><span class="badge '+(stock<=5?"low":"")+'">'+(stock<=5?"LOW STOCK":"IN STOCK")+'</span></td><td>'+money(p.price)+'</td></tr>'}).join("")+
      '</tbody></table>';
  }

  function renderOrders(){
    refreshData();
    const root=$("#orders-table"), count=$("#order-search-count"), input=$("#order-search");
    if(input && input.value!==orderSearch) input.value=orderSearch;
    const query=orderSearch.trim().toLowerCase();
    const sorted=orders.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const filtered=query?sorted.filter(o=>{
      const id=String(o.id||"").toLowerCase();
      const name=String(o.customer?.name||"").toLowerCase();
      return id.includes(query)||name.includes(query);
    }):sorted;
    if(count) count.textContent=query ? "Showing "+filtered.length+" of "+sorted.length+" orders" : sorted.length+" orders";
    if(!sorted.length){root.innerHTML='<div class="empty">No orders yet. Customer orders will appear here.</div>';return}
    if(!filtered.length){root.innerHTML='<div class="empty">No orders found for “'+esc(orderSearch)+'”.</div>';return}
    root.innerHTML='<table class="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>GCash Ref</th><th>Status</th><th>Update</th></tr></thead><tbody>'+
      filtered.map(o=>'<tr><td><strong>'+esc(o.id)+'</strong><br><span class="panel-note">'+new Date(o.createdAt||Date.now()).toLocaleString("en-PH",{dateStyle:"medium"})+'</span></td><td>'+esc(o.customer?.name||"Customer")+'<br><span class="panel-note">'+esc(o.customer?.address||"")+'</span></td><td>'+money(o.total)+'</td><td>'+esc(o.payment||"—")+'</td><td><strong class="gcash-ref '+(o.payment==="GCash"&&o.gcashRef?"":"missing")+'">'+(o.payment==="GCash"?(esc(o.gcashRef||"MISSING")):"—")+'</strong></td><td><span class="badge">'+esc(o.status||"Pending")+'</span></td><td><select class="status-select" data-order-status="'+esc(o.id)+'"><option>Pending</option><option>Verified Payment</option><option>Processing/Roasting</option><option>Ready to Ship</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select></td></tr>').join("")+'</tbody></table>';
    $$("[data-order-status]").forEach(s=>{const o=orders.find(x=>String(x.id)===String(s.dataset.orderStatus));if(o)s.value=o.status;s.addEventListener("change",()=>updateOrderStatus(s.dataset.orderStatus,s.value))});
  }
  function initOrderSearch(){
    const input=$("#order-search"), clear=$("#clear-order-search");
    if(!input||input.dataset.bound)return;
    input.dataset.bound="1";
    input.addEventListener("input",()=>{
      orderSearch=input.value;
      renderOrders();
      input.focus();
      input.setSelectionRange(input.value.length,input.value.length);
    });
    clear?.addEventListener("click",()=>{
      orderSearch="";
      input.value="";
      renderOrders();
      input.focus();
    });
  }

  function updateOrderStatus(id,status){const list=read(ORDERS_KEY,[]);const idx=list.findIndex(o=>String(o.id)===String(id));if(idx<0)return;list[idx]={...list[idx],status,statusUpdatedAt:new Date().toISOString()};write(ORDERS_KEY,list);toast("Order "+id+" → "+status);renderOverview();renderOrders()}

  function renderGallery(){
    const root=$("#gallery-table");
    const items=Array.from({length:6},(_,i)=>gallery[i]||{slot:i+1,title:"",image:"",alt:""});
    root.innerHTML='<div class="gallery-manager-grid">'+items.map((g,i)=>'<article class="gallery-manager-card"><div class="gallery-preview">'+(g.image?'<img src="'+esc(g.image)+'" alt="'+esc(g.alt||"")+'">':'<span>PHOTO '+String(i+1).padStart(2,"0")+'</span>')+'</div><label>Photo '+(i+1)+' title<input data-gallery-title="'+i+'" value="'+esc(g.title||"")+'" placeholder="e.g. Roasted Liberica"></label><label>Image URL<input data-gallery-image="'+i+'" value="'+esc(g.image||"")+'" placeholder="https://.../image.jpg"></label><label>Alt text<input data-gallery-alt="'+i+'" value="'+esc(g.alt||"")+'" placeholder="Describe the real photo"></label><button class="admin-button gold" type="button" data-gallery-save="'+i+'">Save Photo '+(i+1)+'</button></article>').join("")+'</div>';
    $$("[data-gallery-save]").forEach(btn=>btn.addEventListener("click",()=>saveGallery(Number(btn.dataset.gallerySave))));
  }
  function renderAds(){
    const linkInput=$("#ads-link"), imageInput=$("#ads-image"), labelInput=$("#ads-label"), preview=$("#ads-preview");
    if(!linkInput||!labelInput||!preview)return;
    const link=String(ads.link||"").trim();
    const image=String(ads.image||"").trim();
    const label=String(ads.label||"Sponsored").trim()||"Sponsored";
    linkInput.value=link;
    if(imageInput) imageInput.value=image;
    labelInput.value=ads.label||"";
    const title=$("#ads-preview-title"), copy=$("#ads-preview-copy"), open=$("#ads-preview-open"), previewImage=$("#ads-preview-image");
    if(title)title.textContent=(link||image)?label:"No ad configured";
    if(copy)copy.textContent=(link||image)?"Advertisement is configured and ready for the storefront.":"Add an advertisement link and image URL above, then save it.";
    if(previewImage){
      previewImage.hidden=!image;
      previewImage.src=image||"";
    }
    if(open){
      open.hidden=!link;
      open.href=link||"#";
    }
    preview.classList.toggle("has-link",Boolean(link));
  }

  function saveAds(){
    const link=$("#ads-link")?.value.trim()||"";
    const image=$("#ads-image")?.value.trim()||"";
    const label=$("#ads-label")?.value.trim()||"Sponsored";
    if(link && !/^https?:\/\//i.test(link)){
      toast("Use a valid http:// or https:// advertisement link.");
      return;
    }
    if(image && !/^https?:\/\//i.test(image)){
      toast("Use a valid http:// or https:// image URL.");
      return;
    }
    ads={link,image,label};
    write(ADS_KEY,ads);
    toast(link?"Advertisement link saved.":"Advertisement link cleared.");
    renderAds();
  }

  function clearAds(){
    ads={link:"",image:"",label:""};
    try{localStorage.removeItem(ADS_KEY)}catch{}
    toast("Advertisement link cleared.");
    renderAds();
  }

  function saveGallery(index){
    const image=document.querySelector('[data-gallery-image="'+index+'"]')?.value.trim()||"";
    const title=document.querySelector('[data-gallery-title="'+index+'"]')?.value.trim()||"";
    const alt=document.querySelector('[data-gallery-alt="'+index+'"]')?.value.trim()||title;
    if(image && !/^https?:\/\//i.test(image) && !/^images\//i.test(image)){toast("Use an image URL or images/ path.");return}
    gallery[index]={slot:index+1,title,image,alt};
    write(GALLERY_KEY,gallery);
    toast("Gallery photo "+(index+1)+" saved.");
    renderGallery();
  }

  function renderProducts(){
    refreshData();
    const root=$("#products-table");
    if(!products.length){
      root.innerHTML='<div class="empty">No products found.</div>';
      return;
    }

    root.innerHTML='<div class="product-manager-head">'+
      '<div><strong>Product Catalog</strong><span>Edit price and stock directly, then save.</span></div>'+
      '<button id="save-all-products" class="admin-button gold" type="button">Save All Changes</button>'+
      '</div>'+
      '<div class="product-manager-grid">'+
      products.map(p=>{
        const stock=Number(p.stock||0);
        return '<article class="product-manager-card" data-product-card="'+esc(p.id)+'">'+
          '<div class="product-manager-top">'+
            '<div><span class="eyebrow">'+esc(p.size||"PRODUCT")+'</span><h3>'+esc(p.name)+'</h3><span class="product-manager-id">'+esc(p.id)+'</span></div>'+
            '<span class="badge '+(stock<=5?"low":"")+'">'+(stock<=5?"LOW STOCK":"IN STOCK")+'</span>'+
          '</div>'+
          '<div class="product-manager-fields">'+
            '<label>Price (₱)<input type="number" min="0" step="1" value="'+Number(p.price||0)+'" data-product-price="'+esc(p.id)+'"></label>'+
            '<label>Stock (packs)<input type="number" min="0" step="1" value="'+stock+'" data-product-stock="'+esc(p.id)+'"></label>'+
          '</div>'+
          '<div class="product-manager-meta">'+
            '<span>Size: <b>'+esc(p.size||"—")+'</b></span>'+
            '<span>Badge: <b>'+esc(p.badge||"—")+'</b></span>'+
          '</div>'+
          '<div class="product-card-actions"><button class="admin-button outline product-save-button" type="button" data-product-save="'+esc(p.id)+'">Save '+esc(p.size||"Product")+'</button><button class="admin-button danger product-delete-button" type="button" data-product-delete="'+esc(p.id)+'">Delete</button></div>'+
        '</article>';
      }).join("")+
      '</div>';

    $$("[data-product-save]").forEach(btn=>btn.addEventListener("click",()=>saveProduct(btn.dataset.productSave)));
    $$("[data-product-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteProduct(btn.dataset.productDelete)));
    $("#save-all-products")?.addEventListener("click",saveAllProducts);
  }

  function collectProduct(id){
    const product=products.find(p=>String(p.id)===String(id));
    if(!product)return null;
    const priceInput=document.querySelector('[data-product-price="'+CSS.escape(String(id))+'"]');
    const stockInput=document.querySelector('[data-product-stock="'+CSS.escape(String(id))+'"]');
    if(!priceInput||!stockInput)return null;

    const price=Number(priceInput.value);
    const stock=Number(stockInput.value);

    if(!Number.isFinite(price)||price<0){
      toast("Invalid price for "+product.size+".");
      priceInput.focus();
      return null;
    }
    if(!Number.isFinite(stock)||stock<0||!Number.isInteger(stock)){
      toast("Stock must be a whole number for "+product.size+".");
      stockInput.focus();
      return null;
    }

    return {...product,price,stock};
  }

  function saveProduct(id){
    const updated=collectProduct(id);
    if(!updated)return;

    products=products.map(p=>String(p.id)===String(id)?updated:p);
    write(PRODUCTS_KEY,products);
    notifyCatalogChanged();
    toast(updated.size+" updated: "+money(updated.price)+" · "+updated.stock+" packs");
    renderProducts();
    renderOverview();
  }

  function deleteProduct(id){
    const product=products.find(p=>String(p.id)===String(id));
    if(!product)return;
    if(!confirm("Delete "+product.name+" from the catalog?"))return;
    products=products.filter(p=>String(p.id)!==String(id));
    write(PRODUCTS_KEY,products);
    notifyCatalogChanged();
    localStorage.setItem("kb_catalog_real_initialized","1");
    toast(product.name+" deleted.");
    renderProducts();
    renderOverview();
  }

  function saveAllProducts(){
    const updated=[];
    for(const product of products){
      const next=collectProduct(product.id);
      if(!next)return;
      updated.push(next);
    }
    products=updated;
    write(PRODUCTS_KEY,products);
    notifyCatalogChanged();
    toast("All product prices and stock saved.");
    renderProducts();
    renderOverview();
  }

  function renderCustomers(){
    const root=$("#customers-table"),list=customers();if(!list.length){root.innerHTML='<div class="empty">Customers are created automatically from orders.</div>';return}
    root.innerHTML='<table class="data-table"><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Orders</th><th>Spend</th></tr></thead><tbody>'+list.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong></td><td>'+esc(c.phone||"—")+'<br>'+esc(c.email||"")+'</td><td>'+esc(c.address||"—")+'</td><td>'+c.orders+'</td><td>'+money(c.revenue)+'</td></tr>').join("")+'</tbody></table>';
  }

  function renderPromos(){
    const root=$("#promos-table");refreshData();if(!promos.length){root.innerHTML='<div class="empty">No promo codes yet.</div>';return}
    root.innerHTML='<table class="data-table"><thead><tr><th>Name</th><th>Code</th><th>Rule</th><th>Status</th></tr></thead><tbody>'+promos.map(p=>'<tr><td>'+esc(p.name)+'</td><td><strong>'+esc(p.code)+'</strong></td><td>'+esc(p.type==="percent"?Number(p.value||0)+"% off":money(p.value)+" off")+' · min '+Number(p.minPacks||0)+' packs</td><td><span class="badge">'+(p.active!==false?"ACTIVE":"OFF")+'</span></td></tr>').join("")+'</tbody></table>';
  }

  function renderContact(){
    const s={
      businessName:"",email:"",phone:"",location:"",facebook:"",messenger:"",hours:"",
      ...(read(SETTINGS_KEY,{})||{})
    };
    $("#contact-business-name").value=s.businessName||"";
    $("#contact-manager-email").value=s.email||"";
    $("#contact-manager-phone").value=s.phone||"";
    $("#contact-manager-location").value=s.location||"";
    $("#contact-manager-facebook").value=s.facebook||"";
    $("#contact-manager-messenger").value=s.messenger||"";
    $("#contact-manager-hours").value=s.hours||"";
  }

  function saveContact(){
    const existing=read(SETTINGS_KEY,{})||{};
    const settings={
      ...existing,
      businessName:$("#contact-business-name").value.trim(),
      email:$("#contact-manager-email").value.trim(),
      phone:$("#contact-manager-phone").value.trim(),
      location:$("#contact-manager-location").value.trim(),
      facebook:$("#contact-manager-facebook").value.trim(),
      messenger:$("#contact-manager-messenger").value.trim(),
      hours:$("#contact-manager-hours").value.trim()
    };
    write(SETTINGS_KEY,settings);
    toast("Contact details saved. Main site updated.");
  }

  function renderContent(){
    const s={email:"ILAG",phone:"ILAG",location:"ILAG",facebook:"",...(read(SETTINGS_KEY,{})||{})},cms={announcement:{title:"Bagong ani na!",body:"Add the latest approved roast or harvest update."},...(read(CMS_KEY,{})||{})};
    $("#content-announcement").value=cms.announcement?.title||"Bagong ani na!";$("#content-body").value=cms.announcement?.body||"";$("#content-facebook").value=s.facebook||"";$("#content-email").value=s.email||"ILAG";$("#content-phone").value=s.phone||"ILAG";$("#content-location").value=s.location||"ILAG";
  }
  function saveContent(){
    const s={...(read(SETTINGS_KEY,{})||{}),facebook:$("#content-facebook").value.trim(),email:$("#content-email").value.trim(),phone:$("#content-phone").value.trim(),location:$("#content-location").value.trim()};
    const cms={...(read(CMS_KEY,{})||{}),announcement:{title:$("#content-announcement").value.trim(),body:$("#content-body").value.trim()}};
    write(SETTINGS_KEY,s);write(CMS_KEY,cms);toast("Content saved.");
  }
  function addProduct(e){
    e.preventDefault();
    const name=$("#product-name").value.trim();
    const size=$("#product-size").value.trim();
    const price=Number($("#product-price").value||0);
    const stock=Number($("#product-stock").value||0);
    const badge=$("#product-badge").value.trim()||"NEW";
    const roast=$("#product-roast").value;
    const grind=$("#product-grind").value;
    const note=$("#product-note").value.trim()||"Fresh Kapeng Barako.";
    if(!name||!size){toast("Product name and size are required.");return}
    if(!Number.isFinite(price)||price<0){toast("Enter a valid price.");return}
    if(!Number.isFinite(stock)||stock<0||!Number.isInteger(stock)){toast("Stock must be a whole number.");return}
    const idBase=("KB-"+size).toUpperCase().replace(/[^A-Z0-9]/g,"");
    let id=idBase||("KB-"+Date.now());
    if(products.some(p=>String(p.id)===id)) id=id+"-"+Date.now().toString(36).toUpperCase();
    const product={id,name,size,price,stock,badge,roast,grind,note};
    products.push(product);
    write(PRODUCTS_KEY,products);
    notifyCatalogChanged();
    localStorage.setItem("kb_catalog_real_initialized","1");
    $("#product-dialog").close();
    $("#product-form").reset();
    $("#product-stock").value="0";
    toast(name+" added.");
    renderProducts();
    renderOverview();
  }


  function addPromo(e){
    e.preventDefault();
    const payload={id:"P-"+Date.now(),name:$("#promo-name").value.trim(),code:$("#promo-code").value.trim().toUpperCase(),type:$("#promo-type").value,value:Number($("#promo-value").value||0),minPacks:Number($("#promo-min").value||0),active:$("#promo-active").checked};
    if(!payload.name||!payload.code){toast("Promo name and code are required.");return}
    promos.push(payload);write(PROMOS_KEY,promos);$("#promo-dialog").close();$("#promo-form").reset();toast(payload.code+" saved.");renderPromos();
  }

  function openView(view){
    $$(".admin-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $$("[data-view-panel]").forEach(p=>{p.hidden=p.dataset.viewPanel!==view;p.classList.toggle("active",p.dataset.viewPanel===view)});
    $("#view-title").textContent={overview:"Overview",orders:"Orders",inventory:"Inventory",products:"Products",customers:"Customers",promos:"Promos",content:"Content",contact:"Contact",gallery:"Gallery",ads:"Ads"}[view]||"Overview";
    closeMenu();
    if(view==="overview")renderOverview();if(view==="orders")renderOrders();if(view==="inventory")renderInventorySummary();if(view==="products")renderProducts();if(view==="customers")renderCustomers();if(view==="promos")renderPromos();if(view==="content")renderContent();if(view==="contact")renderContact();if(view==="gallery")renderGallery();if(view==="ads")renderAds();
  }
  function closeMenu(){document.body.classList.remove("menu-open");$("#admin-menu")?.classList.remove("is-open");$("#admin-sidebar")?.classList.remove("is-open");$("#admin-overlay")?.classList.remove("is-open");$("#admin-menu")?.setAttribute("aria-expanded","false");}
  function toggleMenu(){const open=!document.body.classList.contains("menu-open");document.body.classList.toggle("menu-open",open);$("#admin-menu").classList.toggle("is-open",open);$("#admin-sidebar").classList.toggle("is-open",open);$("#admin-overlay").classList.toggle("is-open",open);$("#admin-menu").setAttribute("aria-expanded",String(open))}
  function init(){
    if(window.KBAdminAuth&&!window.KBAdminAuth.guard())return;
    $("#admin-user").textContent=read("kb_admin_session",{})?.email||"admin";
    $("#admin-menu")?.addEventListener("click",toggleMenu);$("#admin-close")?.addEventListener("click",closeMenu);$("#admin-overlay")?.addEventListener("click",closeMenu);$("#logout")?.addEventListener("click",()=>window.KBAdminAuth?.logout());
    $(".admin-nav button").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
    initOrderSearch();
    const soundBtn=$("#enable-low-stock-sound");
    if(soundBtn){
      const syncSoundButton=()=>{soundBtn.textContent=lowStockSoundEnabled?"🔔 Alert Sound: ON":"🔔 Enable Alert Sound";soundBtn.classList.toggle("is-enabled",lowStockSoundEnabled);};
      soundBtn.addEventListener("click",async()=>{
        lowStockSoundEnabled=!lowStockSoundEnabled;
        localStorage.setItem("kb_low_stock_sound",lowStockSoundEnabled?"1":"0");
        if(lowStockSoundEnabled){
          try{const AudioCtx=window.AudioContext||window.webkitAudioContext; if(AudioCtx){window.__kbAlertAudioCtx=window.__kbAlertAudioCtx||new AudioCtx(); await window.__kbAlertAudioCtx.resume();}}catch{}
          playLowStockAlert();
        }
        syncSoundButton();
      });
      syncSoundButton();
    }
    $("#add-product")?.addEventListener("click",()=>$("#product-dialog").showModal());$("#save-ads")?.addEventListener("click",saveAds);$("#clear-ads")?.addEventListener("click",clearAds);$$("[data-product-dialog-close]").forEach(b=>b.addEventListener("click",()=>$("#product-dialog").close()));$("#product-form")?.addEventListener("submit",addProduct);$("#save-content")?.addEventListener("click",saveContent);$("#save-contact")?.addEventListener("click",saveContact);$("#add-promo")?.addEventListener("click",()=>$("#promo-dialog").showModal());$$("[data-dialog-close]").forEach(b=>b.addEventListener("click",()=>$("#promo-dialog").close()));$("#promo-form")?.addEventListener("submit",addPromo);
    renderOverview();renderOrders();renderInventorySummary();renderProducts();renderCustomers();renderPromos();renderContent();renderContact();renderGallery();renderAds();
    syncMainPageData().then(()=>{refreshData();renderOverview();renderOrders();renderInventorySummary();renderProducts();renderCustomers();renderPromos();renderContent();renderGallery();renderAds();});
    window.addEventListener("storage",e=>{if([PRODUCTS_KEY,ORDERS_KEY,PROMOS_KEY,SETTINGS_KEY,CMS_KEY,GALLERY_KEY,ADS_KEY].includes(e.key)){renderOverview();renderOrders();renderInventorySummary();renderProducts();renderCustomers();renderPromos();renderGallery();renderAds()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();