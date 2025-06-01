// db.js
const sqlite3 = require('sqlite3').verbose();
const sql = require('sql');
const { v4: uuidv4 } = require('uuid');
// установить диалект sqlite
sql.setDialect('sqlite');

// определить таблицы
const user = sql.define({
  name: 'user',
  columns: ['id', 'name', 'email', 'token']
});

const post = sql.define({
  name: 'post',
  columns: ['id', 'userId', 'date', 'title', 'body', 'type']
});

// подключение к базе
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../database');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const dbPath = path.join(dir, 'main.sqlite');
const db = new sqlite3.Database(dbPath);

// теперь можно создавать таблицы и работать с базой


// создать таблицы (если не существуют)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT,
      name TEXT,
      email TEXT,
      token TEXT,
      posts TEXT
    )
  `);
});

function setUser(userData, callback) {
  const query = user.insert(userData).toQuery();

  db.run(query.text, query.values, function (err) {
    if (err) {
      console.error('Ошибка при вставке пользователя:', err.message);
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
        console.error('Ошибка при получении данных пользователя:', err.message);
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
      console.error('Ошибка при получении пользователя:', err.message);
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
      console.error('Ошибка при получении пользователя по email:', err.message);
      if (callback) callback(err);
      return;
    }

    if (!row) {
      const notFoundError = new Error(`Пользователь с email ${email} не найден`);
      if (callback) callback(notFoundError);
      return;
    }

    if (callback) callback(null, row);
  });
}

function setPost(userId, postData, callback) {
  db.get('SELECT posts FROM user WHERE id = ?', [userId], function (err, row) {
    if (err) {
      console.error('Ошибка при получении пользователя:', err.message);
      if (callback) callback(err);
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error('Ошибка при разборе JSON постов:', parseErr.message);
      }
    }

    const id = uuidv4();
    const newPost = {
      id: id,
      ...postData
    };

    posts.push(newPost);
    db.run(
      'UPDATE user SET posts = ? WHERE id = ?',
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error('Ошибка при обновлении постов:', updateErr.message);
          if (callback) callback(updateErr);
          return;
        }
        if (callback) callback(null, newPost);
      }
    );
  });
}

function getPostsByUserId(userId, callback) {
  db.get('SELECT posts FROM user WHERE id = ?', [userId], function (err, row) {
    if (err) {
      console.error('Ошибка при получении пользователя:', err.message);
      if (callback) callback(err);
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error('Ошибка при разборе JSON постов:', parseErr.message);
        return callback(parseErr);
      }
    }

    callback(null, posts);
  });
}

function getPostById(userId, postId, callback) {
  db.get('SELECT posts FROM user WHERE id = ?', [userId], function (err, row) {
    if (err) {
      console.error('Ошибка при получении пользователя:', err.message);
      if (callback) callback("noUser");
      return;
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error('Ошибка при разборе JSON:', parseErr.message);
        return callback(parseErr);
      }
    }

    const post = posts.find(p => String(p.id) === String(postId));
    if (!post) {
      if (callback) callback("noPost");
      return;
    }

    callback(null, post);
  });
}

function editPostById(userId, postId, newPostData, callback) {
  db.get('SELECT posts FROM user WHERE id = ?', [userId], function (err, row) {
    if (err) {
      console.error('Ошибка при получении пользователя:', err.message);
      return callback(err);
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error('Ошибка при разборе JSON:', parseErr.message);
        return callback(parseErr);
      }
    }

    const index = posts.findIndex(p => String(p.id) === String(postId));
    if (index === -1) {
      return callback("noPost");
    }

    // обновляем содержимое поста
    posts[index] = {
      ...posts[index],
      ...newPostData,
    };

    db.run(
      'UPDATE user SET posts = ? WHERE id = ?',
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error('Ошибка при сохранении постов:', updateErr.message);
          return callback(updateErr);
        }

        callback(null, posts[index]);
      }
    );
  });
}

function deletePostById(userId, postId, callback) {
  db.get('SELECT posts FROM user WHERE id = ?', [userId], function (err, row) {
    if (err) {
      console.error('Ошибка при получении пользователя:', err.message);
      return callback(err);
    }

    let posts = [];
    if (row && row.posts) {
      try {
        posts = JSON.parse(row.posts);
      } catch (parseErr) {
        console.error('Ошибка при разборе JSON:', parseErr.message);
        return callback(parseErr);
      }
    }

    const index = posts.findIndex(p => String(p.id) === String(postId));
    if (index === -1) {
      return callback(new Error('Пост не найден'));
    }

    // удаляем пост
    const deletedPost = posts.splice(index, 1)[0];

    db.run(
      'UPDATE user SET posts = ? WHERE id = ?',
      [JSON.stringify(posts), userId],
      function (updateErr) {
        if (updateErr) {
          console.error('Ошибка при обновлении постов:', updateErr.message);
          return callback(updateErr);
        }

        callback(null, deletedPost);
      }
    );
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
  deletePostById
};
