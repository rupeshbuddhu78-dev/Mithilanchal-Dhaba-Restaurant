import { describe, expect, it } from "vitest";
import { getDatabaseConnectionOptions } from "./db";

describe("getDatabaseConnectionOptions", () => {
  it("parses a secure TiDB-style MySQL URL into TLS pool settings", () => {
    const options = getDatabaseConnectionOptions(
      "mysql://restaurant_user:secret%40value@gateway01.example.tidbcloud.com:4000/restaurant_db",
      true,
    );

    expect(options).toMatchObject({
      host: "gateway01.example.tidbcloud.com",
      port: 4000,
      user: "restaurant_user",
      password: "secret@value",
      database: "restaurant_db",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("keeps standard MySQL connections non-TLS when explicitly configured", () => {
    const options = getDatabaseConnectionOptions("mysql://user:pass@localhost/restaurant", false);

    expect(options.port).toBe(3306);
    expect(options.ssl).toBeUndefined();
  });

  it("rejects a connection URL with no database name", () => {
    expect(() => getDatabaseConnectionOptions("mysql://user:pass@localhost", true)).toThrow(
      "DATABASE_URL must include a database name",
    );
  });
});
