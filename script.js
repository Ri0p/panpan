const TOKEN_KEY = "panpan-auth-token";

const menuGrid = document.getElementById("menu-grid");
const productSelect = document.querySelector('select[name="productId"]');
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");
const orderForm = document.getElementById("order-form");
const orderMessage = document.getElementById("order-message");
const sessionBadge = document.getElementById("session-badge");
const logoutBtn = document.getElementById("logout-btn");
const userOrdersBody = document.getElementById("user-orders-body");
const userOrdersCaption = document.getElementById("user-orders-caption");
const adminPanel = document.getElementById("admin-panel");
const adminOrdersBody = document.getElementById("admin-orders-body");
const pendingUsersBody = document.getElementById("pending-users-body");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const orderSubmitBtn = document.getElementById("order-submit-btn");
const passwordToggles = document.querySelectorAll(".password-toggle");

let products = [];
let sessionUser = null;
let userOrders = [];
let adminOrders = [];
let pendingUsers = [];

bootstrap().catch(() => {
  showMessage(authMessage, "Не успеав да ја вчитам апликацијата.", "error");
});

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(authMessage);

  const formData = new FormData(loginForm);

  try {
    const response = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: String(formData.get("email")).trim(),
        password: String(formData.get("password"))
      })
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    loginForm.reset();
    await refreshSession();
    await refreshData();
    renderApp();
    showMessage(authMessage, `Успешно се најавивте како ${response.user.name}.`, "success");
  } catch (error) {
    showMessage(authMessage, error.message, "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(authMessage);

  const formData = new FormData(registerForm);

  try {
    const response = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name")).trim(),
        email: String(formData.get("email")).trim(),
        phone: String(formData.get("phone")).trim(),
        password: String(formData.get("password"))
      })
    });

    registerForm.reset();
    setAuthMode("login");
    showMessage(authMessage, response.message, "success");
  } catch (error) {
    showMessage(authMessage, error.message, "error");
  }
});

logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionUser = null;
  userOrders = [];
  adminOrders = [];
  pendingUsers = [];
  renderApp();
  showMessage(authMessage, "Успешно се одјавивте.", "success");
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(orderMessage);

  if (!sessionUser) {
    showMessage(orderMessage, "Најавете се за да направите нарачка.", "error");
    return;
  }

  const formData = new FormData(orderForm);

  try {
    const response = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        productId: String(formData.get("productId")),
        quantity: Number(formData.get("quantity")),
        deliveryType: String(formData.get("deliveryType")),
        address: String(formData.get("address")).trim(),
        deliveryDate: String(formData.get("deliveryDate")),
        deliveryTime: String(formData.get("deliveryTime")),
        note: String(formData.get("note") || "").trim()
      })
    });

    orderForm.reset();
    setDefaultDateTime();
    await refreshData();
    renderApp();
    showMessage(orderMessage, response.message, "success");
  } catch (error) {
    showMessage(orderMessage, error.message, "error");
  }
});

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    if (!adminOrders.length) {
      showMessage(orderMessage, "Нема нарачки за export.", "error");
      return;
    }

    const csvRows = [
      ["Креирано", "Клиент", "Email", "Телефон", "Производ", "Количина", "Тип", "Адреса", "Датум", "Време", "Вкупно", "Забелешка"],
      ...adminOrders.map((order) => [
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
        Number(order.totalPrice).toFixed(2),
        order.note
      ])
    ];

    downloadCsv(csvRows, `panpan-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", async () => {
    if (!adminOrders.length) {
      return;
    }

    const confirmed = window.confirm("Дали сакате да ги избришете сите нарачки?");
    if (!confirmed) {
      return;
    }

    try {
      await api("/api/admin/orders", { method: "DELETE" });
      await refreshData();
      renderApp();
    } catch (error) {
      showMessage(orderMessage, error.message, "error");
    }
  });
}

if (pendingUsersBody) {
  pendingUsersBody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const userId = target.dataset.userId;
    const action = target.dataset.action;
    if (!userId || !action) {
      return;
    }

    try {
      await api(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      await refreshData();
      renderApp();
    } catch (error) {
      showMessage(orderMessage, error.message, "error");
    }
  });
}

passwordToggles.forEach((toggleButton) => {
  toggleButton.addEventListener("click", () => {
    const wrapper = toggleButton.closest(".password-field");
    const input = wrapper ? wrapper.querySelector("input") : null;
    if (!input) {
      return;
    }

    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    toggleButton.textContent = shouldShow ? "Сокриј" : "Покажи";
  });
});

async function bootstrap() {
  setAuthMode("login");
  setDefaultDateTime();
  await loadProducts();
  await refreshSession();
  await refreshData();
  renderApp();
}

async function loadProducts() {
  const response = await api("/api/products", { auth: false });
  products = response.products || [];
  renderMenu();
  fillProductOptions();
}

async function refreshSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    sessionUser = null;
    return;
  }

  try {
    const response = await api("/api/auth/me");
    sessionUser = response.user;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    sessionUser = null;
  }
}

async function refreshData() {
  if (!sessionUser) {
    userOrders = [];
    adminOrders = [];
    pendingUsers = [];
    return;
  }

  const myOrdersResponse = await api("/api/orders/my");
  userOrders = myOrdersResponse.orders || [];

  if (sessionUser.role === "admin") {
    const [adminOrdersResponse, pendingUsersResponse] = await Promise.all([
      api("/api/admin/orders"),
      api("/api/admin/pending-users")
    ]);
    adminOrders = adminOrdersResponse.orders || [];
    pendingUsers = pendingUsersResponse.users || [];
  } else {
    adminOrders = [];
    pendingUsers = [];
  }
}

function renderApp() {
  updateSessionBadge();
  toggleOrderState();
  renderUserOrders();
  renderAdminOrders();
}

function renderMenu() {
  menuGrid.innerHTML = products
    .map((product) => `
      <article class="menu-card">
        <p class="section-label">Pan Pan</p>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <span class="price-tag">${product.price} ден</span>
      </article>
    `)
    .join("");
}

function fillProductOptions() {
  productSelect.innerHTML = products
    .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} - ${product.price} ден</option>`)
    .join("");
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  clearMessage(authMessage);
}

