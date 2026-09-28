import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let auth=null,db=null,user=null;
const saved=new Set();
let attachQueued=false;

if(isFirebaseConfigured){
  Promise.all([
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
  ]).then(async ([appMod,authMod,fsMod])=>{
    const {initializeApp}=appMod;
    const {getAuth,onAuthStateChanged}=authMod;
    const {getFirestore,doc,setDoc,deleteDoc,collection,getDocs,serverTimestamp}=fsMod;
    const app=initializeApp(firebaseConfig);
    auth=getAuth(app);
    db=getFirestore(app);
    onAuthStateChanged(auth,async u=>{
      user=u||null;
      saved.clear();
      if(user){
        try{
          const snap=await getDocs(collection(db,"users",user.uid,"wishlist"));
          snap.forEach(d=>saved.add(d.id));
        }catch{}
      }
      scheduleAttach();
    });
    window.__kbWishlistFns={doc,setDoc,deleteDoc,serverTimestamp};
  }).catch(()=>scheduleAttach());
}

function cardKey(card){
  const id=card.dataset.productId;
  const weight=card.querySelector(".variant-btn.active")?.dataset.weight||"";
  return id+"_"+weight.replace(/[^a-z0-9]/gi,"-").toLowerCase();
}

function attach(){
  document.querySelectorAll(".product-card[data-product-id]").forEach(card=>{
    let b=card.querySelector(".wishlist-heart");
    if(!b){
      b=document.createElement("button");
      b.type="button";
      b.className="wishlist-heart";
      b.setAttribute("aria-label","Save to wishlist");
      b.innerHTML="♡";
      card.querySelector(".product-art")?.appendChild(b);
      b.addEventListener("click",e=>{
        e.preventDefault();
        e.stopPropagation();
        toggle(card,b);
      });
    }
    const key=cardKey(card);
    const active=saved.has(key);
    b.classList.toggle("saved",active);
    b.innerHTML=active?"♥":"♡";
    b.title=active?"Remove from wishlist":"Save to wishlist";
  });
}

function scheduleAttach(){
  if(attachQueued)return;
  attachQueued=true;
  requestAnimationFrame(()=>{
    attachQueued=false;
    attach();
  });
}

function observeProductGrid(){
  const grid=document.querySelector("#product-grid");
  if(!grid){
    document.addEventListener("DOMContentLoaded",observeProductGrid,{once:true});
    return;
  }

  const observer=new MutationObserver(scheduleAttach);
  observer.observe(grid,{childList:true});
  scheduleAttach();
}

async function toggle(card,button){
  if(!isFirebaseConfigured||!auth||!user){
    alert("Please log in to My Account first so your wishlist can be saved securely.");
    return;
  }

  const key=cardKey(card);
  const id=card.dataset.productId;
  const name=card.querySelector(".product-title-row h3")?.textContent?.trim()||"Kapeng Barako";
  const weight=card.querySelector(".variant-btn.active")?.dataset.weight||"";
  const grind=card.querySelector(".product-select")?.value||"";

  try{
    button.disabled=true;
    if(saved.has(key)){
      const f=window.__kbWishlistFns; if(!f) throw new Error("Wishlist backend unavailable");
      await f.deleteDoc(f.doc(db,"users",user.uid,"wishlist",key));
      saved.delete(key);
    }else{
      const f=window.__kbWishlistFns; if(!f) throw new Error("Wishlist backend unavailable");
      await f.setDoc(
        f.doc(db,"users",user.uid,"wishlist",key),
        {productId:id,name,weight,grind,createdAt:f.serverTimestamp()},
        {merge:true}
      );
      saved.add(key);
    }
    attach();
  }catch{
    alert("Could not update your wishlist. Please try again.");
  }finally{
    button.disabled=false;
  }
}

observeProductGrid();
window.addEventListener("load",scheduleAttach,{once:true});
