# Pan Pan Website Roadmap

## Goal

Build a production-ready ordering website for Pan Pan that looks like a polished public bakery website, while giving approved clients a private ordering flow and giving the bakery team a reliable admin and Excel workflow.

Private company files, recipes, production sheets, exported orders, databases, and `.env` files must never be committed to GitHub.

## Current State

- Public homepage, menu, about, and contact sections exist.
- Login and registration are separated from the first page.
- Orders are separated into a private orders view.
- Admin can view orders and download an Excel workbook.
- Web orders are written into a generated Excel workbook in the `ВЕБ НАРАЧКИ` sheet.
- Excel files and the local database are ignored by Git.
- Project is pushed to GitHub at `https://github.com/Ri0p/panpan`.

## Phase 1: Finalize Public Website

Why: clients should first see a clean, trustworthy bakery website, not an internal ordering tool.

Tasks:
- Replace demo-like text with final Pan Pan copy.
- Add real photos for hero, bakery, products, and contact section.
- Make the first page feel like the original brand website.
- Keep only simple public navigation: home, about, menu, contact.
- Keep `Најави се / Регистрирај се` as the only private entry point.
- Review mobile layout on phone-size screens.

Done when:
- The first page can be shown to a real customer without explaining that it is a demo.

## Phase 2: Define Real Client Ordering Flow

Why: the order form must match how the bakery actually accepts orders.

Tasks:
- Decide whether clients are B2B only, public customers, or both.
- Decide whether every user must be approved by admin before ordering.
- Define exact order fields:
  - product
  - quantity
  - delivery or pickup
  - delivery date
  - delivery time
  - address
  - note
  - optional company/client code
- Add order statuses:
  - new
  - accepted
  - in production
  - delivered/picked up
  - cancelled
- Decide cutoff rules, for example no same-day orders after a specific hour.
- Decide minimum quantities for wholesale clients if needed.

Done when:
- The bakery team agrees that a submitted order contains everything they need.

## Phase 3: Improve Admin Panel

Why: the main bakery user needs a practical daily workspace, not just a raw table.

Tasks:
- Add order filters by date, client, status, product, delivery type.
- Add status update buttons.
- Add one-order detail view.
- Add export buttons for today, tomorrow, and selected date range.
- Add archive instead of permanent delete.
- Add customer approval/rejection notes.
- Add client list management.

Done when:
- The admin can run the daily order workflow from the website without editing the database manually.

## Phase 4: Excel Integration With Real Workbook

Why: Pan Pan already uses a detailed workbook; the website should support that process, not fight it.

Tasks:
- Keep the private Excel workbook out of GitHub.
- Continue using `data/orders-template.xlsx` as local/private template.
- Keep generated workbook at `data/orders.xlsx`.
- Confirm which sheets should receive web order data:
  - `ВЕБ НАРАЧКИ`
  - `НАРАЧКИ ДЕНЕС`
  - `НАРАЧКИ УТРЕ`
  - possibly client/product summary sheets
- Map website product names to workbook product columns.
- Map delivery date to today/tomorrow sheets.
- Preserve formulas and formatting where possible.
- Add validation tests for generated Excel files.

Done when:
- A real web order appears in the workbook exactly where the bakery team expects it.

## Phase 5: Notifications

Why: orders are only useful if the bakery sees them immediately.

Tasks:
- Add email notification to admin when a new order is submitted.
- Add confirmation email to client.
- Add optional email for account approval/rejection.
- Consider WhatsApp/Viber notification later if the bakery prefers it.
- Store email provider credentials in `.env`, never GitHub.

Done when:
- A submitted order creates both database record and useful notification.

## Phase 6: Security And Production Readiness

Why: real clients and private company data need a safer setup than local demo defaults.

Tasks:
- Replace default `JWT_SECRET`.
- Remove or disable demo credentials in production.
- Use HTTPS.
- Configure production CORS.
- Add rate limiting for login/register endpoints.
- Strengthen password requirements.
- Make admin role assignment safe.
- Add backups for database and generated Excel files.
- Review all `.gitignore` rules before deployment.

Done when:
- The app can safely handle real accounts and private order data.

## Phase 7: Production Database And Hosting

Why: the site must be online and reliable, not tied to one local computer.

Tasks:
- Choose hosting: Render, Railway, VPS, or another provider.
- Use PostgreSQL for production.
- Set environment variables:
  - `PORT`
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `PGSSLMODE`
  - `CLIENT_ORIGIN`
  - email provider settings
  - optional `EXCEL_TEMPLATE_PATH`
- Upload private Excel template through a secure server path, not GitHub.
- Set domain and HTTPS.

Done when:
- The website is reachable from a real domain and uses a production database.

## Phase 8: Testing

Why: the final system touches customers, admin workflow, database, and Excel, so regressions are easy to miss.

Tasks:
- Test registration.
- Test admin approval.
- Test login/logout.
- Test order submission.
- Test order history.
- Test admin order table.
- Test Excel download.
- Test generated workbook opens in Excel.
- Test mobile layout.
- Test wrong passwords and invalid data.
- Test production deployment.

Done when:
- A full customer-to-admin-to-Excel workflow succeeds without manual fixes.

## Phase 9: Launch Checklist

Tasks:
- Final public text approved.
- Final product list approved.
- Admin account created.
- Demo accounts removed or disabled.
- Production database active.
- Private Excel template uploaded privately.
- Email notifications active.
- Domain connected.
- HTTPS active.
- Backup plan documented.
- Bakery team trained on login, approval, orders, and Excel export.

Done when:
- Pan Pan can give the website to real clients and process real orders.

## Privacy Rules

- Do not commit `.env`.
- Do not commit `data/*.xlsx`.
- Do not commit `data/*.csv`.
- Do not commit `data/*.db`.
- Do not commit recipes, supplier sheets, production sheets, or client-sensitive exports.
- Keep only code and safe documentation on GitHub.

