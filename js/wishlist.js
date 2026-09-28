import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let auth=null,db=null,user=null;
const saved=new Set();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

if(isFirebaseConfigured){
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  onAuthStateChanged(auth,async u=>{
    user=u||null;saved.clear();
    if(user){
      try{
        const snap=await getDocs(collection(db,"users",user.uid,"wishlist"));
        snap.forEach(d=>saved.add(d.id));
      }catch{}
    }
    attach();
  });
}

function cardKey(card){
  const id=card.dataset.productId;
  const weight=card.querySelector(".variant-btn.active")?.dataset.weight||"";
  return id+"_"+weight.replace(/[^a-z0-9]/gi,"-").toLowerCase();
}

function attach(){
  document.querySelectorAll(".product-card[data-product-id]").forEach(card=>{
    if(!card.querySelector(".wishlist-heart")){
      const b=document.createElement("button");
      b.type="button";b.className="wishlist-heart";b.setAttribute("aria-label","Save to wishlist");
      b.innerHTML="♡";
      card.querySelector(".product-art")?.appendChild(b);
      b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();toggle(card,b)});
    }
    const key=cardKey(card),b=card.querySelector(".wishlist-heart");
    const active=saved.has(key);
    b.classList.toggle("saved",active);b.innerHTML=active?"♥":"♡";b.title=active?"Remove from wishlist":"Save to wishlist";
  });
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
    if(saved.has(key)){
      await deleteDoc(doc(db,"users",user.uid,"wishlist",key));saved.delete(key);
    }else{
      await setDoc(doc(db,"users",user.uid,"wishlist",key),{productId:id,name,weight,grind,createdAt:serverTimestamp()},{merge:true});
      saved.add(key);
    }
    attach();
  }catch(e){alert("Could not update your wishlist. Please try again.")}
}

const observer=new MutationObserver(()=>attach());
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener("load",attach);
