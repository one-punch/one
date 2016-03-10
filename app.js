var express = require('express')
var config = require("./config")
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var async = require("async")
var parseString = require('xml2js').parseString;
var accessToken = null
var cookieParser = require('cookie-parser')
var session = require('express-session')
var _ = require('lodash')
var formidable = require('formidable')
var fs = require('fs')
var path = require('path')
var helpers = require("./helpers")
var moment = require('moment')
var fs        = require('fs');
var app = express();

var models  = require('./models');
app.set('port', process.env.PORT || 3001);
app.enable('verbose errors');
app.use(express.static(__dirname + '/public'));

var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: helpers
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.query());
app.use(cookieParser())
app.use(urlencodedParser)
app.use(jsonParser)
app.use(session({secret: 'one', saveUninitialized: true, resave: true}))

app.use(function(req, res, next){
  var contentType = req.headers['content-type'] || ''
    , mime = contentType.split(';')[0];
  console.log("content-type: " + mime)
  if (mime != 'text/plain' && mime != 'text/html') {
    return next();
  }
  var data = "";
  req.on('data', function(chunk){ data += chunk})
  req.on('end', function(){
    if(data !== ''){
      try{
        req.rawBody = JSON.parse(data)
      }catch(e){
        req.rawBody = data
      }
    }
    next();
   })
})

app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;
  if (config) res.locals.config = config;

  next();
});

app.all("*", function(req, res, next) {
  console.log(req.method + " : " + req.url)
  next()
})

var apiV1  = require('./routers/api/v1');
for (var i = 0; i < apiV1.length; i++) {
  app.use('/api/v1', apiV1[i]);
};


// --------------- app -----------------------

app.get('/404', function(req, res, next){
  next();
});

app.get('/403', function(req, res, next){
  var err = new Error('not allowed!');
  err.status = 403;
  next(err);
});

app.get('/500', function(req, res, next){
  next(new Error('keyboard cat!'));
});


app.use(function(req, res, next){
  res.status(404);

  if (req.accepts('html')) {
    res.render('404', { layout: false, url: req.url });
    return;
  }

  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  res.type('txt').send('Not found');
});

app.use(function(err, req, res, next){
  console.log(err)
  res.status(err.status || 500);
  res.render('500', { layout: false, error: err });
});



var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});