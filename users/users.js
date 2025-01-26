const mongoose = require("mongoose");
const express = require("express");
const UsersSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

let Users = mongoose.model("Users", UsersSchema);

class UsersController {
  async getAllUsers(req, res) {
    try {
      let all = await Users.find();
      res.json(all);
    } catch (err) {
      res.json({ message: err });
    }
  }
  async addUser(req, res) {
    try {
      let newUser = new Users({
        name: req.body.name,
      });
      await newUser.save();
      res.json(newUser);
    } catch (err) {
      res.json({ message: err.message });
    }
  }
  async deleteUser(req, res) {
    try {
      let id = req.params.id;
      let deletedUser = await Users.findByIdAndDelete(id);
      res.json(deletedUser);
    } catch (err) {
      res.status(404).json({
        message: "User not found",
      });
    }
  }
  async getSingleUser(req, res) {
    try {
      const user = await Users.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({
        message: "Server error",
      });
    }
  }

  async updateUser(req, res) {
    try {
      let obj = {};
      if (req.body.name) obj.name = req.body.name;
      let updatedCat = await Users.findByIdAndUpdate(req.params.id, obj, {
        new: true,
      });
      res.json(updatedCat);
    } catch (err) {
      res.status(404).json({
        message: "User not found",
      });
    }
  }
}
const UserController = new UsersController();

const router = express.Router();
router.get("/", UserController.getAllUsers);
router.post("/", UserController.addUser);
router.delete("/:id", UserController.deleteUser);
router.put("/:id", UserController.updateUser);
router.get("/:id", UserController.getSingleUser);

module.exports = router;
