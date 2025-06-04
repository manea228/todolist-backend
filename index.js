const express = require("express");
const fs = require("fs");
const multer = require("multer");
const app = express();
const http = require("http").createServer(app);
require("./utils/sql.js")
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const {
  registerValidation,
  loginValidation,
  postCreateValidation,
  getInterestingValidation,
  setInterestingValidation,

} = require("./validations.js");
const { handleValidationErrors, checkAuth } = require("./utils/index.js");
const {
  UserController,
  PostController,
} = require("./controllers/index.js");
const { setInteresting, getInteresting } = require("./utils/sql.js");
const { get } = require("http");

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads");
  },
  filename: (_, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Изоображения
app.use("/uploads", express.static("uploads"));
app.post("/upload", checkAuth, upload.single("image"), (req, res) => {
  res.json({
    url: `/uploads/${req.file.originalname}`,
  });
});
// Auth
app.post('/auth/login', loginValidation, handleValidationErrors, UserController.login);
app.post('/auth/register', registerValidation, handleValidationErrors, UserController.register);
app.get('/auth/me', checkAuth, UserController.getMe);

//Post
app.post("/posts/create",  checkAuth, postCreateValidation, handleValidationErrors, PostController.create);
app.get("/posts/get", checkAuth, PostController.get);
app.get("/posts/get/:id", checkAuth, PostController.getOne);
app.patch("/posts/update/:id", checkAuth, PostController.update);
app.delete("/posts/remove/:id", checkAuth, PostController.remove);


// logic
app.get("/interesting/get", checkAuth, getInterestingValidation, handleValidationErrors, UserController.getDataInteresting);
app.post("/interesting/set", checkAuth, setInterestingValidation, handleValidationErrors, UserController.setDataInteresting);
app.get("/interesting/get/:id", checkAuth, UserController.getDataInterestingbyId);
app.delete("/interesting/remove/:id", checkAuth, UserController.removeDataInterestingbyId);
app.patch("/interesting/update/:id", checkAuth, UserController.updateDataInterestingbyId);

http.listen(4444, (err) => {
  if (err) return console.log(err);
  console.log("Сервер запущен успешно");
});
