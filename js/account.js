import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, sendEmailVerification,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  updateProfile, reload, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  query, where, orderBy, getDocs, onSnapshot, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const appRoot=document.querySelector("#app");
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{maximumFractionDigits:2});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={user:null,profile:null,orders:[],addresses:[],wishlist:[],tab:"overview",mode:"login",loading:false,demoActive:false};
const DEMO_KEY="kb_demo_customer_v1";
const ORDER_KEY="kb_orders";
let ordersUnsubscribe=null;

function demoDefaults(){
  return {
    profile:{fullName:"Alex Morgan",email:"demo@kapengbarako.com",phone:"+63 917 555 0148",provider:"demo",photoURL:""},
    orders:[{id:"KB-DEMO-001",status:"In Transit",total:1120,createdAt:"2026-09-26T09:20:00+08:00",items:[
      {name:"Barako 500g",weight:"500g",qty:1,price:620},
      {name:"Barako 250g",weight:"250g",qty:1,price:350}
    ]}],
    addresses:[{id:"demo-home",label:"Home",recipient:"Alex Morgan",phone:"+63 917 555 0148",address:"Demo Address, Quezon City, Metro Manila, Philippines",isDefault:true}],
    wishlist:[{id:"demo-wish-1",name:"Barako 1kg",weight:"1kg",grind:"Whole"}]
  };
}
function getDemoData(){
  try{
    const saved=JSON.parse(localStorage.getItem(DEMO_KEY)||"null");
    return saved&&saved.profile?saved:demoDefaults();
  }catch{return demoDefaults()}
}
function saveDemoData(){localStorage.setItem(DEMO_KEY,JSON.stringify({profile:state.profile,orders:state.orders,addresses:state.addresses,wishlist:state.wishlist}))}
function isDemoAccount(){return Boolean(state.user?.isDemo)}
function startDemoAccount(){
  const data=getDemoData();
  state.demoActive=true;
  state.user={uid:"demo_customer",displayName:data.profile?.fullName||"Alex Morgan",email:data.profile?.email||"demo@kapengbarako.com",phoneNumber:data.profile?.phone||"+63 917 555 0148",photoURL:data.profile?.photoURL||"",emailVerified:true,isDemo:true,providerData:[{providerId:"demo"}],metadata:{creationTime:"2026-09-01T08:00:00+08:00"}};
  state.profile=data.profile||{};state.orders=data.orders||[];state.addresses=normalizeAddresses(data.addresses||[]);saveCheckoutDefault(defaultAddress());state.wishlist=data.wishlist||[];state.tab="overview";
  renderDashboard();
}
function deleteDemoAccount(){
  if(!isDemoAccount())return;
  if(!confirm("Remove the demo customer account and all demo data from this browser?"))return;
  localStorage.removeItem(DEMO_KEY);state.user=null;state.profile=null;state.orders=[];state.addresses=[];state.wishlist=[];state.demoActive=false;state.mode="login";renderAuth();
}

function normalizeAddresses(list){
  const addresses=Array.isArray(list)?list.map(a=>({...a,isDefault:Boolean(a.isDefault)})):[];
  if(addresses.length&&!addresses.some(a=>a.isDefault))addresses[0].isDefault=true;
  const first=addresses.findIndex(a=>a.isDefault);
  return addresses.map((a,i)=>({...a,isDefault:i===first}));
}
function defaultAddress(){
  return normalizeAddresses(state.addresses).find(a=>a.isDefault)||null;
}
function saveCheckoutDefault(a){
  if(!a)return;
  try{
    localStorage.setItem("kb_checkout_default",JSON.stringify({
      recipient:a.recipient||state.profile?.fullName||"",
      phone:a.phone||state.profile?.phone||"",
      address:a.address||"",
      label:a.label||"Home"
    }));
  }catch{}
}
function setDefaultAddress(id){
  const addresses=normalizeAddresses(state.addresses).map(a=>({...a,isDefault:String(a.id)===String(id)}));
  state.addresses=addresses;
  const selected=addresses.find(a=>a.isDefault);
  saveCheckoutDefault(selected);
  return selected;
}

