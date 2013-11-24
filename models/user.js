module.exports = (function() {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , crypto = require('crypto') // encryption utility library
    , async = require('async') // flow control utility library
    , _ = require('underscore') // list utility library

    , db = require('./db'); // make sure db is connected

    //, mailer = require('../mailer') // used to send emails

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var UserSchema = new Schema({
  // instance properties - document.field_name
    //the user's username
    username           : { type: String, unique: true }
    //the user's password, hashed with SHA-1
  , password           : String
    //the user's email address
  , email              : { type: String, trim: true }
    //the code used to confirm this user's email
  //, confirmation_code: String
    //whether the user has confirmed his/r email address
  //, email_confirmed    : { type: Boolean, default: false }
  //, recovery_code      : { type: String }
  , registration_date  : { type: Date, default: Date.now }
  , metrics: {
      internal: {
        aesthetic      : Number // 1-5
      , challenge      : Number // 1-5
      , pass_time      : Number // 1-5
      , narrative      : Number // 1-5
      , discovery      : Number // 1-5
      , chance         : Number // 1-5
      }
    , external: {
      , confrontation  : Number // 1-5
      , manipulation   : Number // 1-5
      , accumulation   : Number // 1-5
      , teamwork       : Number // 1-5
      }
    }
  }, { minimize: false }); // set minimize to false to save empty objects

  // static methods - Model.method()
  UserSchema.statics.createUser = function(spec, cb) {
    var username = spec.username
      , pt_password = spec.pt_password
      , error;
    console.log('createUser called for', spec);
    if (_.escape(username) !== username) {
      error = 'The following characters are not allowed in usernames: & < > " \' /';
    }
    else if (! _.isString(pt_password)) {
      error = 'User.createUser called without pt_password!';
    }
    if (error) {
      console.error(error);
      return cb(error);
    }

    spec.password = User.encryptPassword(pt_password);
    delete spec.pt_password;

    var user = new User(spec);
    console.log('created user with', spec, user);
    user.save(function(save_err, result) {
      if (save_err) {
        error = 'Error during save: ' + save_err;
        return cb(error);
      }
      /*if (! _.isEmpty(spec.email)) {
        user.sendConfirmationEmail(spec.email, function(email_err) {
          if (email_err) {
            error = 'Error while sending email: ' + email_err;
            return cb(error);
          }
          cb(null, result);
        })
      }
      else {*/
      cb(null, result);
      //}
    });
  };

  UserSchema.statics.authenticate = function(username, password, cb) {
    var model = this;
    // look for a matching username/password combination
    model.findOne({
      username: username,
      password: User.encryptPassword(password)
    }, cb);
  };

  /*UserSchema.statics.generateConfirmationCode = function(cb) {
    crypto.randomBytes(16, function(err, buf) {
      if (err) {
        cb(err);
      }
      else {
        var confirmation_code = buf.toString('hex');
        cb(null, confirmation_code);
      }
    });
  };
  
  UserSchema.statics.generatePasswordRecoveryCode = function(cb) {
    crypto.randomBytes(16, function(err, buf) {
      if (err) {
        cb(err);
      }
      else {
        var recovery_code = buf.toString('hex');
        cb(null, recovery_code);
      }
    });
  };*/

  UserSchema.statics.getByIdWithoutPassword = function(id, cb) {
    User.findOne({ _id: id }, { password: false }, cb);
  };

  UserSchema.statics.encryptPassword = function(pt_password) {
    var shasum = crypto.createHash('sha1');
    if (_.isString(pt_password)) {
      shasum.update(pt_password);
      shasum = shasum.digest('hex');
    }
    else {
      console.log('User.encryptPassword called without pt_password!');
      shasum = null;
    }
    return shasum;
  };

  // instance methods - document.method()
  /*UserSchema.methods.sendConfirmationEmail = function(email, cb) {
    var self = this
      , error = null
      , valid = true; //this is a stub to hold the place for a email validator functionality. 
    //if email is valid, save it to MongoDB
    if (valid) {
      //attach e-mail to user
      User.generateConfirmationCode(function(err, confirmation_code) {
        if (err) {
          error = 'Error while generating confirmation code:' + err;
          console.error(error);
          cb(error);
        }
        else {
          self.update({ $set: { email: email, confirmation_code: confirmation_code } },
                      function(err) {
            if (err) {
              error = 'Error when saving email to database:' + err;
              console.error(error);
            }
            else {
              console.log('Email saved to ' + self.username + '\'s account.');
              mailer.sendConfirmationEmail(email, confirmation_code, self.username);
            }
            cb(error);
          });
        }
      });
    }
  };*/

  // lookup and return current, complete user document
  UserSchema.methods.fetch = function(cb) {
    User.findOne({ _id: this._id }, function(err, user) {
      //console.log('findOne returns', err, user);
      cb(err, user);
    });
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var User = mongoose.model('User', UserSchema);

  return User;
})();