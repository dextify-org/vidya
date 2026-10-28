import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

const Course = sequelize.define("Course", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  originalName: DataTypes.STRING,
  cleanedName: DataTypes.STRING,
  directory: DataTypes.STRING,
  sourceId: DataTypes.STRING,
  description: DataTypes.TEXT,
  photo: DataTypes.STRING,
  duration: DataTypes.FLOAT,
});

export default Course;
