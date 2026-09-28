(() => {
  "use strict";
  const PRODUCTS_KEY="kb_rebuild_products", ORDERS_KEY="kb_orders", PROMOS_KEY="kb_promos", SETTINGS_KEY="kb_settings", CMS_KEY="kb_cms";
  const DEFAULT_PRODUCTS=[
    {id:"KB250",name:"Barako 250g",size:"250g",price:350,stock:7,badge:"BEST SELLER",roast:"Dark",grind:"Medium",note:"Bold, aromatic, unmistakably Barako."},
    {id:"KB500",name:"Barako 500g",size:"500g",price:620,stock:7,badge:"FRESH ROAST",roast:"Medium",grind:"Whole",note:"A deeper everyday supply for the serious cup."},
    {id:"KB1K",name:"Barako 1kg",size:"1kg",price:1150,stock:7,badge:"VALUE",roast:"Dark",grind:"Coarse",note:"The full ritual, ready for the week."}
  ];
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const money=n=>"₱"+Number(n||0).toLocaleString("en-PH");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let products=read(PRODUCTS_KEY,null);if(!Array.isArray(products)||!products.length){products=DEFAULT_PRODUCTS.map(x=>({...x}));write(PRODUCTS_KEY,products)}
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

  function renderOverview(){
    refreshData();
    const low=lowProducts(), cs=customers();
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
    refreshData();const root=$("#orders-table");if(!orders.length){root.innerHTML='<div class="empty">No orders yet. Customer orders will appear here.</div>';return}
    root.innerHTML='<table class="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead><tbody>'+
      orders.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o=>'<tr><td><strong>'+esc(o.id)+'</strong><br><span class="panel-note">'+new Date(o.createdAt||Date.now()).toLocaleString("en-PH",{dateStyle:"medium"})+'</span></td><td>'+esc(o.customer?.name||"Customer")+'<br><span class="panel-note">'+esc(o.customer?.address||"")+'</span></td><td>'+money(o.total)+'</td><td>'+esc(o.payment||"—")+'</td><td><span class="badge">'+esc(o.status||"Pending")+'</span></td><td><select class="status-select" data-order-status="'+esc(o.id)+'"><option>Pending</option><option>Verified Payment</option><option>Processing/Roasting</option><option>Ready to Ship</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select></td></tr>').join("")+'</tbody></table>';
    $$("[data-order-status]").forEach(s=>{const o=orders.find(x=>String(x.id)===String(s.dataset.orderStatus));if(o)s.value=o.status;s.addEventListener("change",()=>updateOrderStatus(s.dataset.orderStatus,s.value))});
  }
  function updateOrderStatus(id,status){const list=read(ORDERS_KEY,[]);const idx=list.findIndex(o=>String(o.id)===String(id));if(idx<0)return;list[idx]={...list[idx],status,statusUpdatedAt:new Date().toISOString()};write(ORDERS_KEY,list);toast("Order "+id+" → "+status);renderOverview();renderOrders()}

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
          '<button class="admin-button outline product-save-button" type="button" data-product-save="'+esc(p.id)+'">Save '+esc(p.size||"Product")+'</button>'+
        '</article>';
      }).join("")+
      '</div>';

    $$("[data-product-save]").forEach(btn=>btn.addEventListener("click",()=>saveProduct(btn.dataset.productSave)));
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
    toast(updated.size+" updated: "+money(updated.price)+" · "+updated.stock+" packs");
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

  function renderContent(){
    const s={email:"ILAG",phone:"ILAG",location:"ILAG",facebook:"",...(read(SETTINGS_KEY,{})||{})},cms={announcement:{title:"Bagong ani na!",body:"Add the latest approved roast or harvest update."},...(read(CMS_KEY,{})||{})};
    $("#content-announcement").value=cms.announcement?.title||"Bagong ani na!";$("#content-body").value=cms.announcement?.body||"";$("#content-facebook").value=s.facebook||"";$("#content-email").value=s.email||"ILAG";$("#content-phone").value=s.phone||"ILAG";$("#content-location").value=s.location||"ILAG";
  }
  function saveContent(){
    const s={...(read(SETTINGS_KEY,{})||{}),facebook:$("#content-facebook").value.trim(),email:$("#content-email").value.trim(),phone:$("#content-phone").value.trim(),location:$("#content-location").value.trim()};
    const cms={...(read(CMS_KEY,{})||{}),announcement:{title:$("#content-announcement").value.trim(),body:$("#content-body").value.trim()}};
    write(SETTINGS_KEY,s);write(CMS_KEY,cms);toast("Content saved.");
  }
  function seedProducts(){write(PRODUCTS_KEY,DEFAULT_PRODUCTS.map(x=>({...x})));toast("Collection reset to 3 products.");renderOverview();renderProducts()}
  function addPromo(e){
    e.preventDefault();
    const payload={id:"P-"+Date.now(),name:$("#promo-name").value.trim(),code:$("#promo-code").value.trim().toUpperCase(),type:$("#promo-type").value,value:Number($("#promo-value").value||0),minPacks:Number($("#promo-min").value||0),active:$("#promo-active").checked};
    if(!payload.name||!payload.code){toast("Promo name and code are required.");return}
    promos.push(payload);write(PROMOS_KEY,promos);$("#promo-dialog").close();$("#promo-form").reset();toast(payload.code+" saved.");renderPromos();
  }

  function openView(view){
    $$(".admin-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $$("[data-view-panel]").forEach(p=>{p.hidden=p.dataset.viewPanel!==view;p.classList.toggle("active",p.dataset.viewPanel===view)});
    $("#view-title").textContent={overview:"Overview",orders:"Orders",inventory:"Inventory",products:"Products",customers:"Customers",promos:"Promos",content:"Content"}[view]||"Overview";
    closeMenu();
    if(view==="overview")renderOverview();if(view==="orders")renderOrders();if(view==="inventory")renderInventorySummary();if(view==="products")renderProducts();if(view==="customers")renderCustomers();if(view==="promos")renderPromos();if(view==="content")renderContent();
  }
  function closeMenu(){document.body.classList.remove("menu-open");$("#admin-menu")?.classList.remove("is-open");$("#admin-sidebar")?.classList.remove("is-open");$("#admin-overlay")?.classList.remove("is-open");$("#admin-menu")?.setAttribute("aria-expanded","false");}
  function toggleMenu(){const open=!document.body.classList.contains("menu-open");document.body.classList.toggle("menu-open",open);$("#admin-menu").classList.toggle("is-open",open);$("#admin-sidebar").classList.toggle("is-open",open);$("#admin-overlay").classList.toggle("is-open",open);$("#admin-menu").setAttribute("aria-expanded",String(open))}
  function init(){
    if(window.KBAdminAuth&&!window.KBAdminAuth.guard())return;
    $("#admin-user").textContent=read("kb_admin_session",{})?.email||"admin";
    $("#admin-menu")?.addEventListener("click",toggleMenu);$("#admin-close")?.addEventListener("click",closeMenu);$("#admin-overlay")?.addEventListener("click",closeMenu);$("#logout")?.addEventListener("click",()=>window.KBAdminAuth?.logout());
    $$(".admin-nav button").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
    $("#seed-products")?.addEventListener("click",seedProducts);$("#save-content")?.addEventListener("click",saveContent);$("#add-promo")?.addEventListener("click",()=>$("#promo-dialog").showModal());$$("[data-dialog-close]").forEach(b=>b.addEventListener("click",()=>$("#promo-dialog").close()));$("#promo-form")?.addEventListener("submit",addPromo);
    renderOverview();renderOrders();renderInventorySummary();renderProducts();renderCustomers();renderPromos();renderContent();
    window.addEventListener("storage",e=>{if([PRODUCTS_KEY,ORDERS_KEY,PROMOS_KEY,SETTINGS_KEY,CMS_KEY].includes(e.key)){renderOverview();renderOrders();renderInventorySummary();renderProducts();renderCustomers();renderPromos()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();