function getProfileName(){
  return String(state.profile?.fullName||state.user?.displayName||state.user?.email||"Coffee lover").trim();
}
function getInitials(name){
  const parts=String(name||"Customer").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(x=>x[0]).join("")||"C").toUpperCase();
}
function avatarMarkup(name,photoURL="",className="profile-avatar"){
  const safeName=esc(name||"Customer");
  return photoURL
    ? `<span class="${className} has-photo"><img src="${esc(photoURL)}" alt="${safeName}"></span>`
    : `<span class="${className}" aria-hidden="true">${esc(getInitials(name))}</span>`;
}


function shell(){return `
<div class="account-shell">
<header class="account-topbar"><div class="account-nav">
<a class="account-brand" href="../index.html"><img src="../images/favicon.svg" alt=""><span>Kapeng Barako<small>Customer Account</small></span></a>
<div class="account-nav-actions">
<button class="account-profile-chip" id="top-profile" type="button" aria-label="Open my profile">${avatarMarkup(getProfileName(),state.user?.photoURL||"", "profile-avatar small")}<span><strong>${esc(getProfileName())}</strong><small>My Profile</small></span></button>
<a class="account-btn" href="../index.html#products">Shop Coffee</a>
<button class="account-btn danger" id="logout-btn" type="button">Logout</button>
</div>
</div></header>
<main class="account-main" id="account-main"></main>
</div>`}

function authScreen(){return `
<div class="auth-screen"><div class="auth-wrap">
<section class="auth-visual"><div><div class="account-eyebrow">KAPENG BARAKO · CUSTOMER PORTAL</div><h1>Your next cup, made easier.</h1><p>Save your delivery details, follow your orders, and keep your favorite Barako packs ready for your next checkout.</p></div>
<div class="auth-points"><div class="auth-point">✓ Order history & delivery status</div><div class="auth-point">✓ Saved delivery addresses</div><div class="auth-point">✓ Wishlist & favorites</div><div class="auth-point">✓ Google sign-in + password recovery</div></div></section>
<section class="auth-card" id="auth-card"></section>
</div></div>`}

function renderAuth(){
  appRoot.innerHTML=authScreen();
  const card=document.querySelector("#auth-card");
  if(!isFirebaseConfigured){
    card.innerHTML =
      '<div class="setup-state">' +
        '<div class="setup-icon" aria-hidden="true">FB</div>' +
        '<span class="account-eyebrow">CUSTOMER ACCOUNTS</span>' +
        '<h2>Firebase is not configured.</h2>' +
        '<p class="setup-lead">Add your Firebase Web App configuration to enable customer accounts.</p>' +
        '<div class="setup-note">' +
          '<strong>Template setup required</strong>' +
          '<p>This template intentionally ships without a seller-owned Firebase project.</p>' +
          '<p>Open <code>js/firebase-config.js</code> and replace the <code>REPLACE_WITH_...</code> values using your own Firebase project.</p>' +
        '</div>' +
        '<div class="setup-steps">' +
          '<div><span>01</span><strong>Create your own Firebase project</strong></div>' +
          '<div><span>02</span><strong>Add a Firebase Web App</strong></div>' +
          '<div><span>03</span><strong>Configure Auth + Firestore + Functions</strong></div>' +
          '<div><span>04</span><strong>Follow <code>docs/FIREBASE_SETUP.md</code></strong></div>' +
        '</div>' +
        '<div class="setup-actions">' +
          '<button class="account-btn gold" id="demo-btn" type="button">OPEN TEST ACCOUNT</button>' +
          '<a class="account-btn" href="../index.html">Back to Storefront</a>' +
        '</div>' +
        '<p class="setup-footnote">Live Login, Signup, Google Sign-in, Forgot Password and order history will activate after Firebase is configured.</p>' +
      '</div>';
    document.querySelector("#demo-btn").onclick=startDemoAccount;
    return;
  }
  const login=state.mode==="login";
  card.innerHTML=`
<h2>${login?"Welcome back":"Create your account"}</h2>
<p class="sub">${login?"Sign in to manage your Kapeng Barako orders.":"Use your real contact details for delivery and account recovery."}</p>
<div id="auth-msg"></div>
<button class="google-btn" id="google-btn" type="button"><span class="google-mark">G</span> Continue with Google</button>
<div class="demo-box"><div><strong>TEST / DEMO ACCOUNT</strong><span>For testing My Orders and Track My Order. This data is local test data only.</span></div><button class="account-btn gold demo-btn" id="demo-btn" type="button">OPEN TEST ACCOUNT</button></div>
<div class="divider">Continue with your real account</div>
<form class="auth-form" id="auth-form">
${login?"":`<div class="field"><label>Full Name</label><input name="name" autocomplete="name" required></div>
<div class="field"><label>Phone Number</label><input name="phone" type="tel" autocomplete="tel" required></div>`}
<div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
<div class="field"><label>Password</label><input name="password" type="password" autocomplete="${login?"current-password":"new-password"}" minlength="8" required></div>
${login?"":`<div class="field"><label>Confirm Password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div>
<label class="check-row"><input type="checkbox" name="terms" required><span>I agree to the Kapeng Barako terms and conditions and privacy notice.</span></label>
<div class="notice">Email verification is required before private account data is unlocked.</div>`}
<button class="account-btn primary" type="submit" id="auth-submit">${login?"Login":"Create Account"}</button>
</form>
${login?'<button class="account-btn" id="forgot-btn" type="button" style="width:100%;margin-top:10px">Forgot password?</button>':""}
<div class="auth-switch">${login?"Don't have an account yet?":"Already have an account?"} <button id="switch-auth" type="button">${login?"Sign Up":"Log In"}</button></div>`;
  document.querySelector("#google-btn").onclick=googleLogin;
  document.querySelector("#demo-btn").onclick=startDemoAccount;
  document.querySelector("#auth-form").onsubmit=login?loginWithEmail:signup;
  document.querySelector("#switch-auth").onclick=()=>{state.mode=login?"signup":"login";renderAuth()};
  document.querySelector("#forgot-btn")?.addEventListener("click",forgotPassword);
}

