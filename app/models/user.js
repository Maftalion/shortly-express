var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var pw = model.get('password');
      var salt;
      bcrypt.genSalt(10, function(err, result) {
        if (err) { return console.log(err); }
        salt = result;
      });
      var shasum = bcrypt.hash(pw, salt, null, function(err, hash) {
        if (err) { return console.log('err', err ); }
        model.set('password', hash);
        model.set('code', hash);
      });
    });
  }
});
module.exports = User;