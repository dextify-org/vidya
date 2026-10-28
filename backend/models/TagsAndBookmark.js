import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

const TagsAndBookmark = sequelize.define(
  "TagsAndBookmark",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    type: DataTypes.STRING,
    lectureId: { type: DataTypes.UUID, allowNull: false },
    courseId: DataTypes.UUID,
    courseName: DataTypes.STRING,
    name: DataTypes.STRING,
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["UserId", "lectureId", "type"],
      },
    ],
  }
);

export default TagsAndBookmark;