function msg(text,type=""){const el=document.querySelector("#auth-msg");if(el)el.innerHTML=text?`<div class="notice ${type}">${esc(text)}</div>`:""}

function friendlyError(e){
  const code=e?.code||"";
  const map={
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/user-not-found":"Email or password is incorrect.",
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/email-already-in-use":"This email already has an account.",
    "auth/weak-password":"Use a stronger password with at least 8 characters.",
    "auth/popup-closed-by-user":"Google sign-in was cancelled.",
    "auth/cancelled-popup-request":"Google sign-in is already in progress.",
    "auth/popup-blocked":"Your browser blocked the Google sign-in popup.",
    "auth/account-exists-with-different-credential":"An account already exists with a different sign-in method. Log in with that method first.",
    "auth/operation-not-allowed":"This sign-in method is not enabled in the buyer's Firebase project.",
    "auth/unauthorized-domain":"This website domain is not authorized in the buyer's Firebase project.",
    "auth/requires-recent-login":"Please sign in again and retry.",
    "auth/too-many-requests":"Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection and try again."
  };
  return map[code]||e?.message||"Something went wrong. Please try again.";
}

async function persistCustomerAuth(){
  if(!auth) return;
  await setPersistence(auth,browserLocalPersistence);
}

async function loginWithEmail(e){
  e.preventDefault();if(!isFirebaseConfigured){msg("Firebase is not configured yet. Add your Firebase Web App config in js/firebase-config.js.","error");return}
  const fd=new FormData(e.currentTarget);state.loading=true;msg("Signing you in…");
  try{
    await persistCustomerAuth();
    const cred=await signInWithEmailAndPassword(auth,String(fd.get("email")).trim(),String(fd.get("password")));
    await reload(cred.user);
    if(!cred.user.emailVerified){await sendEmailVerification(cred.user);await signOut(auth);msg("Please verify your email first. A fresh verification email was sent.","error");return}
  }catch(err){msg(friendlyError(err),"error")}finally{state.loading=false}
}

async function signup(e){
  e.preventDefault();if(!isFirebaseConfigured){msg("Firebase is not configured yet. Add your Firebase Web App config in js/firebase-config.js.","error");return}
  const fd=new FormData(e.currentTarget);
  if(String(fd.get("password"))!==String(fd.get("confirmPassword"))){msg("Passwords do not match.","error");return}
  if(!fd.get("terms")){msg("You must agree to the terms and conditions.","error");return}
  state.loading=true;msg("Creating your account…");
  try{
    await persistCustomerAuth();
    const cred=await createUserWithEmailAndPassword(auth,String(fd.get("email")).trim(),String(fd.get("password")));
    await updateProfile(cred.user,{displayName:String(fd.get("name")).trim()});
    await setDoc(doc(db,"users",cred.user.uid),{
      fullName:String(fd.get("name")).trim(),email:cred.user.email,phone:String(fd.get("phone")).trim(),
      provider:"password",photoURL:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    },{merge:true});
    await sendEmailVerification(cred.user);
    await signOut(auth);
    state.mode="login";renderAuth();
    msg("Account created. Check your email and verify your address before logging in.","success");
  }catch(err){msg(friendlyError(err),"error")}finally{state.loading=false}
}

