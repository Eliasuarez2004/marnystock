/**
 * Loads a demo dataset into a Firebase project so anyone can open the app and see it working.
 *
 *   npm run seed:demo            # aborts if the project already has products
 *   npm run seed:demo -- --force # seeds anyway
 *
 * Reads the same .env the app uses, signs in with SEED_EMAIL / SEED_PASSWORD and writes with
 * the web SDK, so it needs no service-account key. Point it at a DEMO project, never at
 * production: it creates data under the same collections the app reads.
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, collection, doc, getDocs, writeBatch, limit, query,
} from 'firebase/firestore';

// --- .env (no dotenv dependency: the file is a flat KEY=VALUE list) ---------
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const auth = getAuth(app);

// --- helpers ---------------------------------------------------------------
const FORCE = process.argv.includes('--force');
const today = new Date();
/** ISO date (yyyy-mm-dd) `days` from today — expiry dates are stored as date-only strings. */
const inDays = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const money = (n) => Math.round(n * 100) / 100;

// --- demo data -------------------------------------------------------------
const PRODUCTS = [
  { name: 'Suplemento multivitamínico 60 caps', description: 'Frasco de 60 cápsulas', price: 480 },
  { name: 'Omega 3 1000 mg 90 caps', description: 'Aceite de pescado', price: 620 },
  { name: 'Vitamina C 1000 mg 30 tabs', description: 'Efervescente', price: 210 },
  { name: 'Colágeno hidrolizado 300 g', description: 'Polvo sabor neutro', price: 750 },
  { name: 'Magnesio 400 mg 60 caps', description: 'Citrato de magnesio', price: 395 },
  { name: 'Probiótico 30 caps', description: '10 mil millones UFC', price: 890 },
];

const CLIENTS = [
  { name: 'Farmacia La Bendición', rtn: '05019012345678', email: 'compras@labendicion.hn', phone: '2550-1122', address: 'Bo. Guamilito, 5 calle', departamento: 'Cortés', isSpecial: true },
  { name: 'Distribuidora Santa Rosa', rtn: '18019087654321', email: 'ventas@dsantarosa.hn', phone: '2662-3344', address: 'Barrio El Centro', departamento: 'Copán', isSpecial: false },
  { name: 'Super Farmacia Central', rtn: '08019011223344', email: 'central@superfarmacia.hn', phone: '2232-5566', address: 'Col. Palmira, Ave. República', departamento: 'Francisco Morazán', isSpecial: false },
  { name: 'Botica San Juan', rtn: '01019055667788', email: 'boticasanjuan@correo.hn', phone: '2443-7788', address: 'Frente al parque central', departamento: 'Atlántida', isSpecial: false },
  { name: 'Clínica Vida Sana', rtn: '05019099887766', email: 'admon@vidasana.hn', phone: '2557-9900', address: 'Bo. Río de Piedras', departamento: 'Cortés', isSpecial: true },
];

// Batches per product: one expiring soon (so FEFO has something to pick first),
// one mid-term and one far out. This is what makes the demo show the point.
const BATCH_PLAN = [
  { suffix: 'A', expiry: inDays(25), sps: 40, tgu: 15, supplier: 'Laboratorios Nutriva' },
  { suffix: 'B', expiry: inDays(120), sps: 80, tgu: 60, supplier: 'Laboratorios Nutriva' },
  { suffix: 'C', expiry: inDays(320), sps: 120, tgu: 90, supplier: 'Importadora Andina' },
];

/**
 * Signs in with the demo account, creating it on first run: a fresh Firebase project has an
 * empty Authentication tab, and the security rules only let signed-in clients write.
 */
async function signIn() {
  try {
    return await signInWithEmailAndPassword(auth, env.SEED_EMAIL, env.SEED_PASSWORD);
  } catch (error) {
    const missing = ['auth/user-not-found', 'auth/invalid-credential'].includes(error.code);
    if (!missing) throw error;
    console.log(`Creating the demo account ${env.SEED_EMAIL}`);
    return createUserWithEmailAndPassword(auth, env.SEED_EMAIL, env.SEED_PASSWORD);
  }
}

