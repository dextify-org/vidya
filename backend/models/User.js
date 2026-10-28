import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";
import { createPasswordRecord } from "../security/password.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "username can't be empty",
        },
      },
    },
    password: {
      type: DataTypes.STRING(1024),
      allowNull: false,
      set(value) {
        const record = createPasswordRecord(value);
        this.setDataValue("salt", record.salt);
        this.setDataValue("password", record.password);
      },
      validate: {
        notEmpty: {
          msg: "password can't be empty",
        },
      },
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
    featuredCourse: DataTypes.UUIDV4,
    deflang: DataTypes.STRING,
  },
  {
    defaultScope: {
      attributes: { exclude: ["password", "salt"] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ["password", "salt"] },
      },
    },
  },
);

export default User;
