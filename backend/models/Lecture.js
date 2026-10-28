import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Lecture = sequelize.define("Lecture", {
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
  type: DataTypes.STRING,
  path: DataTypes.STRING,
  content: DataTypes.JSON,
  subtitles: DataTypes.JSON,
  duration: DataTypes.FLOAT,
});

export default Lecture;
