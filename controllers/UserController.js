const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const {
  setUser,
  getUserById,
  getUserByEmail,
  getInteresting,
  setInteresting,
  getInterestingById,
  deleteInterestingById,
  updateInterestingById
} = require("../utils/sql.js");
const { v4: uuidv4 } = require("uuid");
const { get } = require("http");
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
              process.env.key,
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

const getDataInteresting = async (req, res) => {
  try {
    const password = req.body.password;
    const key = crypto.createHash("sha256").update(password).digest();
    getInteresting(req.userId, key, (err, decrypted) => {
      if (err) {
        console.error("❌ ошибка при расшифровке интересов:", err);
        return res.status(400).json({ error: "Ошибка расшифровки" });
      }
      res.json(decrypted);
    });
  } catch (err) {
    console.log(err);
    return res.status(409).json({ error: "Нет доступа" });
  }
};

const getDataInterestingbyId = async (req, res) => {
  try {
    const password = req.body.password;
    const id = req.params.id;
    const key = crypto.createHash("sha256").update(password).digest();
    getInterestingById(req.userId, id, key, (err, decrypted) => {
      if (err) {
        console.error("❌ ошибка при расшифровке интересов:", err);
        return res.status(400).json({ error: "Ошибка расшифровки" });
      }
      res.json(decrypted);
    });
  } catch (err) {
    console.log(err);
    return res.status(409).json({ error: "Нет доступа" });
  }
};

const updateDataInterestingbyId = async (req, res) => {
  try {
    const password = req.body.password;
    const updates = req.body.updates;
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash("sha256").update(password).digest();
    updateInterestingById(req.userId, req.params.id,updates, key, iv, (err, result) => {
      if (err) {
        console.error("❌ ошибка при обновлении интересов:", err);
        return res.status(400).json({ error: "Ошибка обновления" });
      }
      res.json({ message: "Интерес успешно обновлен", data: result });
    });
  } catch (err) {
    console.log(err);
    return res.status(409).json({ error: "Нет доступа" });
  }
};


const removeDataInterestingbyId = async (req, res) => {
  try {
    const password = req.body.password;
    const id = req.params.id;
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash("sha256").update(password).digest();
    deleteInterestingById(req.userId, id, key, iv, (err, result) => {
      if (err) {
        console.error("❌ ошибка при удалении интересов:", err);
        return res.status(400).json({ error: "Ошибка удаления" });
      }
      res.json({ message: "Интерес успешно удален", data: result });
    });
  } catch (err) {
    console.log(err);
    return res.status(409).json({ error: "Нет доступа" });
  }
};



const setDataInteresting = async (req, res) => {
  try {
    const password = req.body.password;
    const key = crypto.createHash("sha256").update(password).digest();
    const interests = req.body.interests;
    const iv = crypto.randomBytes(16);
    setInteresting(
      req.userId,
      interests,
      key,
      iv,
      (err, savedData) => {
        if (err) return res.status(400).json({ error: "Ошибка расшифровки" });

        getInteresting(
          req.userId,
          key,
          (err, decrypted) => {
            if (err)
              return res.status(400).json({ error: "Ошибка расшифровки" });

            res.json({
              message: "🔒 Интересы успешно сохранены.",
              data: decrypted,
            });
          }
        );
      }
    );
  } catch (err) {
    console.log(err);
    return res.status(409).json({ error: "Нет доступа" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getDataInteresting,
  setDataInteresting,
  getDataInterestingbyId,
  updateDataInterestingbyId,
  removeDataInterestingbyId
};