function toggleOrderState() {
  const isLoggedIn = Boolean(sessionUser);
  Array.from(orderForm.elements).forEach((element) => {
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.disabled = !isLoggedIn;
    }
  });

  orderSubmitBtn.textContent = isLoggedIn ? "Испрати нарачка" : "Најавете се за нарачка";
}

function renderUserOrders() {
  if (!sessionUser) {
    userOrdersCaption.textContent = "Најавете се за да ги видите вашите нарачки.";
    userOrdersBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Нема активна корисничка сесија.</td>
      </tr>
    `;
    return;
  }

  userOrdersCaption.textContent = `${sessionUser.name} има ${userOrders.length} нарачки.`;

  if (!userOrders.length) {
    userOrdersBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Сè уште немате нарачки.</td>
      </tr>
    `;
    return;
  }

  userOrdersBody.innerHTML = userOrders
    .map((order) => `
      <tr>
        <td>${escapeHtml(formatDateTime(order.createdAt))}</td>
        <td>${escapeHtml(order.productName)}</td>
        <td>${order.quantity}</td>
        <td>${order.deliveryType === "delivery" ? "Достава" : "Подигање"}</td>
        <td>${escapeHtml(order.address)}</td>
        <td>${escapeHtml(`${order.deliveryDate} ${order.deliveryTime}`)}</td>
        <td>${Number(order.totalPrice).toFixed(2)} ден</td>
      </tr>
    `)
    .join("");
}

function renderAdminOrders() {
  const isAdmin = sessionUser && sessionUser.role === "admin";
  adminPanel.classList.toggle("hidden", !isAdmin);

  if (!isAdmin) {
    return;
  }

  if (!adminOrders.length) {
    adminOrdersBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="11">Нема нарачки.</td>
      </tr>
    `;
  } else {
    adminOrdersBody.innerHTML = adminOrders
      .map((order) => `
        <tr>
          <td>${escapeHtml(formatDateTime(order.createdAt))}</td>
          <td>${escapeHtml(order.customerName)}</td>
          <td>${escapeHtml(order.email)}</td>
          <td>${escapeHtml(order.phone)}</td>
          <td>${escapeHtml(order.productName)}</td>
          <td>${order.quantity}</td>
          <td>${order.deliveryType === "delivery" ? "Достава" : "Подигање"}</td>
          <td>${escapeHtml(order.address)}</td>
          <td>${escapeHtml(`${order.deliveryDate} ${order.deliveryTime}`)}</td>
          <td>${Number(order.totalPrice).toFixed(2)} ден</td>
          <td>${escapeHtml(order.note)}</td>
        </tr>
      `)
      .join("");
  }

  renderPendingUsers();
}

function renderPendingUsers() {
  if (!pendingUsers.length) {
    pendingUsersBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Нема нови барања.</td>
      </tr>
    `;
    return;
  }

  pendingUsersBody.innerHTML = pendingUsers
    .map((user) => `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.phone)}</td>
        <td>${escapeHtml(user.status)}</td>
        <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
        <td>
          <div class="inline-actions">
            <button class="mini-btn approve" type="button" data-action="approve" data-user-id="${user.id}">Одобри</button>
            <button class="mini-btn reject" type="button" data-action="reject" data-user-id="${user.id}">Одбиј</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function updateSessionBadge() {
  if (!sessionUser) {
    sessionBadge.textContent = "Не сте најавени";
    logoutBtn.classList.add("hidden");
    return;
  }

  const roleLabel = sessionUser.role === "admin" ? "Admin" : "Клиент";
  sessionBadge.textContent = `${sessionUser.name} · ${roleLabel}`;
  logoutBtn.classList.remove("hidden");
}

function setDefaultDateTime() {
  const dateInput = orderForm.elements.deliveryDate;
  const timeInput = orderForm.elements.deliveryTime;
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  dateInput.value = localDate.toISOString().slice(0, 10);

  const hour = String(Math.min(now.getHours() + 1, 23)).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  timeInput.value = `${hour}:${minutes}`;
}

async function api(url, options = {}) {
  const { auth = true, headers = {}, ...rest } = options;
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Се појави грешка.");
  }

  return data;
}

function formatDateTime(isoValue) {
  return new Date(isoValue).toLocaleString("mk-MK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

function clearMessage(element) {
  element.textContent = "";
  element.classList.remove("error", "success");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