async function googleLogin(){
  if(!isFirebaseConfigured){msg("Firebase is not configured yet. Add your Firebase Web App config in js/firebase-config.js.","error");return}
  try{
    await persistCustomerAuth();
    const cred=await signInWithPopup(auth,new GoogleAuthProvider());
    const existing=await getDoc(doc(db,"users",cred.user.uid));
    await setDoc(doc(db,"users",cred.user.uid),{
      fullName:cred.user.displayName||"",email:cred.user.email||"",phone:cred.user.phoneNumber||"",
      provider:"google.com",photoURL:cred.user.photoURL||"",
      ...(!existing.exists()?{createdAt:serverTimestamp()}:{}),updatedAt:serverTimestamp()
    },{merge:true});
  }catch(err){msg(friendlyError(err),"error")}
}

async function forgotPassword(){
  const email=prompt("Enter the email address for your account:");
  if(!email)return;
  if(!isFirebaseConfigured){msg("Firebase is not configured yet.","error");return}
  try{
    await persistCustomerAuth();
    await sendPasswordResetEmail(auth,email.trim());
    msg("If an account exists for that email, a password reset message was sent.","success");
  }catch(err){
    if(err?.code==="auth/user-not-found"){
      msg("If an account exists for that email, a password reset message was sent.","success");
    }else{
      msg(friendlyError(err),"error");
    }
  }
}

function writeOrderCache(orders){
  try{
    const incoming=Array.isArray(orders)?orders:[];
    const current=JSON.parse(localStorage.getItem(ORDER_KEY)||"[]");
    const map=new Map(
      (Array.isArray(current)?current:[])
        .filter(order=>order?.id)
        .map(order=>[String(order.id),order])
    );
    incoming.filter(order=>order?.id).forEach(order=>{
      const normalized={
        ...order,
        createdAt:order.createdAt?.toDate?order.createdAt.toDate().toISOString():order.createdAt,
        updatedAt:order.updatedAt?.toDate?order.updatedAt.toDate().toISOString():order.updatedAt,
        statusUpdatedAt:order.statusUpdatedAt?.toDate?order.statusUpdatedAt.toDate().toISOString():order.statusUpdatedAt
      };
      map.set(String(normalized.id),normalized);
    });
    localStorage.setItem(ORDER_KEY,JSON.stringify(
      [...map.values()].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,500)
    ));
  }catch{}
}

async function loadAccount(){
  if(isDemoAccount()){
    if(ordersUnsubscribe){ordersUnsubscribe();ordersUnsubscribe=null;}
    const data=getDemoData();
    state.profile=data.profile||{};
    state.orders=data.orders||[];
    state.addresses=normalizeAddresses(data.addresses||[]);
    state.wishlist=data.wishlist||[];
    saveCheckoutDefault(defaultAddress());
    return;
  }

  if(ordersUnsubscribe){ordersUnsubscribe();ordersUnsubscribe=null;}
  const uid=state.user.uid;
  const [profileSnap,ordersSnap,addrSnap,wishSnap]=await Promise.all([
    getDoc(doc(db,"users",uid)),
    getDocs(query(collection(db,"orders"),where("customerUid","==",uid))),
    getDocs(collection(db,"users",uid,"addresses")).catch(()=>({docs:[]})),
    getDocs(collection(db,"users",uid,"wishlist")).catch(()=>({docs:[]}))
  ]);
  state.profile=profileSnap.exists()?profileSnap.data():{fullName:state.user.displayName||"",email:state.user.email||"",phone:state.user.phoneNumber||"",provider:state.user.providerData?.[0]?.providerId||""};
  state.orders=ordersSnap.docs.map(d=>({id:d.id,...d.data(),source:"firestore"}))
    .sort((a,b)=>{
      const ta=a.createdAt?.toDate?a.createdAt.toDate().getTime():new Date(a.createdAt||0).getTime();
      const tb=b.createdAt?.toDate?b.createdAt.toDate().getTime():new Date(b.createdAt||0).getTime();
      return tb-ta;
    });
  writeOrderCache(state.orders);
  state.addresses=normalizeAddresses(addrSnap.docs.map(d=>({id:d.id,...d.data()})));
  state.wishlist=wishSnap.docs.map(d=>({id:d.id,...d.data()}));

  // Live order source: Admin status changes are pushed here immediately.
  ordersUnsubscribe=onSnapshot(
    query(collection(db,"orders"),where("customerUid","==",uid)),
    snapshot=>{
      state.orders=snapshot.docs.map(d=>({id:d.id,...d.data(),source:"firestore"}))
        .sort((a,b)=>{
          const ta=a.createdAt?.toDate?a.createdAt.toDate().getTime():new Date(a.createdAt||0).getTime();
          const tb=b.createdAt?.toDate?b.createdAt.toDate().getTime():new Date(b.createdAt||0).getTime();
          return tb-ta;
        });
      writeOrderCache(state.orders);
      renderDashboard();
    },
    error=>{
      console.error("[Kapeng Barako] customer order listener failed",error);
    }
  );
}

