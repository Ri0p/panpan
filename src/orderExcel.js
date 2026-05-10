const fs = require("fs/promises");
const path = require("path");
const ExcelJS = require("exceljs");

const csvHeaders = [
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

const excelHeaders = [
  "Креирано",
  "Клиент",
  "Email",
  "Телефон",
  "Производ",
  "Количина",
  "Тип",
  "Адреса",
  "Датум",
  "Време",
  "Вкупно",
  "Забелешка"
];

async function syncOrderExports(db, paths) {
  const orders = await db.listOrders();
  await Promise.all([
    writeOrdersCsv(paths.csvPath, orders),
    writeOrdersWorkbook(paths, orders)
  ]);
}

async function writeOrdersCsv(filePath, orders) {
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

  await writeCsv(filePath, [csvHeaders, ...rows]);
}

async function writeOrdersWorkbook({ templatePath, xlsxPath }, orders) {
  await fs.mkdir(path.dirname(xlsxPath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  if (await fileExists(templatePath)) {
    await workbook.xlsx.readFile(templatePath);
  }

  const existingSheet = workbook.getWorksheet("ВЕБ НАРАЧКИ");
  if (existingSheet) {
    workbook.removeWorksheet(existingSheet.id);
  }

  const sheet = workbook.addWorksheet("ВЕБ НАРАЧКИ");
  sheet.addRow(excelHeaders);

  for (const order of orders) {
    sheet.addRow([
      formatDateTime(order.createdAt),
      order.customerName,
      order.email,
      order.phone,
      order.productName,
      order.quantity,
      order.deliveryType === "delivery" ? "Достава" : "Подигање",
      order.address,
      order.deliveryDate,
      order.deliveryTime,
      Number(order.totalPrice),
      order.note
    ]);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [
    { width: 22 },
    { width: 24 },
    { width: 28 },
    { width: 16 },
    { width: 26 },
    { width: 10 },
    { width: 14 },
    { width: 32 },
    { width: 14 },
    { width: 10 },
    { width: 12, style: { numFmt: "#,##0.00" } },
    { width: 34 }
  ];

  await workbook.xlsx.writeFile(xlsxPath);
}

async function writeCsv(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const csv = [
    "sep=,",
    ...rows.map((row) => row.map(escapeCsvValue).join(","))
  ].join("\r\n");

  await fs.writeFile(filePath, `\uFEFF${csv}\r\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

module.exports = { syncOrderExports };
