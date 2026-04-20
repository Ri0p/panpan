const { Pool } = require("pg");

class PostgresDatabase {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
    });
    this.mode = "postgres";
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'customer')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        delivery_type TEXT NOT NULL,
        address TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_time TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async seedDefaults({ admin, demo }) {
    await this.seedUser(admin, "admin", "approved");
    await this.seedUser(demo, "customer", "approved");
  }

  async seedUser(user, role, status) {
    const existing = await this.findUserByEmail(user.email);
    if (existing) {
      return;
    }

    await this.pool.query(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [user.name, user.email, user.phone, user.passwordHash, role, status]);
  }

  async findUserByEmail(email) {
    const result = await this.pool.query(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE email = $1
    `, [email]);

    return mapUser(result.rows[0]);
  }

  async findUserById(id) {
    const result = await this.pool.query(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE id = $1
    `, [id]);

    return mapUser(result.rows[0]);
  }

  async createUser({ name, email, phone, passwordHash, role, status }) {
    const result = await this.pool.query(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, password_hash, role, status, created_at
    `, [name, email, phone, passwordHash, role, status]);

    return mapUser(result.rows[0]);
  }

  async createOrder(order) {
    await this.pool.query(`
      INSERT INTO orders (
        user_id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
        delivery_type, address, delivery_date, delivery_time, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
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
      order.note
    ]);
  }

  async listOrdersByUser(userId) {
    const result = await this.pool.query(`
      SELECT id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
             delivery_type, address, delivery_date, delivery_time, note, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `, [userId]);

    return result.rows.map(mapOrder);
  }

  async listOrders() {
    const result = await this.pool.query(`
      SELECT id, customer_name, email, phone, product_id, product_name, quantity, unit_price, total_price,
             delivery_type, address, delivery_date, delivery_time, note, created_at
      FROM orders
      ORDER BY created_at DESC, id DESC
    `);

    return result.rows.map(mapOrder);
  }

  async clearOrders() {
    await this.pool.query("DELETE FROM orders");
  }

  async listPendingUsers() {
    const result = await this.pool.query(`
      SELECT id, name, email, phone, password_hash, role, status, created_at
      FROM users
      WHERE role = 'customer' AND status = 'pending'
      ORDER BY created_at DESC, id DESC
    `);

    return result.rows.map(mapUser);
  }

  async updateUserStatus(id, status) {
    const result = await this.pool.query(`
      UPDATE users
      SET status = $1
      WHERE id = $2 AND role = 'customer'
    `, [status, id]);

    return result.rowCount > 0;
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function mapOrder(row) {
  return {
    id: Number(row.id),
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    deliveryType: row.delivery_type,
    address: row.address,
    deliveryDate: row.delivery_date,
    deliveryTime: row.delivery_time,
    note: row.note,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

module.exports = { PostgresDatabase };
