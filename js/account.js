import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, sendEmailVerification,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  updateProfile, reload
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  query, where, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const appRoot=document.querySelector("#app");
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{maximumFractionDigits:2});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={user:null,profile:null,orders:[],addresses:[],wishlist:[],tab:"overview",mode:"login",loading:false};

function shell(){return `
<div class="account-shell">
<header class="account-topbar"><div class="account-nav">
<a class="account-brand" href="../index.html"><img src="../images/favicon.svg" alt=""><span>Kapeng Barako<small>Customer Account</small></span></a>
<div class="account-nav-actions"><a class="account-btn" href="../index.html#products">Shop Coffee</a><button class="account-btn danger" id="logout-btn" type="button">Logout</button></div>
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
  const login=state.mode==="login";
  card.innerHTML=`
<h2>${login?"Welcome back":"Create your account"}</h2>
<p class="sub">${login?"Sign in to manage your Kapeng Barako orders.":"Use your real contact details for delivery and account recovery."}</p>
<div id="auth-msg"></div>
<button class="google-btn" id="google-btn" type="button"><span class="google-mark">G</span> Continue with Google</button>
<div class="divider">or continue with email</div>
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
  document.querySelector("#auth-form").onsubmit=login?loginWithEmail:signup;
  document.querySelector("#switch-auth").onclick=()=>{state.mode=login?"signup":"login";renderAuth()};
  document.querySelector("#forgot-btn")?.addEventListener("click",forgotPassword);
}

function msg(text,type=""){const el=document.querySelector("#auth-msg");if(el)el.innerHTML=text?`<div class="notice ${type}">${esc(text)}</div>`:""}

function friendlyError(e){
  const code=e?.code||"";
  const map={
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/email-already-in-use":"This email already has an account.",
    "auth/weak-password":"Use a stronger password with at least 8 characters.",
    "auth/popup-closed-by-user":"Google sign-in was cancelled.",
    "auth/too-many-requests":"Too many attempts. Please wait and try again.",
    "auth/network-request-failed":"Network error. Check your connection and try again."
  };
  return map[code]||e?.message||"Something went wrong. Please try again.";
}