function dashboard(){
  const p=state.profile||{};
  const delivered=state.orders.filter(o=>String(o.status).toLowerCase()==="delivered").length;
  return `
<div class="account-hero"><div><div class="account-eyebrow">MY ACCOUNT</div><h1>Hello, ${esc((p.fullName||"Coffee lover").split(" ")[0])}.</h1><p>Manage your profile, orders, addresses, and favorite coffee in one place.</p></div><a class="account-btn gold" href="../index.html#products">Shop Coffee →</a></div>
<div class="account-grid">
<aside class="account-sidebar">
<button class="account-tab ${state.tab==="overview"?"active":""}" data-tab="overview">Overview</button>
<button class="account-tab ${state.tab==="orders"?"active":""}" data-tab="orders">My Orders</button>
<button class="account-tab ${state.tab==="track"?"active":""}" data-tab="track">Track Order</button>
<button class="account-tab ${state.tab==="addresses"?"active":""}" data-tab="addresses">Address Book</button>
<button class="account-tab ${state.tab==="wishlist"?"active":""}" data-tab="wishlist">Wishlist</button>
<button class="account-tab ${state.tab==="profile"?"active":""}" data-tab="profile">Profile</button>
</aside>
<section class="account-panel" id="panel"></section>
</div>`;
}

function renderPanel(){
 const panel=document.querySelector("#panel");if(!panel)return;
 if(state.tab==="overview")panel.innerHTML=`
<div class="panel-head"><div><h2>Account overview</h2><p>Your customer activity at a glance.</p></div></div>
<div class="stat-grid"><div class="stat-card"><span>Total orders</span><strong>${state.orders.length}</strong></div><div class="stat-card"><span>Delivered</span><strong>${deliveredCount()}</strong></div><div class="stat-card"><span>Favorites</span><strong>${state.wishlist.length}</strong></div></div>
<div class="notice">Tip: Save your default delivery address and favorite a 500g pack so your next order takes less time.</div>`;
 else if(state.tab==="orders")panel.innerHTML=ordersView();
 else if(state.tab==="track")panel.innerHTML=trackView();
 else if(state.tab==="addresses")panel.innerHTML=addressesView();
 else if(state.tab==="wishlist")panel.innerHTML=wishlistView();
 else panel.innerHTML=profileView();
 bindPanel();
}
function deliveredCount(){return state.orders.filter(o=>String(o.status).toLowerCase()==="delivered").length}

function ordersView(){
 if(!state.orders.length)return `<div class="panel-head"><div><h2>My Orders</h2><p>Your verified account orders will appear here.</p></div></div><div class="empty-state">No orders yet.<br><a class="account-btn gold" href="../index.html#products" style="display:inline-flex;margin-top:12px">Shop Coffee</a></div>`;
 return `<div class="panel-head"><div><h2>My Orders</h2><p>Order history and current delivery status.</p></div><button class="account-btn primary" type="button" data-show-track>Track my order</button></div><div class="order-list">${state.orders.map(order=>`<article class="order-card"><div class="order-top"><div><div class="order-id">#${esc(order.id)}</div><div class="order-meta">${formatDate(order.createdAt)}</div></div><span class="status ${normalizeOrderStatus(order.status).toLowerCase()}">${normalizeOrderStatus(order.status)}</span></div><div class="order-items">${(order.items||[]).map(i=>`<div class="order-item"><span>${esc(i.name)} · ${esc(i.size||i.weight||"")} × ${Number(i.qty||1)}</span><strong>${money(Number(i.price||0)*Number(i.qty||1))}</strong></div>`).join("")}</div><div class="order-total"><span>Total</span><span>${money(order.total)}</span></div><div class="card-actions"><button class="small-btn track-order-btn" type="button" data-track-order="${esc(order.id)}">Track Order →</button></div></article>`).join("")}</div>`;
}

