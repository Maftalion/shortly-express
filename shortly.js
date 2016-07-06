var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var $ = require('jquery');
var knex = require('knex');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'hello123',
  resave: true,
  saveUninitialized: true,
}));
var auth = function(req, res, next) {
  if (req.session && req.session.userID) {
    return next();
  } else {
    res.redirect('/login');
    return res.sendStatus(401);
  }
};

app.get('/', auth, 
function(req, res) {
  res.render('index');
});

app.get('/login', 
function(req, res) {
  res.render('login');

});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', auth, function(req, res) {
  Links.query({where: {userId: req.session.userID}}).fetch().then(function(models) {
    res.status(200).send(models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin,
          userID: req.session.userID
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({ username: username, password: password}).fetch().then(function(found) {
    if (found) {
      res.redirect('/signup');
      res.status(201).send(found.attributes);
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function(user) {
        req.session.userID = user.attributes.id;
        res.header('location', '/signup');
        res.status(201);
        res.redirect('/');
        
      });
    }
  });
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var ID;
  var data = Users.fetch();

  new User({ username: username, password: password}).fetch().then(function(found) {
    if (found) {
      req.session.userID = found.attributes.id;
      res.status(201);
      res.redirect('/');
    } else {
      res.header('location', '/login');
      res.status(201);
      res.redirect('/login');
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

//app.get for login endpoint
//app.get for signup endpoint

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
