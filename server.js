require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { createDatabase } = require("./src/db");
const { syncOrdersCsv } = require("./src/orderExcel");
const { products } = require("./src/products");

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "panpan-super-secret-key";
const clientOrigin = process.env.CLIENT_ORIGIN || "";
const ordersCsvPath = path.join(__dirname, "data", "orders.csv");

const db = createDatabase({
  databaseUrl: process.env.DATABASE_URL,
  sqlitePath: path.join(__dirname, "data", "panpan.db")
});

app.use(cors(clientOrigin ? { origin: clientOrigin } : {}));
app.use(express.json());
app.use(express.static(__dirname));

start().catch((error) => {
  console.error("Failed to start Pan Pan server", error);
  process.exit(1);
});

async function start() {
  await db.init();
  await db.seedDefaults({
    admin: {
      name: "Pan Pan Admin",
      email: "admin@panpan.mk",
      phone: "+38972261478",
      passwordHash: bcrypt.hashSync("panpan123", 10)
    },
    demo: {
      name: "Demo Client",
      email: "demo@panpan.mk",
      phone: "+38970111222",
      passwordHash: bcrypt.hashSync("demo123", 10)
    }
  });
  await syncOrdersCsv(db, ordersCsvPath);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      database: db.mode,
      now: new Date().toISOString()
    });
  });

  app.get("/api/products", (_req, res) => {
    res.json({ products });
  });

  app.post("/api/auth/register", asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Сите полиња се задолжителни." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await db.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: "Овој email веќе постои." });
    }

    await db.createUser({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      passwordHash: bcrypt.hashSync(String(password), 10),
      role: "customer",
      status: "pending"
    });

    return res.status(201).json({ message: "Барањето е испратено. Почекајте админ одобрување." });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email и лозинка се задолжителни." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await db.findUserByEmail(normalizedEmail);

    if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
      return res.status(401).json({ message: "Погрешен email или лозинка." });
    }

    if (user.status !== "approved") {
      return res.status(403).json({ message: "Вашиот профил сè уште не е одобрен од админ." });
    }

    const token = jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret, { expiresIn: "7d" });
    res.json({
      token,
      user: serializeUser(user)
    });
  }));

  app.get("/api/auth/me", authenticate, asyncHandler(async (req, res) => {
    res.json({ user: serializeUser(req.user) });
  }));

  app.get("/api/orders/my", authenticate, asyncHandler(async (req, res) => {
    const orders = await db.listOrdersByUser(req.user.id);
    res.json({ orders });
  }));

  app.post("/api/orders", authenticate, asyncHandler(async (req, res) => {
    const { productId, quantity, deliveryType, address, deliveryDate, deliveryTime, note } = req.body || {};
    const product = products.find((entry) => entry.id === productId);
    const parsedQuantity = Number(quantity);

    if (!product || !Number.isFinite(parsedQuantity) || parsedQuantity < 1 || !deliveryType || !address || !deliveryDate || !deliveryTime) {
      return res.status(400).json({ message: "Недостасуваат валидни податоци за нарачката." });
    }

    await db.createOrder({
      userId: req.user.id,
      customerName: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      productId: product.id,
      productName: product.name,
      quantity: parsedQuantity,
      unitPrice: product.price,
      totalPrice: product.price * parsedQuantity,
      deliveryType: String(deliveryType),
      address: String(address).trim(),
      deliveryDate: String(deliveryDate),
      deliveryTime: String(deliveryTime),
      note: String(note || "").trim()
    });
    await syncOrdersCsv(db, ordersCsvPath);

    res.status(201).json({ message: "Нарачката е успешно зачувана." });
  }));

  app.get("/api/admin/orders", authenticate, requireAdmin, asyncHandler(async (_req, res) => {
    res.json({ orders: await db.listOrders() });
  }));

  app.get("/api/admin/orders/excel", authenticate, requireAdmin, asyncHandler(async (_req, res) => {
    await syncOrdersCsv(db, ordersCsvPath);
    res.download(ordersCsvPath, `panpan-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }));

  app.delete("/api/admin/orders", authenticate, requireAdmin, asyncHandler(async (_req, res) => {
    await db.clearOrders();
    await syncOrdersCsv(db, ordersCsvPath);
    res.json({ message: "Сите нарачки се избришани." });
  }));

  app.get("/api/admin/pending-users", authenticate, requireAdmin, asyncHandler(async (_req, res) => {
    const users = await db.listPendingUsers();
    res.json({ users: users.map(serializeUser) });
  }));

  app.post("/api/admin/users/:id/approve", authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const changed = await db.updateUserStatus(req.params.id, "approved");
    if (!changed) {
      return res.status(404).json({ message: "Корисникот не е пронајден." });
    }

    res.json({ message: "Корисникот е одобрен." });
  }));

  app.post("/api/admin/users/:id/reject", authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const changed = await db.updateUserStatus(req.params.id, "rejected");
    if (!changed) {
      return res.status(404).json({ message: "Корисникот не е пронајден." });
    }

    res.json({ message: "Корисникот е одбиен." });
  }));

  app.use("/api", (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.statusCode || 500).json({
      message: error.publicMessage || "Се појави грешка на серверот."
    });
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Pan Pan server started on http://localhost:${port}`);
    console.log(`Database mode: ${db.mode}`);
  });
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Не сте најавени." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await db.findUserById(payload.sub);

    if (!user || user.status !== "approved") {
      return res.status(401).json({ message: "Сесијата не е валидна." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Сесијата не е валидна." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Немате пристап." });
  }

  next();
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt
  };
}
