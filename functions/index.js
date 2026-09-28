const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

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
      total: subtotal,
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

  const claims = request.auth.token || {};
  if (claims.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

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