async function main() {
  if (!env.VITE_FIREBASE_PROJECT_ID) throw new Error('.env is missing VITE_FIREBASE_PROJECT_ID');
  console.log(`\nSeeding demo data into project "${env.VITE_FIREBASE_PROJECT_ID}"`);

  await signIn();
  console.log(`Signed in as ${env.SEED_EMAIL}`);

  const existing = await getDocs(query(collection(db, 'products'), limit(1)));
  if (!existing.empty && !FORCE) {
    console.log('\nThis project already has products. Re-run with --force to seed anyway.\n');
    process.exit(0);
  }

  const batch = writeBatch(db);
  let writes = 0;

  // 1. Products
  const productIds = PRODUCTS.map((p) => {
    const ref = doc(collection(db, 'products'));
    batch.set(ref, { ...p, imageUrl: '' });
    writes += 1;
    return { id: ref.id, ...p };
  });

  // 2. Batches + their purchase movement (stock only ever enters through the ledger)
  const lots = [];
  productIds.forEach((product, i) => {
    BATCH_PLAN.forEach((plan) => {
      const lotRef = doc(collection(db, 'inventory_lots'));
      const lotNumber = `L-${String(1000 + i * 3).padStart(4, '0')}${plan.suffix}`;
      batch.set(lotRef, {
        productId: product.id,
        productName: product.name,
        lotNumber,
        expiryDate: plan.expiry,
        supplier: plan.supplier,
        stockSPS: plan.sps,
        stockTGU: plan.tgu,
      });
      batch.set(doc(collection(db, 'inventory_movements')), {
        date: new Date().toISOString(),
        type: 'ENTRADA_COMPRA',
        lotId: lotRef.id,
        lotNumber,
        productId: product.id,
        productName: product.name,
        toLocation: 'BODEGA',
        quantity: plan.sps + plan.tgu,
        reason: `Compra a ${plan.supplier}`,
      });
      writes += 2;
      lots.push({ id: lotRef.id, lotNumber, productId: product.id, productName: product.name, ...plan });
    });
  });

  // 3. Clients
  const clientIds = CLIENTS.map((c) => {
    const ref = doc(collection(db, 'clients'));
    batch.set(ref, c);
    writes += 1;
    return { id: ref.id, ...c };
  });

  // 4. Invoices — one cash, one credit fully paid, two credit with balance.
  //    Special clients get a 10% list discount, mirroring the app's pricing rule.
  const INVOICE_PLAN = [
    { client: 0, days: -18, location: 'SPS', terms: 'Contado', lines: [[0, 6], [2, 12]], bonus: [1, 1] },
    { client: 2, days: -12, location: 'TGU', terms: 'Crédito', lines: [[3, 4], [4, 10]], paid: 'full' },
    { client: 1, days: -7, location: 'SPS', terms: 'Crédito', lines: [[1, 8], [5, 3]], paid: 'partial' },
    { client: 4, days: -2, location: 'SPS', terms: 'Crédito', lines: [[5, 6], [0, 10], [2, 20]] },
  ];

  INVOICE_PLAN.forEach((plan, index) => {
    const client = clientIds[plan.client];
    const items = plan.lines.map(([productIndex, quantity]) => {
      const product = productIds[productIndex];
      const price = client.isSpecial ? money(product.price * 0.9) : product.price;
      return { productId: product.id, name: product.name, quantity, price, isBonus: false };
    });
    if (plan.bonus) {
      const product = productIds[plan.bonus[0]];
      items.push({ productId: product.id, name: product.name, quantity: plan.bonus[1], price: 0, isBonus: true });
    }

    const subtotalBruto = money(items.reduce((acc, it) => acc + it.price * it.quantity, 0));
    const globalDiscount = 0;
    const subtotalNeto = money(subtotalBruto - globalDiscount);
    const tax = money(subtotalNeto * 0.15);
    const total = money(subtotalNeto + tax);
    const amountPaid = plan.terms === 'Contado' || plan.paid === 'full'
      ? total
      : plan.paid === 'partial' ? money(total * 0.4) : 0;
    const balanceDue = money(total - amountPaid);
    const issueDate = inDays(plan.days);

    const invoiceRef = doc(collection(db, 'invoices'));
    batch.set(invoiceRef, {
      invoiceNumber: `F-${String(index + 1).padStart(4, '0')}`,
      issueDate,
      createdAt: new Date(issueDate),
      clientId: client.id,
      clientName: client.name,
      saleLocation: plan.location,
      saleType: plan.terms,
      items,
      subtotalBruto,
      globalDiscount,
      subtotalNeto,
      tax,
      total,
      amountPaid,
      balanceDue,
      status: balanceDue <= 0.01 ? 'Pagada' : amountPaid > 0 ? 'Abonada' : 'Pendiente',
    });
    writes += 1;

    if (amountPaid > 0 && plan.terms === 'Crédito') {
      batch.set(doc(collection(db, `invoices/${invoiceRef.id}/payments`)), {
        amount: amountPaid,
        method: 'Transferencia',
        paymentDate: inDays(plan.days + 3),
        createdAt: new Date(inDays(plan.days + 3)),
      });
      writes += 1;
    }

    // The matching stock exit, FEFO: the batch closest to expiring for that branch.
    const stockField = plan.location === 'SPS' ? 'stockSPS' : 'stockTGU';
    items.forEach((item) => {
      const lot = lots
        .filter((l) => l.productId === item.productId)
        .sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
      batch.set(doc(collection(db, 'inventory_movements')), {
        date: new Date(issueDate).toISOString(),
        type: item.isBonus ? 'SALIDA_BONIFICACION' : 'SALIDA_VENTA',
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        productId: item.productId,
        productName: item.name,
        fromLocation: plan.location,
        quantity: item.quantity,
        reason: `Factura #F-${String(index + 1).padStart(4, '0')} del ${issueDate}`,
      });
      lot[stockField === 'stockSPS' ? 'sps' : 'tgu'] -= item.quantity;
      writes += 1;
    });
  });

  // 5. Re-write batch stock so it matches the movements above. `set` with merge, not `update`:
  //    the documents are created in this same batch and `update` requires them to exist first.
  lots.forEach((lot) => {
    batch.set(
      doc(db, 'inventory_lots', lot.id),
      { stockSPS: Math.max(0, lot.sps), stockTGU: Math.max(0, lot.tgu) },
      { merge: true },
    );
    writes += 1;
  });

  await batch.commit();
  console.log(`\nDone: ${PRODUCTS.length} products, ${lots.length} batches, ${CLIENTS.length} clients, ${INVOICE_PLAN.length} invoices (${writes} writes).\n`);
  process.exit(0);
}

main().catch((error) => {
  console.error('\nSeed failed:', error.message || error, '\n');
  process.exit(1);
});
