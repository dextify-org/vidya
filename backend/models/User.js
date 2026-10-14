import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";
import crypto from "crypto";

const User = sequelize.define("User", {
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
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto
        .pbkdf2Sync(value, salt, 1000, 64, "sha512")
        .toString("hex");

      this.setDataValue("salt", salt);
      this.setDataValue("password", hash);
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
  oidcSub: {
    type: DataTypes.STRING,
    unique: true,
  },
});

export default User;