function normalizeOrderStatus(status){
 const raw=String(status||"Pending").trim().toLowerCase();
 if(raw==="delivered") return "Delivered";
 if(["ready","ready to ship","processing/roasting","dispatched","in transit"].includes(raw)) return "Ready";
 return "Pending";
}

function trackingStage(order){
 const current=normalizeOrderStatus(order?.status);
 const stages=[
   ["Pending","Order received"],
   ["Ready","Ready for dispatch"],
   ["Delivered","Delivered"]
 ];
 const currentIndex=stages.findIndex(([status])=>status===current);
 return {stages,currentIndex};
}

function trackCard(order){
 const t=trackingStage(order);
 const publicStatus=normalizeOrderStatus(order?.status);
 return `<article class="track-card">
   <div class="track-card-head"><div><span class="track-label">ORDER</span><strong>#${esc(order.id)}</strong><span class="order-meta">Placed ${formatDate(order.createdAt)}</span></div><span class="status ${publicStatus.toLowerCase()}">${publicStatus}</span></div>
   <div class="track-line">${t.stages.map(([status,label],i)=>{
     const done=t.currentIndex>=i;
     return '<div class="track-step '+(done?"done":"")+' '+(t.currentIndex===i?"current":"")+'"><span class="track-dot"></span><div><strong>'+esc(label)+'</strong><small>'+esc(status)+(t.currentIndex===i?' · Current':'')+'</small></div></div>';
   }).join("")}</div>
   <div class="track-summary"><span>Order total</span><strong>${money(order.total)}</strong></div>
 </article>`;
}

function trackView(){
 if(!state.orders.length)return `<div class="panel-head"><div><h2>Track My Order</h2><p>Your signed-in orders and their current store status.</p></div></div><div class="empty-state">No orders to track yet.<br><a class="account-btn gold" href="../index.html#products" style="display:inline-flex;margin-top:12px">Shop Coffee</a></div>`;
 return `<div class="panel-head"><div><h2>Track My Order</h2><p>Status comes from your account order record. It updates when the store updates the order.</p></div></div><div class="track-order-list">${state.orders.map(trackCard).join("")}</div>`;
}


function addressesView(){
 const addresses=normalizeAddresses(state.addresses);
 state.addresses=addresses;
 const defaultId=addresses.find(a=>a.isDefault)?.id||"";
 if(defaultId) saveCheckoutDefault(addresses.find(a=>String(a.id)===String(defaultId)));
 return `<div class="panel-head"><div><h2>My Address Book</h2><p>Your default address is used to make the next checkout faster.</p></div><button class="account-btn primary" id="add-address">+ Add New</button></div>
<div id="address-list" class="address-grid">${addresses.length?addresses.map(a=>`<article class="address-card ${a.isDefault?"is-default":""}"><div class="address-title-row"><h3>${esc(a.label||"Delivery Address")}</h3>${a.isDefault?'<span class="default-address-badge">DEFAULT</span>':""}</div><p>${esc(a.recipient||state.profile?.fullName||"")}<br>${esc(a.phone||state.profile?.phone||"")}<br>${esc(a.address||"")}</p><div class="card-actions">${a.isDefault?"":`<button class="small-btn primary-outline" data-default-address="${esc(a.id)}">Set Default</button>`}<button class="small-btn" data-edit-address="${esc(a.id)}">Edit</button><button class="small-btn" data-delete-address="${esc(a.id)}">Delete</button></div></article>`).join(""):'<div class="empty-state" style="grid-column:1/-1">No saved address yet. Add your first address for faster checkout.</div>'}</div>`;
}

