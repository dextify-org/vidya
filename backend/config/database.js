import { Sequelize } from "sequelize";
import { DB_PATH } from "./path.js";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_PATH,
  retry: {
    match: [/SQLITE_BUSY/],
    max: 5,
    backoffBase: 200,
  },
  logging: false,
});

sequelize.addHook("afterConnect", async (connection) => {
  await new Promise((resolve, reject) => {
    connection.run("PRAGMA busy_timeout = 5000", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

export default sequelize;
