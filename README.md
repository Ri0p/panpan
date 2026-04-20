# Pan Pan

Bakery ordering app with admin approval and backend API.

## Features

- customer registration with admin approval
- secure login with hashed passwords
- customer order history
- admin order dashboard
- CSV export for Excel
- SQLite for local use
- PostgreSQL-ready for deployment

## Local Run

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Open `http://localhost:3000`.

## Default Accounts

- Admin: `admin@panpan.mk` / `panpan123`
- Demo client: `demo@panpan.mk` / `demo123`

## Environment Variables

- `PORT`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `PGSSLMODE`

When `DATABASE_URL` is empty, the app uses SQLite at `data/panpan.db`.
When `DATABASE_URL` is set, the app uses PostgreSQL.

## Deploy

### Render

Build command:

```text
npm install
```

Start command:

```text
npm start
```

Environment variables:

```text
JWT_SECRET=your-secret
CLIENT_ORIGIN=https://your-domain.com
DATABASE_URL=your-postgres-url
PGSSLMODE=require
```

### Railway

Use the same commands and variables as above, with a Railway PostgreSQL database.

## Next Backend Step

After deployment, the next big feature is Excel integration from the saved orders in the database.