function wishlistView(){
 return `<div class="panel-head"><div><h2>Wishlist / Favorites</h2><p>Saved products for quick future reordering.</p></div></div>
${state.wishlist.length?`<div class="wishlist-grid">${state.wishlist.map(w=>`<article class="wish-card"><div class="wish-art">☕</div><h3>${esc(w.name||"Kapeng Barako")}</h3><p>${esc(w.weight||"")} ${w.grind?"· "+esc(w.grind):""}</p><div class="card-actions"><a class="small-btn" href="../index.html#products">Shop again</a><button class="small-btn" data-remove-wish="${esc(w.id)}">Remove</button></div></article>`).join("")}</div>`:'<div class="empty-state">Your favorites are empty.<br>Use the heart button on a product to save it here.</div>'}`;
}

function profileView(){
 const p=state.profile||{};
 const name=getProfileName();
 const email=p.email||state.user?.email||"";
 const verified=Boolean(state.user?.emailVerified);
 const provider=state.user?.providerData?.[0]?.providerId==="google.com"?"Google":"Email & Password";
 const joined=state.user?.metadata?.creationTime?new Date(state.user.metadata.creationTime).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}):"—";
 return `
<div class="panel-head"><div><h2>My Profile</h2><p>Your personal customer profile is private to your signed-in account.</p></div></div>
<div class="profile-summary">
  ${avatarMarkup(name,state.user?.photoURL||"", "profile-avatar large")}
  <div class="profile-summary-copy"><strong>${esc(name)}</strong><span>${esc(email)}</span><div class="profile-badges"><span>${verified?"Verified email":"Email verification status unavailable"}</span><span>${esc(provider)}</span></div></div>
</div>
<div class="profile-meta">
  <div><span>Customer</span><strong>${esc(name)}</strong></div>
  <div><span>Member since</span><strong>${esc(joined)}</strong></div>
</div>
<form id="profile-form" class="profile-form">
  <div class="form-grid">
    <div class="field"><label>Full Name</label><input name="fullName" value="${esc(p.fullName||name)}" required autocomplete="name"></div>
    <div class="field"><label>Email Address</label><input value="${esc(email)}" disabled autocomplete="email"></div>
    <div class="field"><label>Phone Number</label><input name="phone" type="tel" value="${esc(p.phone||"")}" required autocomplete="tel"></div>
  </div>
  <button class="account-btn primary" type="submit">Save Profile</button>
  <div id="profile-msg"></div>
</form>
`;
}

function formatDate(v){if(!v)return"Date unavailable";try{const d=v.toDate?v.toDate():new Date(v);return d.toLocaleString("en-PH",{year:"numeric",month:"short",day:"numeric"})}catch{return"Date unavailable"}}

function bindPanel(){
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderDashboard()});
 document.querySelector("#add-address")?.addEventListener("click",()=>addressForm());
 document.querySelectorAll("[data-default-address]").forEach(b=>b.onclick=()=>persistDefaultAddress(b.dataset.defaultAddress));

 document.querySelectorAll("[data-edit-address]").forEach(b=>b.onclick=()=>addressForm(state.addresses.find(a=>a.id===b.dataset.editAddress)));
 document.querySelectorAll("[data-delete-address]").forEach(b=>b.onclick=()=>removeAddress(b.dataset.deleteAddress));
 document.querySelectorAll("[data-remove-wish]").forEach(b=>b.onclick=()=>removeWishlist(b.dataset.removeWish));
 document.querySelector("#profile-form")?.addEventListener("submit",saveProfile);
 document.querySelector("#remove-demo-account")?.addEventListener("click",deleteDemoAccount);
 document.querySelector("[data-show-track]")?.addEventListener("click",()=>{state.tab="track";renderDashboard()});
 document.querySelectorAll("[data-track-order]").forEach(button=>button.addEventListener("click",()=>{state.tab="track";renderDashboard()}));
}

function addressForm(a={}){
 const label=prompt("Address label (e.g. Home, Office):",a.label||"Home");if(!label)return;
 const recipient=prompt("Recipient name:",a.recipient||state.profile?.fullName||"");if(!recipient)return;
 const phone=prompt("Phone number:",a.phone||state.profile?.phone||"");if(!phone)return;
 const address=prompt("Complete delivery address:",a.address||"");if(!address)return;
 saveAddress({id:a.id,label,recipient,phone,address});
}

