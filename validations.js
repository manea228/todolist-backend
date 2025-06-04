const { body } = require('express-validator');

const loginValidation = [
  body('email', 'Неверный формат почты').isEmail(),
  body('password', 'Пароль должен быть минимум 5 символов').isLength({ min: 5 }),
];

const registerValidation = [
  body('email', 'Неверный формат почты').isEmail(),
  body('password', 'Пароль должен быть минимум 5 символов').isLength({ min: 5 }),
  body('name', 'Укажите имя').isLength({ min: 3 })
];

const postCreateValidation = [
  body('title', 'Введите заголовок статьи (минимум 3 символа)').isLength({ min: 3 }).isString(),
  body('body', 'Введите текст статьи (минимум 3 символа)').isString().optional(),
  body('type', 'Неверный формат статьи').isString()
];

const getInterestingValidation = [
  body('password', 'Неверный формат пароля').isString(),
];

const setInterestingValidation = [
  body('interests', 'Неверный формат интересов').isArray(),
  body('password', 'Неверный формат пароля').isString(),
];


module.exports = { loginValidation, postCreateValidation, registerValidation, getInterestingValidation, setInterestingValidation }
