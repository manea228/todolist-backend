const sqlite3 = require("sqlite3").verbose();
const sql = require("sql");
const { v4: uuidv4 } = require("uuid");
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

function encrypt(text, key, iv) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted, key) {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
sql.setDialect("sqlite");

const user = sql.define({
  name: "user",
  columns: ["id", "name", "email", "token", "posts", "interesting", "avatar"],
});

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../database");
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const dbPath = path.join(dir, "main.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT,
      name TEXT,
      email TEXT,
      token TEXT,
      posts TEXT,
      avatar TEXT,
      interesting TEXT
    )
  `);
});


function setUser(userData, callback) {
  const query = user.insert(userData).toQuery();

  db.run(query.text, query.values, function (err) {
    if (err) {
      console.error("Ошибка при вставке пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    const selectQuery = user
      .select()
      .from(user)
      .where(user.id.equals(userData.id))
      .toQuery();

    db.get(selectQuery.text, selectQuery.values, function (err, row) {
      if (err) {
        console.error("Ошибка при получении данных пользователя:", err.message);
        if (callback) callback(err);
        return;
      }

      if (callback) callback(null, row);
    });
  });
}

function getUserById(id, callback) {
  const query = user.select().from(user).where(user.id.equals(id)).toQuery();
  db.get(query.text, query.values, (err, row) => {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    if (!row) {
      const notFoundError = new Error(`Пользователь с id ${id} не найден`);
      if (callback) callback(notFoundError);
      return;
    }
    if (callback) callback(null, row);
  });
}

function getUserByEmail(email, callback) {
  const query = user
    .select()
    .from(user)
    .where(user.email.equals(email))
    .toQuery();

  db.get(query.text, query.values, (err, row) => {
    if (err) {
      console.error("Ошибка при получении пользователя по email:", err.message);
      if (callback) callback(err);
      return;
    }

    if (!row) {
      const notFoundError = new Error(
        `Пользователь с email ${email} не найден`
      );
      if (callback) callback(notFoundError);
      return;
    }

    if (callback) callback(null, row);
  });
}

function setPost(userId, postData, callback) {
  db.get("SELECT posts FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error("Ошибка при разборе JSON постов:", parseErr.message);
      }
    }

    const id = uuidv4();
    const newPost = {
      id: id,
      ...postData,
    };

    posts.push(newPost);
    db.run(
      "UPDATE user SET posts = ? WHERE id = ?",
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error("Ошибка при обновлении постов:", updateErr.message);
          if (callback) callback(updateErr);
          return;
        }
        if (callback) callback(null, newPost);
      }
    );
  });
}

function setInteresting(userId, interestingData, key, iv, callback) {
  db.get("SELECT interesting FROM user WHERE id = ?", [userId], (selectErr, row) => {
    if (selectErr) {
      console.error("Ошибка при получении интересов:", selectErr.message);
      if (callback) callback(selectErr);
      return;
    }

    let existingData = [];

    try {
      if (row && row.interesting) {
        const decrypted = decrypt(row.interesting, key, iv);
        existingData = JSON.parse(decrypted);
        if (!Array.isArray(existingData)) {
          existingData = [];
        }
      }
    } catch (e) {
      console.warn("Не удалось расшифровать старые интересы, они будут перезаписаны");
      existingData = [];
    }
    const id = uuidv4();
    const updatedData = existingData.concat({id: id, ...interestingData[0]});
    const jsonData = JSON.stringify(updatedData);
    const encryptedData = encrypt(jsonData, key, iv);

    db.run("UPDATE user SET interesting = ? WHERE id = ?", [encryptedData, userId], function (updateErr) {
      if (updateErr) {
        console.error("Ошибка при обновлении интересов:", updateErr.message);
        if (callback) callback(updateErr);
        return;
      }
      if (callback) callback(null, updatedData);
    });
  });
}


function getInteresting(userId, key, callback) {
  db.get("SELECT interesting FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    if (!row || !row.interesting) {
      return callback(null, []);
    }

    try {
      const decryptedData = decrypt(row.interesting, key);
      const interesting = JSON.parse(decryptedData);
      callback(null, interesting);
    } catch (e) {
      console.error("Ошибка при расшифровке или разборе интересов:", e.message);
      callback(e);
    }
  });
}

function getInterestingById(userId, interestId, key, callback) {
  db.get("SELECT interesting FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    if (!row || !row.interesting) {
      return callback(null, null);
    }

    try {
      const decryptedData = decrypt(row.interesting, key);
      const interesting = JSON.parse(decryptedData);

      if (!Array.isArray(interesting)) {
        return callback(null, null);
      }

      const found = interesting.find(item => item.id === interestId);
      callback(null, found || null);
    } catch (e) {
      console.error("Ошибка при расшифровке или разборе интересов:", e.message);
      callback(e);
    }
  });
}



function getPostsByUserId(userId, callback) {
  db.get("SELECT posts FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback(err);
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error("Ошибка при разборе JSON постов:", parseErr.message);
        return callback(parseErr);
      }
    }

    callback(null, posts);
  });
}

function getPostById(userId, postId, callback) {
  db.get("SELECT posts FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      if (callback) callback("noUser");
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error("Ошибка при разборе JSON:", parseErr.message);
        return callback(parseErr);
      }
    }

    const post = posts.find((p) => String(p.id) === String(postId));
    if (!post) {
      if (callback) callback("noPost");
      return;
    }

    callback(null, post);
  });
}

function editPostById(userId, postId, newPostData, callback) {
  db.get("SELECT posts FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      return callback(err);
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error("Ошибка при разборе JSON:", parseErr.message);
        return callback(parseErr);
      }
    }

    const index = posts.findIndex((p) => String(p.id) === String(postId));
    if (index === -1) {
      return callback("noPost");
    }
    posts[index] = {
      ...posts[index],
      ...newPostData,
    };

    db.run(
      "UPDATE user SET posts = ? WHERE id = ?",
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error("Ошибка при сохранении постов:", updateErr.message);
          return callback(updateErr);
        }

        callback(null, posts[index]);
      }
    );
  });
}

function deletePostById(userId, postId, callback) {
  db.get("SELECT posts FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      return callback(err);
    }
    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error("Ошибка при разборе JSON:", parseErr.message);
        return callback(parseErr);
      }
    }
    const index = posts.findIndex((p) => String(p.id) === String(postId));
    if (index === -1) {
      return callback(new Error("Пост не найден"));
    }
    const deletedPost = posts.splice(index, 1)[0];

    db.run(
      "UPDATE user SET posts = ? WHERE id = ?",
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error("Ошибка при обновлении постов:", updateErr.message);
          return callback(updateErr);
        }
        callback(null, deletedPost);
      }
    );
  });
}

function deleteInterestingById(userId, interestId, key, iv, callback) {
  db.get("SELECT interesting FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) {
      console.error("Ошибка при получении пользователя:", err.message);
      return callback(err);
    }

    let updated = [];
    let old = {}
    try {
      const decrypted = decrypt(row.interesting, key, iv);
      const current = JSON.parse(decrypted);

      if (Array.isArray(current)) {
        old = current.filter(item => item.id == interestId);
        updated = current.filter(item => item.id !== interestId);
      }
    } catch (e) {
      console.error("Ошибка при расшифровке интересов:", e.message);
      return callback(e);
    }

    const encrypted = encrypt(JSON.stringify(updated), key, iv);

    db.run("UPDATE user SET interesting = ? WHERE id = ?", [encrypted, userId], function (err) {
      if (err) {
        console.error("Ошибка при обновлении интересов:", err.message);
        return callback(err);
      }
      callback(null, old);
    });
  });
}

function updateInterestingById(userId, interestId, newData, key, iv, callback = () => {}) {
  db.get("SELECT interesting FROM user WHERE id = ?", [userId], function (err, row) {
    if (err) return callback(err);

    let updatedInterest = null;

    try {
      const decrypted = decrypt(row.interesting, key, iv);
      const current = JSON.parse(decrypted);

      if (!Array.isArray(current)) return callback(null, null);

      const updatedArray = current.map(item => {
        if (item.id === interestId) {
          updatedInterest = { ...item, ...newData };
          return updatedInterest;
        }
        return item;
      });

      const encrypted = encrypt(JSON.stringify(updatedArray), key, iv);

      db.run("UPDATE user SET interesting = ? WHERE id = ?", [encrypted, userId], function (err) {
        if (err) return callback(err);
        callback(null, updatedInterest); // возвращаем только один обновлённый интерес
      });

    } catch (e) {
      return callback(e);
    }
  });
}




module.exports = {
  setUser,
  getUserById,
  setPost,
  getPostsByUserId,
  getUserByEmail,
  getPostById,
  editPostById,
  deletePostById,
  setInteresting,
  getInteresting,
  getInterestingById,
  deleteInterestingById,
  updateInterestingById
};
