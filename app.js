var createError = require('http-errors'); // Создание ошибок HTTP (например, 404, 500).
var express = require('express'); // Основной модуль Express для работы с HTTP-сервером.
var path = require('path'); // Работа с путями в файловой системе (создание абсолютных путей).
var cookieParser = require('cookie-parser'); // Разбор cookie из запросов.
var logger = require('morgan'); // Логирование HTTP-запросов (например, GET, POST).

const mongoose = require('mongoose'); // MongoDB
const bodyParser = require('body-parser'); // json parser
const diagramRoutes = require('./routes/diagramRoutes');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/diagrams', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Middleware
app.use(bodyParser.json());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(bodyParser.json());
app.use(logger('dev')); // Логирует запросы (GET, POST и т.д.).
app.use(express.json()); // Разбирает JSON-тело запросов.
app.use(express.urlencoded({ extended: false })); // Разбирает URL-кодированные данные из тела запроса.
app.use(cookieParser()); // Разбирает Cookie.
app.use(express.static(path.join(__dirname, 'public'))); // Служит для статических файлов (CSS, JS, изображения).


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
