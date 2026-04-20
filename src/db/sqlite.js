const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

class SqliteDatabase {
  constructor(sqlitePath) {
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    this.db = new Database(sqlitePath);
    this.mode = "sqlite";
  }

  async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'customer')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        delivery_type TEXT NOT NULL,
        address TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_time TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  async seedDefaults({ admin, demo }) {
    this.seedUser(admin, "admin", "approved");
    this.seedUser(demo, "customer", "approved");
  }

  seedUser(user, role, status) {
    const existing = this.db.prepare("SELECT id FROM users WHERE email = ?").get(user.email);
    if (existing) {
      return;
    }

    this.db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.name, user.email, user.phone, user.passwordHash, role, status, new Date().toISOString());
  }

  async findUserByEmail(email) {
    return mapUser(this.db.prepare(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE email = ?
    `).get(email));
  }

  async findUserById(id) {
    return mapUser(this.db.prepare(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE id = ?
    `).get(id));
  }

  async createUser({ name, email, phone, passwordHash, role, status }) {
    const result = this.db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, phone, passwordHash, role, status, new Date().toISOString());

    return this.findUserById(result.lastInsertRowid);
  }

  async createOrder(order) {
    this.db.prepare(`
      INSERT INTO orders (
        user_id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
        delivery_type, address, delivery_date, delivery_time, note, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.userId,
      order.customerName,
      order.email,
      order.phone,
      order.productId,
      order.productName,
      order.quantity,
      order.unitPrice,
      order.totalPrice,
      order.deliveryType,
      order.address,
      order.deliveryDate,
      order.deliveryTime,
      order.note,
      new Date().toISOString()
    );
  }

  async listOrdersByUser(userId) {
    return this.db.prepare(`
      SELECT id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
             delivery_type, address, delivery_date, delivery_time, note, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `).all(userId).map(mapOrder);
  }

  async listOrders() {
    return this.db.prepare(`
      SELECT id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
             delivery_type, address, delivery_date, delivery_time, note, created_at
      FROM orders
      ORDER BY datetime(created_at) DESC, id DESC
    `).all().map(mapOrder);
  }

  async clearOrders() {
    this.db.prepare("DELETE FROM orders").run();
  }

  async listPendingUsers() {
    return this.db.prepare(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE role = 'customer' AND status = 'pending'
      ORDER BY datetime(created_at) DESC, id DESC
    `).all().map(mapUser);
  }

  async updateUserStatus(id, status) {
    const result = this.db.prepare(`
      UPDATE users
      SET status = ?
      WHERE id = ? AND role = 'customer'
    `).run(status, id);

    return result.changes > 0;
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    deliveryType: row.delivery_type,
    address: row.address,
    deliveryDate: row.delivery_date,
    deliveryTime: row.delivery_time,
    note: row.note,
    createdAt: row.created_at
  };
}

module.exports = { SqliteDatabase };
