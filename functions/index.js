const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function requireAdmin(uid) {
  const snap = await db.collection("admins").doc(uid).get();
  if (!snap.exists || snap.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new HttpsError("invalid-argument", "Cart is empty.");
  }
  return items.map(item => ({
    productId: clean(item.productId || item.id, 120),
    qty: Math.max(1, Math.min(99, Number(item.qty || 1))),
    roast: clean(item.roast, 40),
    grind: clean(item.grind, 40)
  }));
}

exports.createOrder = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in before checkout.");
  }

  const data = request.data || {};
  const items = normalizeItems(data.items);
  const customer = {
    uid: request.auth.uid,
    name: clean(data.customer?.name || request.auth.token.name, 160),
    email: clean(data.customer?.email || request.auth.token.email, 200).toLowerCase(),
    phone: clean(data.customer?.phone, 40)
  };
  const address = clean(data.address, 1000);
  const paymentMethod = clean(data.paymentMethod, 60);
  const gcashRef = clean(data.gcashRef, 80);

  if (!address) throw new HttpsError("invalid-argument", "Delivery address is required.");
  if (!paymentMethod) throw new HttpsError("invalid-argument", "Payment method is required.");

  const paymentStatus =
    paymentMethod.toLowerCase() === "gcash"
      ? "pending_verification"
      : "unpaid";

  const cartQty = items.reduce((sum, item) => sum + item.qty, 0);
  const settingsSnap = await db.collection("settings").doc("store").get();
  const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
  const regional = settings.shipping?.regional || {};
  const shipping =
    cartQty >= 2 ? 0 :
    /batangas/i.test(address) ? Number(regional.batangas ?? 0) :
    /manila|quezon city|makati|pasig|taguig/i.test(address) ? Number(regional.manila ?? 150) :
    Number(regional.province ?? 220);

  const wantedPromo = clean(data.voucher, 80).toUpperCase();
  let discount = 0;
  if (wantedPromo) {
    const promoSnap = await db.collection("promos").where("code", "==", wantedPromo).limit(1).get();
    if (!promoSnap.empty) {
      const promo = promoSnap.docs[0].data() || {};
      const minPacks = Number(promo.minPacks || 0);
      if (promo.active !== false && cartQty >= minPacks) {
        const value = Number(promo.value || 0);
        discount = Math.min(subtotal, promo.type === "percent" ? subtotal * value / 100 : value);
      }
    }
  }

  const orderRef = db.collection("orders").doc();

  const result = await db.runTransaction(async tx => {
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const productRef = db.collection("products").doc(item.productId);
      const snap = await tx.get(productRef);

      if (!snap.exists) {
        throw new HttpsError("failed-precondition", "A product is no longer available.");
      }

      const product = snap.data();
      const stock = Math.max(0, Number(product.stock || 0));
      const qty = item.qty;

      if (stock < qty) {
        throw new HttpsError(
          "failed-precondition",
          (product.name || "Product") + " has insufficient stock."
        );
      }

      const price = Number(product.price || 0);
      subtotal += price * qty;

      orderItems.push({
        productId: productRef.id,
        name: clean(product.name || productRef.id, 200),
        size: clean(product.size, 80),
        price,
        qty,
        roast: item.roast,
        grind: item.grind
      });

      tx.update(productRef, {
        stock: stock - qty,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    const order = {
      id: orderRef.id,
      customer,
      items: orderItems,
      subtotal,
      shippingFee: shipping,
      discount,
      voucher: wantedPromo,
      total: Math.max(0, subtotal + shipping - discount),
      address,
      paymentMethod,
      gcashRef: paymentMethod.toLowerCase() === "gcash" ? gcashRef : "",
      paymentStatus,
      status: "Pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "storefront"
    };

    tx.set(orderRef, order);
    return { id: orderRef.id, total: subtotal, paymentStatus };
  });

  return result;
});

exports.migrateLegacyOrders = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Admin authentication required.");
  }

  await requireAdmin(request.auth.uid);

  const orders = Array.isArray(request.data?.orders) ? request.data.orders : [];
  if (!orders.length) return { imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;

  for (const raw of orders.slice(0, 500)) {
    const id = clean(raw?.id, 120);
    if (!id) {
      skipped++;
      continue;
    }

    const ref = db.collection("orders").doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      skipped++;
      continue;
    }

    const data = {
      ...raw,
      id,
      source: "legacy_localstorage",
      migratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!data.createdAt || typeof data.createdAt === "string") {
      data.createdAt = data.createdAt
        ? admin.firestore.Timestamp.fromDate(new Date(data.createdAt))
        : FieldValue.serverTimestamp();
    }

    await ref.set(data);
    imported++;
  }

  return { imported, skipped };
});


exports.migrateLegacyCatalog = onCall(async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Admin authentication required.");
  await requireAdmin(request.auth.uid);

  const data = request.data || {};
  const products = Array.isArray(data.products) ? data.products : [];
  const promos = Array.isArray(data.promos) ? data.promos : [];
  const settings = data.settings && typeof data.settings === "object" ? data.settings : null;
  const gallery = Array.isArray(data.gallery) ? data.gallery : [];

  let productsImported = 0;
  for (const raw of products.slice(0, 500)) {
    const id = clean(raw?.id, 120);
    if (!id) continue;
    const ref = db.collection("products").doc(id);
    await ref.set({
      ...raw,
      id,
      stock: Math.max(0, Number(raw.stock || 0)),
      price: Math.max(0, Number(raw.price || 0)),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    productsImported++;
  }

  let promosImported = 0;
  for (const raw of promos.slice(0, 500)) {
    const code = clean(raw?.code, 80).toUpperCase();
    if (!code) continue;
    await db.collection("promos").doc(code).set({
      ...raw, code, updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    promosImported++;
  }

  if (settings) {
    await db.collection("settings").doc("store").set({
      ...settings, updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  if (gallery.length) {
    await db.collection("content").doc("gallery").set({
      items: gallery.slice(0, 50),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  return { productsImported, promosImported, settingsImported: Boolean(settings), galleryImported: gallery.length > 0 };
});
