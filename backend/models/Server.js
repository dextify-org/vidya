import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

const Server = sequelize.define("Server", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isFirstStartUp: { type: DataTypes.BOOLEAN, defaultValue: true },
  scanIntervalHours: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastScanAt: { type: DataTypes.DATE, allowNull: true },
});

export default Server;
