const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    required: false,
  },
  history: {
    type: Array,
    required: true,
  },
  saves: {
    type: Array,
    required: true,
  },
  resetCode: {
    type: String,
    required: false,
  },
});

UserSchema.pre("save", async function (next) {
  if (this.password) {
    const hash = await bcrypt.hash(this.password, 10);

    this.password = hash;
  }
  next();
});

UserSchema.methods.isValidPassword = async function (password) {
  const compare = await bcrypt.compare(password, this.password);

  return compare;
};

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
