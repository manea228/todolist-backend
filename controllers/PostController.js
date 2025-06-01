const {
  setPost,
  getPostById,
  getUserById,
  getPostsByUserId,
  editPostById,
  deletePostById
} = require("../utils/sql.js");

const get = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        getPostsByUserId(req.userId, (err, posts) => {
          if (err) return console.error(err);
          res.json(posts);
        });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось получить статью",
    });
  }
};

const getOne = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        getPostById(req.userId, req.params.id, (err, post) => {
          if (err)
            return res.status(404).json({
              msg: "Пост не найден",
            });
          res.json(post);
        });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось получить статью",
    });
  }
};

const create = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        const { title, body, type } = req.body;
        const post = {
          date: new Date().toISOString(),
          title: title,
          body: body,
          type: type,
        };
        setPost(req.userId, post, (err, data) => {
          if (err) {
            console.error("Ошибка:", err);
            res.json("Ошибка:", err);
          } else {
            res.json(data);
          }
        });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось создать задачу",
    });
  }
};

const update = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        const body = req.body;
        editPostById(
          req.userId,
          req.params.id,
          body,
          (err, updatedPost) => {
            if (err)
            return res.status(404).json({
              msg: "Пост не найден",
            });
            res.json(updatedPost)
          }
        );
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось обновить статью",
    });
  }
};

const remove = async (req, res) => {
  try {
    getUserById(req.userId, async (err, user) => {
      if (err) {
        return res.status(404).json({
          msg: "Пользователь не найден",
        });
      } else {
        deletePostById(
          req.userId,
          req.params.id,
          (err, updatedPost) => {
            if (err)
            return res.status(404).json({
              msg: "Пост не найден",
            });
            res.json(updatedPost)
          }
        );
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "Не удалось обновить статью",
    });
  }
};



module.exports = { create, remove, get, getOne, update };
