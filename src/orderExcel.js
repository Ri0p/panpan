const fs = require("fs/promises");
const path = require("path");

const headers = [
  "Created at",
  "Customer",
  "Email",
  "Phone",
  "Product",
  "Quantity",
  "Delivery type",
  "Address",
  "Delivery date",
  "Delivery time",
  "Total",
  "Note"
];

async function syncOrdersCsv(db, filePath) {
  const orders = await db.listOrders();
  const rows = orders.map((order) => [
    formatDateTime(order.createdAt),
    order.customerName,
    order.email,
    order.phone,
    order.productName,
    order.quantity,
    order.deliveryType === "delivery" ? "Delivery" : "Pickup",
    order.address,
    order.deliveryDate,
    order.deliveryTime,
    Number(order.totalPrice).toFixed(2),
    order.note
  ]);

  await writeCsv(filePath, [headers, ...rows]);
}

async function writeCsv(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const csv = [
    "sep=,",
    ...rows.map((row) => row.map(escapeCsvValue).join(","))
  ].join("\r\n");

  await fs.writeFile(filePath, `\uFEFF${csv}\r\n`, "utf8");
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

module.exports = { syncOrdersCsv };
