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
  scanTrigger: { type: DataTypes.STRING, defaultValue: "disabled" },
  scanIntervalValue: { type: DataTypes.INTEGER, defaultValue: 0 },
  scanIntervalUnit: { type: DataTypes.STRING, defaultValue: "hours" },
  scanTime: { type: DataTypes.STRING, defaultValue: "02:00" },
  scanDays: { type: DataTypes.JSON, defaultValue: [] },
  lastScanAt: { type: DataTypes.DATE, allowNull: true },
});

export default Server;
