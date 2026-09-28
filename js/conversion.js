(function(){
  "use strict";

  const $=(s)=>document.querySelector(s);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const money=(n)=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:0,maximumFractionDigits:0});

  const blogs=[
    {tag:"BREWING",title:"Paano mag cold brew ng Barako",text:"A simple guide to building a smooth, concentrated cup at home.",time:"4 min read"},
    {tag:"BREWING",title:"Traditional Barako: simple at strong",text:"A practical starting point for a familiar Batangas-style coffee ritual.",time:"3 min read"},
    {tag:"COFFEE 101",title:"Whole bean o ground coffee?",text:"Choose your grind based on how you brew and how quickly you use your coffee.",time:"3 min read"}
  ];

  let seconds=180;
  let timer=null;

  function products(){
    try{
      const raw=localStorage.getItem("kb_products");
      const data=raw?JSON.parse(raw):[];
      return Array.isArray(data)&&data.length?data:[];
    }catch{return[]}
  }

  function renderBlog(){
    const root=$("#kb-blog-grid");
    if(!root)return;
    root.innerHTML=blogs.map((b,i)=>
      '<article class="kb-blog-card">'+
        '<span>'+esc(b.tag)+'</span>'+
        '<div class="kb-blog-index">0'+(i+1)+'</div>'+
        '<h3>'+esc(b.title)+'</h3>'+
        '<p>'+esc(b.text)+'</p>'+
        '<small>'+esc(b.time)+' · Read guide →</small>'+
      '</article>'
    ).join("");
  }

  function renderSubscription(){
    const select=$("#kb-sub-product"), weight=$("#kb-sub-weight");
    if(!select||!weight)return;
    const ps=products();
    select.innerHTML=ps.length?ps.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join(""):'<option value="">Select coffee</option>';
    const update=()=>{
      const p=ps.find(x=>String(x.id)===String(select.value));
      const variants=p?.variants||[];
      weight.innerHTML=variants.length?variants.map(v=>'<option value="'+esc(v.weight)+'">'+esc(v.weight)+'</option>').join(""):'<option value="">Choose weight</option>';
    };
    select.addEventListener("change",update);
    update();
  }

  function setupWholesale(){
    const toggle=$("#kb-wholesale-toggle"), panel=$("#kb-wholesale-panel");
    if(!toggle||!panel)return;
    toggle.addEventListener("change",()=>{panel.hidden=!toggle.checked;});
    $("#kb-wholesale-request")?.addEventListener("click",()=>{
      const kg=Math.max(10,Number($("#kb-wholesale-kg")?.value||10));
      localStorage.setItem("kb_wholesale_request",JSON.stringify({
        kg,roast:$("#kb-wholesale-roast")?.value||"",createdAt:new Date().toISOString()
      }));
      alert("Wholesale request saved for "+kg+"kg+. Connect this form to your business inbox/backend when ready.");
    });
  }

  function setupSubscription(){
    $("#kb-sub-save")?.addEventListener("click",()=>{
      const productId=$("#kb-sub-product")?.value||"";
      const p=products().find(x=>String(x.id)===String(productId));
      if(!p){alert("Add products in Admin first.");return;}
      const preference={
        productId,
        product:p.name,
        weight:$("#kb-sub-weight")?.value||"",
        day:Math.min(28,Math.max(1,Number($("#kb-sub-day")?.value||15))),
        createdAt:new Date().toISOString(),
        status:"Saved preference"
      };
      localStorage.setItem("kb_subscription_preference",JSON.stringify(preference));
      alert("Saved: Padalhan ka tuwing ika-"+preference.day+" ng "+preference.weight+" "+preference.product+".");
    });
  }

  function displayTimer(){
    const el=$("#kb-timer-display");
    if(!el)return;
    const m=Math.floor(seconds/60).toString().padStart(2,"0");
    const s=(seconds%60).toString().padStart(2,"0");
    el.textContent=m+":"+s;
  }

  function setupTimer(){
    displayTimer();
    $("#kb-timer-start")?.addEventListener("click",()=>{
      if(timer)return;
      if(seconds<=0)seconds=180;
      timer=setInterval(()=>{
        seconds--;
        displayTimer();
        if(seconds<=0){
          clearInterval(timer);timer=null;
          if(navigator.vibrate)navigator.vibrate([120,70,120]);
        }
      },1000);
    });
    $("#kb-timer-pause")?.addEventListener("click",()=>{
      clearInterval(timer);timer=null;
    });
    $("#kb-timer-reset")?.addEventListener("click",()=>{
      clearInterval(timer);timer=null;seconds=180;displayTimer();
    });
  }

  function setupTrack(){
    $("#kb-open-track")?.addEventListener("click",()=>{
      const btn=$("#open-track");
      if(btn){btn.click();return;}
      const layer=$("#track-layer");
      if(layer){layer.hidden=false;$("#track-order-id")?.focus();}
    });
  }

  function init(){
    renderBlog();
    renderSubscription();
    setupWholesale();
    setupSubscription();
    setupTimer();
    setupTrack();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