async function loginWithEmail(e){
  e.preventDefault();if(!isFirebaseConfigured){msg("Firebase is not configured yet. Add your Firebase Web App config in js/firebase-config.js.","error");return}
  const fd=new FormData(e.currentTarget);state.loading=true;msg("Signing you in…");
  try{
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
    const cred=await createUserWithEmailAndPassword(auth,String(fd.get("email")).trim(),String(fd.get("password")));
    await updateProfile(cred.user,{displayName:String(fd.get("name")).trim()});
    await setDoc(doc(db,"users",cred.user.uid),{
      fullName:String(fd.get("name")).trim(),email:cred.user.email,phone:String(fd.get("phone")).trim(),
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
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
    const cred=await signInWithPopup(auth,new GoogleAuthProvider());
    await setDoc(doc(db,"users",cred.user.uid),{
      fullName:cred.user.displayName||"",email:cred.user.email||"",phone:cred.user.phoneNumber||"",
      provider:"google.com",updatedAt:serverTimestamp()
    },{merge:true});
  }catch(err){msg(friendlyError(err),"error")}
}

async function forgotPassword(){
  const email=prompt("Enter the email address for your account:");
  if(!email)return;
  if(!isFirebaseConfigured){msg("Firebase is not configured yet.","error");return}
  try{await sendPasswordResetEmail(auth,email.trim());msg("If an account exists for that email, a password reset message was sent.","success")}
  catch(err){msg(friendlyError(err),"error")}
}

async function loadAccount(){
  const uid=state.user.uid;
  const [profileSnap,ordersSnap,addrSnap,wishSnap]=await Promise.all([
    getDoc(doc(db,"users",uid)),
    getDocs(query(collection(db,"orders"),where("customerUid","==",uid),orderBy("createdAt","desc"))).catch(()=>({docs:[]})),
    getDocs(collection(db,"users",uid,"addresses")).catch(()=>({docs:[]})),
    getDocs(collection(db,"users",uid,"wishlist")).catch(()=>({docs:[]}))
  ]);
  state.profile=profileSnap.exists()?profileSnap.data():{fullName:state.user.displayName||"",email:state.user.email||"",phone:state.user.phoneNumber||""};
  state.orders=ordersSnap.docs.map(d=>({id:d.id,...d.data()}));
  state.addresses=addrSnap.docs.map(d=>({id:d.id,...d.data()}));
  state.wishlist=wishSnap.docs.map(d=>({id:d.id,...d.data()}));
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
 else if(state.tab==="addresses")panel.innerHTML=addressesView();
 else if(state.tab==="wishlist")panel.innerHTML=wishlistView();
 else panel.innerHTML=profileView();
 bindPanel();
}
function deliveredCount(){return state.orders.filter(o=>String(o.status).toLowerCase()==="delivered").length}

function ordersView(){
 if(!state.orders.length)return `<div class="panel-head"><div><h2>My Orders</h2><p>Your verified account orders will appear here.</p></div></div><div class="empty-state">No orders yet.<br><a class="account-btn gold" href="../index.html#products" style="display:inline-flex;margin-top:12px">Shop Coffee</a></div>`;
 return `<div class="panel-head"><div><h2>My Orders</h2><p>Order history and current delivery status.</p></div></div><div class="order-list">${state.orders.map(order=>`<article class="order-card"><div class="order-top"><div><div class="order-id">#${esc(order.id)}</div><div class="order-meta">${formatDate(order.createdAt)}</div></div><span class="status ${String(order.status).toLowerCase()}">${esc(order.status||"Pending")}</span></div><div class="order-items">${(order.items||[]).map(i=>`<div class="order-item"><span>${esc(i.name)} · ${esc(i.weight||"")} × ${Number(i.qty||1)}</span><strong>${money(Number(i.price||0)*Number(i.qty||1))}</strong></div>`).join("")}</div><div class="order-total"><span>Total</span><span>${money(order.total)}</span></div></article>`).join("")}</div>`;
}

function addressesView(){
 return `<div class="panel-head"><div><h2>My Address Book</h2><p>Save delivery details for faster checkout.</p></div><button class="account-btn primary" id="add-address">+ Add Address</button></div>
<div id="address-list" class="address-grid">${state.addresses.length?state.addresses.map(a=>`<article class="address-card"><h3>${esc(a.label||"Delivery Address")}</h3><p>${esc(a.recipient||state.profile?.fullName||"")}<br>${esc(a.phone||state.profile?.phone||"")}<br>${esc(a.address||"")}</p><div class="card-actions"><button class="small-btn" data-edit-address="${esc(a.id)}">Edit</button><button class="small-btn" data-delete-address="${esc(a.id)}">Delete</button></div></article>`).join(""):'<div class="empty-state" style="grid-column:1/-1">No saved addresses yet.</div>'}</div>`;
}

function wishlistView(){
 return `<div class="panel-head"><div><h2>Wishlist / Favorites</h2><p>Saved products for quick future reordering.</p></div></div>
${state.wishlist.length?`<div class="wishlist-grid">${state.wishlist.map(w=>`<article class="wish-card"><div class="wish-art">☕</div><h3>${esc(w.name||"Kapeng Barako")}</h3><p>${esc(w.weight||"")} ${w.grind?"· "+esc(w.grind):""}</p><div class="card-actions"><a class="small-btn" href="../index.html#products">Shop again</a><button class="small-btn" data-remove-wish="${esc(w.id)}">Remove</button></div></article>`).join("")}</div>`:'<div class="empty-state">Your favorites are empty.<br>Use the heart button on a product to save it here.</div>'}`;
}

function profileView(){
 const p=state.profile||{};
 return `<div class="panel-head"><div><h2>Profile</h2><p>Keep your delivery and account details current.</p></div></div><form id="profile-form" class="profile-form"><div class="form-grid"><div class="field"><label>Full Name</label><input name="fullName" value="${esc(p.fullName)}" required></div><div class="field"><label>Email</label><input value="${esc(p.email||state.user.email||"")}" disabled></div><div class="field"><label>Phone Number</label><input name="phone" type="tel" value="${esc(p.phone||"")}" required></div></div><button class="account-btn primary" type="submit">Save Profile</button><div id="profile-msg"></div></form>`;
}

function formatDate(v){if(!v)return"Date unavailable";try{const d=v.toDate?v.toDate():new Date(v);return d.toLocaleString("en-PH",{year:"numeric",month:"short",day:"numeric"})}catch{return"Date unavailable"}}

function bindPanel(){
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;renderDashboard()});
 document.querySelector("#add-address")?.addEventListener("click",()=>addressForm());
 document.querySelectorAll("[data-edit-address]").forEach(b=>b.onclick=()=>addressForm(state.addresses.find(a=>a.id===b.dataset.editAddress)));
 document.querySelectorAll("[data-delete-address]").forEach(b=>b.onclick=()=>removeAddress(b.dataset.deleteAddress));
 document.querySelectorAll("[data-remove-wish]").forEach(b=>b.onclick=()=>removeWishlist(b.dataset.removeWish));
 document.querySelector("#profile-form")?.addEventListener("submit",saveProfile);
}

