const jwt = require('jsonwebtoken');

const checkAuth = (req, res, next) => {
  const key = (req.headers.authorization || '').replace(/Bearer\s?/, '');

  if (token) {
    try {
      const decoded = jwt.verify(key, process.env.key);
      req.userId = decoded.id;
      next();
    } catch (e) {
      return res.status(403).json({
        msg: 'Нет доступа',
      });
    }
  } else {
    return res.status(403).json({
      msg: 'Нет доступа',
    });
  }
};

module.exports = checkAuth;