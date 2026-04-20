const { SqliteDatabase } = require("./sqlite");
const { PostgresDatabase } = require("./postgres");

function createDatabase({ databaseUrl, sqlitePath }) {
  if (databaseUrl) {
    return new PostgresDatabase(databaseUrl);
  }

  return new SqliteDatabase(sqlitePath);
}

module.exports = { createDatabase };
