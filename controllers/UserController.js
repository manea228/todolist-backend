const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { setUser, getUserById, getUserByEmail } = require("../utils/sql.js");
const { v4: uuidv4 } = require('uuid');
const register = async (req, res) => {
  try {
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    getUserByEmail(req.body.email, (err, suser) => {
      if (err) {
        const id = uuidv4();
        const doc = {
          id: id,
          email: req.body.email,
          name: req.body.name,
          token: hash,
        };

        setUser(doc, (err, user) => {
          if (err) {
            console.error("Ошибка:", err);
          } else {
            const newToken = jwt.sign(
              {
                id: user.id,
              },
              proccess.env.key,
              {
                expiresIn: "30d",
              }
            );

            const { token, ...userData } = user;
            res.json({
              ...userData,
              newToken,
            });
          }
        });
      } else {
        return res.status(409).json({ error: "Уже зарегестрирован" });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось зарегистрироваться",
    });
  }
};

const login = async (req, res) => {
  try {
    getUserByEmail(req.body.email, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        const newToken = jwt.sign(
          {
            id: user.id,
          },
          process.env.key,
          {
            expiresIn: "30d",
          }
        );
        const isValidPass = await bcrypt.compare(req.body.password, user.token);

        if (!isValidPass) {
          return res.status(400).json({
            msg: "Неверный логин или пароль",
          });
        }
        const { token, ...userData } = user;
        res.json({
          ...userData,
          newToken,
        });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось авторизоваться",
    });
  }
};

const getMe = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        const { token, ...userData } = user;
        res.json(userData);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Нет доступа",
    });
  }
};

module.exports = { register, login, getMe };