function addressForm(a={}){
 const label=prompt("Address label (e.g. Home, Office):",a.label||"Home");if(!label)return;
 const recipient=prompt("Recipient name:",a.recipient||state.profile?.fullName||"");if(!recipient)return;
 const phone=prompt("Phone number:",a.phone||state.profile?.phone||"");if(!phone)return;
 const address=prompt("Complete delivery address:",a.address||"");if(!address)return;
 saveAddress({id:a.id,label,recipient,phone,address});
}

async function saveAddress(a){
 try{
  const ref=a.id?doc(db,"users",state.user.uid,"addresses",a.id):doc(collection(db,"users",state.user.uid,"addresses"));
  await setDoc(ref,{label:a.label,recipient:a.recipient,phone:a.phone,address:a.address,updatedAt:serverTimestamp()},{merge:true});
  await loadAccount();renderPanel();
 }catch(e){alert(friendlyError(e))}
}
async function removeAddress(id){if(!confirm("Delete this saved address?"))return;try{await deleteDoc(doc(db,"users",state.user.uid,"addresses",id));await loadAccount();renderPanel()}catch(e){alert(friendlyError(e))}}
async function removeWishlist(id){try{await deleteDoc(doc(db,"users",state.user.uid,"wishlist",id));await loadAccount();renderPanel()}catch(e){alert(friendlyError(e))}}
async function saveProfile(e){
 e.preventDefault();const fd=new FormData(e.currentTarget);
 try{
  await updateProfile(state.user,{displayName:String(fd.get("fullName")).trim()});
  await updateDoc(doc(db,"users",state.user.uid),{fullName:String(fd.get("fullName")).trim(),phone:String(fd.get("phone")).trim(),updatedAt:serverTimestamp()});
  await loadAccount();document.querySelector("#profile-msg").innerHTML='<div class="notice success">Profile saved.</div>';
 }catch(err){document.querySelector("#profile-msg").innerHTML='<div class="notice error">'+esc(friendlyError(err))+'</div>'}
}

function renderDashboard(){
 appRoot.innerHTML=shell();
 document.querySelector("#account-main").innerHTML=dashboard();
 document.querySelector("#logout-btn").onclick=()=>signOut(auth);
 renderPanel();
}

let auth=null,db=null;
if(isFirebaseConfigured){
 const firebaseApp=initializeApp(firebaseConfig);auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);
 onAuthStateChanged(auth,async user=>{
  if(!user){state.user=null;renderAuth();return}
  await reload(user);
  if(user.providerData.some(p=>p.providerId==="password")&&!user.emailVerified){await signOut(auth);renderAuth();return}
  state.user=user;await loadAccount();renderDashboard();
 });
}else{
 appRoot.innerHTML=authScreen();
 renderAuth();
 msg("Setup required: connect a Firebase Web App before customer data can be stored securely.","error");
}
