import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Section = sequelize.define("Section", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  originalName: DataTypes.STRING,
  cleanedName: DataTypes.STRING,
  sourceId: DataTypes.STRING,
  order: DataTypes.FLOAT,
  duration: DataTypes.FLOAT,
});

export default Section;