async function persistDefaultAddress(id){
 try{
  if(isDemoAccount()){
    const selected=setDefaultAddress(id);saveDemoData();renderPanel();return;
  }
  const addresses=normalizeAddresses(state.addresses);
  for(const address of addresses){
    await setDoc(doc(db,"users",state.user.uid,"addresses",String(address.id)),{isDefault:String(address.id)===String(id),updatedAt:serverTimestamp()},{merge:true});
  }
  await loadAccount();renderPanel();
 }catch(e){alert(friendlyError(e))}
}
async function saveAddress(a){
 try{
  if(isDemoAccount()){
    const isFirst=!state.addresses.length;
    const newId=a.id||"demo-address-"+Date.now();
    const next=a.id?state.addresses.map(x=>x.id===a.id?{...x,...a}:x):[...state.addresses,{id:newId,...a,isDefault:isFirst}];
    state.addresses=normalizeAddresses(next);
    saveDemoData();saveCheckoutDefault(defaultAddress());renderPanel();return;
  }
  const isFirst=!state.addresses.length;
  const ref=a.id?doc(db,"users",state.user.uid,"addresses",a.id):doc(collection(db,"users",state.user.uid,"addresses"));
  await setDoc(ref,{label:a.label,recipient:a.recipient,phone:a.phone,address:a.address,isDefault:a.id?Boolean(state.addresses.find(x=>String(x.id)===String(a.id))?.isDefault):isFirst,updatedAt:serverTimestamp()},{merge:true});
  await loadAccount();saveCheckoutDefault(defaultAddress());renderPanel();
 }catch(e){alert(friendlyError(e))}
}
async function removeAddress(id){
 if(!confirm("Delete this saved address?"))return;
 try{
  if(isDemoAccount()){
    state.addresses=normalizeAddresses(state.addresses.filter(a=>String(a.id)!==String(id)));
    saveDemoData();saveCheckoutDefault(defaultAddress());renderPanel();return;
  }
  await deleteDoc(doc(db,"users",state.user.uid,"addresses",id));
  await loadAccount();saveCheckoutDefault(defaultAddress());renderPanel();
 }catch(e){alert(friendlyError(e))}
}
async function removeWishlist(id){try{if(isDemoAccount()){state.wishlist=state.wishlist.filter(w=>w.id!==id);saveDemoData();renderPanel();return}await deleteDoc(doc(db,"users",state.user.uid,"wishlist",id));await loadAccount();renderPanel()}catch(e){alert(friendlyError(e))}}
async function saveProfile(e){
 e.preventDefault();const fd=new FormData(e.currentTarget);
 try{
  const fullName=String(fd.get("fullName")).trim();const phone=String(fd.get("phone")).trim();
  if(isDemoAccount()){state.profile={...state.profile,fullName,phone};state.user.displayName=fullName;state.user.phoneNumber=phone;saveDemoData();state.tab="profile";renderDashboard();document.querySelector("#profile-msg").innerHTML="<div class=\"notice success\">Demo profile saved.</div>";return}
  await updateProfile(state.user,{displayName:fullName});
  await updateDoc(doc(db,"users",state.user.uid),{fullName,phone,updatedAt:serverTimestamp()});
  await loadAccount();document.querySelector("#profile-msg").innerHTML='<div class="notice success">Profile saved.</div>';
 }catch(err){document.querySelector("#profile-msg").innerHTML='<div class="notice error">'+esc(friendlyError(err))+'</div>'}
}

function renderDashboard(){
 appRoot.innerHTML=shell();
 document.querySelector("#account-main").innerHTML=dashboard();
 document.querySelector("#logout-btn").onclick=()=>{if(isDemoAccount()){if(ordersUnsubscribe){ordersUnsubscribe();ordersUnsubscribe=null;}state.user=null;state.profile=null;state.orders=[];state.addresses=[];state.wishlist=[];state.demoActive=false;renderAuth()}else{signOut(auth)}};
 document.querySelector("#top-profile").onclick=()=>{state.tab="profile";renderDashboard()};
 renderPanel();
}

let auth=null,db=null;
if(isFirebaseConfigured){
 const firebaseApp=initializeApp(firebaseConfig);auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);
 onAuthStateChanged(auth,async user=>{
  if(state.demoActive)return;
  if(!user){
    if(ordersUnsubscribe){ordersUnsubscribe();ordersUnsubscribe=null;}
    state.user=null;renderAuth();return
  }
  await reload(user);
  if(user.providerData.some(p=>p.providerId==="password")&&!user.emailVerified){await signOut(auth);renderAuth();return}
  state.user=user;await loadAccount();renderDashboard();
 });
}else{
 renderAuth();
 msg("Firebase is not configured yet. You can still open the demo customer account for a full UI preview.","error");
}
