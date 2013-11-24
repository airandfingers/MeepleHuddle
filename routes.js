module.exports = (function () {
  var app = require('./app').app
    , _ = require('underscore') // list utility library
    , passport = require('passport')
    //, nodemailer = require('nodemailer')
    , auth = require('./auth')
    , User = require('./models/user')
    , db_config = require('./models/db.config')
    //, mailer = require('./mailer')
    , BoardGame = require('./models/board_game');

  var base_page = '/home';

  // this shouldn't be necessary - should be able to use auth.ensureAuthenticated directly
  var ensureAuthenticated = function(req, res, next) {
    auth.ensureAuthenticated(req, res, next);
  };
  
  //These app.get functions will display their respective ejs page.
  app.get('/account', ensureAuthenticated, function(req, res) {
    var flash = req.flash('error');
    res.render('account', {
      title: 'Account',
      username: req.user.username,
      registration_date: req.user.registration_date,
      email: req.user.email,
      email_confirmed: req.user.email_confirmed,
      message: flash && flash[0],
    });
  });

  app.get('/login', function (req, res) {
    var next_page = req.query.next || base_page;
    if (! auth.isAuthenticated(req)) {
      var flash = req.flash('error');
      //Show the login form.
      res.render('login', {
        message: flash && flash[0],
        next: next_page,
        title: 'Login',
      });
    }
    else {
      //Redirect to 'next' URL.
      res.redirect(next_page);
    }
  });
  
  //this page is where you request the password recovery e-mail
  /*app.get('/password_recovery', function (req, res) {
    res.render('password_recovery', {
      message: req.flash('error'),
      next: req.query.next,
      title: 'Password Recovery',
    });
  });*/


  //this page is where you reset your password (after receiving the e-mail)
  /*app.get('/password_reset', function(req, res) {
    var email = req.query.email
      , recovery_code = req.query.recovery_code
      , username = req.query.username;
      console.log(email + recovery_code + username);
    res.render('password_reset', {
      message: req.flash('error'),
      title: 'Password Reset',
      email: email,
      recovery_code: recovery_code,
      username: username,
    });
    console.log('Password reset page loaded with username ' + username + ', recovery code ' + recovery_code + ', and e-mail ' + email + '.');
  });*/

  app.get('/register', function(req, res) {
    var next_page = req.query.next || base_page;
    if (! auth.isAuthenticated(req)) {
      var flash = req.flash('error');
      //Show the registration form.
      res.render('register', {
        message: flash && flash[0],
        next: req.query.next,
        title: 'Ready to play?',
        mode: 'register'
      });
    }
    else {
      //Redirect to 'next' URL.
      res.redirect(next_page);
    }
  });

  //this route handles e-mail verification links.
  /*app.get('/verify_email', function (req, res) {
    var email = req.query.email
      , confirmation_code = req.query.confirmation_code;

    //check user database for users with matching email and confirmation code, then update email_confirmed property to true.
    User.findOneAndUpdate( {email: email, confirmation_code: confirmation_code},
                           {email_confirmed: true}, function(err, user) {
      console.log('findOneAndUpdate returns', err, user);
      if (err) {
        console.error('Error during findOneAndUpdate:', err);
      }
      else if (_.isEmpty(user)) {
        req.flash('error', 'Sorry, there was something wrong with your email confirmation link.');
      }
      else {
        req.flash('error', 'Your email address has been successfully confirmed.');
      }
      res.redirect('/account');
    });
  });*/

  function renderHome(req, res) {
    var user = req.user
      , render_args ={
          title: 'Meeple Huddle'
        , user: user
      };
    if (user && _.isNumber(user.metrics.length)) {
      user.getRecommendations(5, function(err, recommendations) {
        if (err) { console.error('Error while getting recommendations:', err); }
        render_args.recommendations = recommendations;
        render();
      });
    }
    else {
      render();
    }
    function render() {
      res.render('home', render_args);
    }
  }

  app.get('/', renderHome);
  app.get('/home', renderHome);

  app.get('/games', function (req, res) {
    BoardGame.find(function(find_err, games) {
      if (find_err) { return next(find_err); }
      res.render('games', {
        title: 'Board Game List'
      , user: req.user
      , games: games
      });
    });
  });

  app.get('/questionnaire', ensureAuthenticated, function(req, res) {
    res.render('questionnaire', {
      title: 'Questionnaire'
    , user: req.user
    });
  });

  app.post('/answer/:value', ensureAuthenticated, function(req, res) {
    var val = req.params.value
      , metrics = req.user.metrics;
    console.log('/answer/:value called with', val);
    _.extend(metrics.internal, {
      aesthetic  : val
    , challenge  : val
    , pass_time  : val
    , narrative  : val
    , discovery  : val
    , chance     : val
    });
    _.extend(metrics.external, {
      confrontation : val
    , manipulation  : val
    , accumulation  : val
    , teamwork      : val
    });

    metrics.length = BoardGame.calculateSumProduct(metrics);
    metrics.length = Math.sqrt(metrics.length);
    req.user.save(function(save_err) {
      if (save_err) { console.error(save_err); }
      res.redirect(base_page);
    });
  });

  app.get('/self_describe', ensureAuthenticated, function(req, res) {
    res.render('self_describe', {
      title: 'Describe Yourself'
    , user: req.user
    });
  });

  app.post('/describe', ensureAuthenticated, function(req, res) {
    var args = req.body
      , metrics = req.user.metrics;
    console.log('/describe called with', args, metrics);
    _.extend(metrics.internal, {
      aesthetic  : args.aesthetic
    , challenge  : args.challenge
    , pass_time  : args.pass_time
    , narrative  : args.narrative
    , discovery  : args.discovery
    , chance     : args.chance
    });
    _.extend(metrics.external, {
      confrontation : args.confrontation
    , manipulation  : args.manipulation
    , accumulation  : args.accumulation
    , teamwork      : args.teamwork
    });
    metrics.length = BoardGame.calculateSumProduct(metrics);
    metrics.length = Math.sqrt(metrics.length);
    req.user.save(function(save_err) {
      if (save_err) { console.error(save_err); }
      res.redirect(base_page);
    });
  });

  app.post('/set_email', ensureAuthenticated, function (req, res) {
    var username = req.user.username
      , email = req.body.email;

    console.log('POST /set_email called ' + email +', req.user is ', req.user);
    req.user.email = email;
    req.user.save(function(save_err) {
      if (save_err) {
        console.error('error when setting email:', save_err);
        req.flash('error', save_err);
        //res.json({ error: save_err });
      }
      else {
        console.log('Set email for ' + req.user.username);
        //res.json({ success: true});
      }
      res.redirect('/account');
    });
  });

  //delete account
  app.post('/delete_account', ensureAuthenticated, function (req, res) {
    console.log('delete_account route fired.');
    User.remove({ _id: req.user.id }, function(err) {
      if (_.isEmpty(err)) {
        console.log('Account deleted!');
        req.flash('error', 'Account deleted. Play again soon!');
      }
      else {
        console.error('Error when attempting to delete account:', err);
        req.flash('error', 'Error when attempting to delete account:' + err);
      }
    });
    res.redirect('back');
  });

/*
  //submit password recovery to user's e-mail address route.
  app.post('/password_recovery', function (req, res) {
    var username = req.body.username;
    console.log('Post /password recovery route called for username: ' + username);
    User.findOne({ username: username }, function(err, user) {
      console.log('findOne returns', user);
      if (err) {
        console.error('Error during findOne:', err);
        res.json({ error: 'Error during findOne:' + JSON.stringify(err) });
      }
      else if (user === null) {
        req.flash('error', 'Sorry. There is no such user as ' + username + '. Hope you did not forget your username. That could be bad.');
        res.redirect('/password_recovery');
      }
      else if (_.isEmpty(user.email)) {
        req.flash('error', 'Sorry. There is no e-mail registered with the account for ' + username + '. You cannot recover your password.');
        res.redirect('/password_recovery');
      }
      else {
        User.generatePasswordRecoveryCode(function (err, recovery_code) {
          if (err) {
            console.error('Error while generating confirmation code:', err);
            res.json({ error: 'Error while generating confirmation code:' + JSON.stringify(err) });
          }
          else {
            user.recovery_code = recovery_code;
            console.log('before save:', user);
            user.save(function(err) {
              console.log('after save:', user);
              if (err) {
                console.error('Error during save:', err);
                res.json({ error: 'Error during save:' + JSON.stringify(err) });
              }
              else {
                req.flash('error', 'A recovery e-mail has been sent to your registered account. Check your e-mail for further instructions.');
                res.redirect('/login');
              }
            });
            mailer.sendPasswordRecovery(user.email, recovery_code, username);
          }
        });
      }
    });
  });

  //resets password to whatever the user inputs.
  app.post ('/password_reset', function (req, res) {
    var email = req.body.email
      , recovery_code = req.body.recovery_code
      , username = req.body.username
      , password = req.body.password
      , password_confirm = req.body.password_confirm;
    console.log('calling password reset route. password is', password, 'password_confirm is', password_confirm);
        if (password === password_confirm) {
          User.findOne( {username: username, recovery_code: recovery_code}, function(err, user) {
            if (err) {
              console.error('Error during findOne: ' + err.message);
              req.flash('Error during findOne: ' + err.message);
              res.redirect('back');
            }
            else if (! user) {
              req.flash('error', 'No user found with that username and recovery_code!');
              res.redirect('back');
            }
            else {
                user.password = User.encryptPassword(password);
                user.recovery_code = null;
                user.save(function(err, result) {
                  if (err) {
                    req.flash('error', err.message);
                    res.redirect('back');
                  }                  
                  else {
                    // password reset successful. Redirect.
                    console.log('password reset successful' + ' !');
                    req.flash('error', 'Password reset is successful. Cheers, mate.');
                    res.redirect('/login');
                  }
                });
            }
          }); 
        }
        else { 
          console.error('Passwords do not match son.  ' + password + '!= ' + password_confirm);
          res.redirect('back');
        }
  });
*/

  //remove email from account association
  app.post('/remove_email', ensureAuthenticated, function (req, res) {
    console.log('calling remove email route');
    User.update({ _id: req.user._id }, { $unset: { email: undefined }, $set: { email_confirmed: false } }, function(err) {
      if (err) {
        console.error('error when removing email from database:', err);
        req.flash('error', err);
        //res.json({ error:err });
      }
      else {
        console.log('Removed email from ' + req.user.username +'\'s account.');
        //res.json({ success: true});
      }
      res.redirect('/account');
    });
  });

  app.post('/login',
           passport.authenticate('local', 
                                 { failureRedirect: '/login', 
                                   failureFlash: true }),
           function (req, res) {
    // Authentication successful. Redirect.
    //console.log('POST /login called!');
    res.redirect(req.body.next || base_page);
  });

  //Send register the new information
  app.post('/register', function (req, res, next) {
    var username = req.body.username
      , pt_password = req.body.new_password
      , password_confirm = req.body.new_password_confirm
      , email = req.body.email || undefined
      , target = req.body.next || base_page;

    if (_.isEmpty(username) || _.isEmpty(pt_password)) {
      req.flash('error', 'Cannot register without both username and password!');
      res.redirect('/register?next=' + target);
      return;
    }

    if (pt_password !== password_confirm) {
      //console.log('password fields did not match!');
      req.flash('error', 'Password fields did not match!');
      res.redirect('/register?next=' + target);
      return;
    }

    if (auth.isAuthenticated(req)) {
      console.error('Already-authenticated user trying to register!');
      res.redirect(target);
    }
    else {
      console.log('creating user with spec:',
                  { username: username, pt_password: pt_password });
      User.createUser({ username: username, pt_password: pt_password, email: email }, function(create_err, user) {
        console.log('createUser returns', create_err, user);
        if (create_err) {
          req.flash('error', create_err);
          res.redirect('/register?next=' + target);
        }
        else {
          // Registration successful. Log in.
          req.login(user, function(login_err) {
            console.log('error is', login_err, '\n req.user is', req.user);
            if (login_err) {
              req.flash('error', login_err.message);
              return res.redirect('/login?next=' + target);
            }
           res.redirect(target);
          });
        }
      });
    }
  });

  app.get('/logout', function (req, res) {
    //console.log('GET /logout called!');
    //End this user's session.
    req.logout();
    res.redirect(base_page);
  });

  app.get('/check_username', function(req, res) {
    var username = req.query.username;
    if (_.escape(username) !== username) {
      return res.json('The following characters are not allowed in usernames: & < > " \' /');
    }
    User.findOne({ username: username }, function(find_err, user) {
      if (find_err) {
        console.error('Error while trying to look up user named', username, find_err);
        return res.json('Sorry, something went wrong. We\'ll look into it.');
      }
      if (user) {
        return res.json('The name ' + username + ' is already taken.')
      }
      res.json(true);
    });
  });

  //Handle all other cases with a 404
  //Note: ONLY do this if app.use(app.router) comes after
  //      app.use(express.static) in this app's configuration;
  //      otherwise, this route will catch all incoming requests,
  //      including requests for static files that exist.
  app.all('*', function(req, res) {
    res.status(404);
    res.render('404', {
      title: '404 Not Found'    
    });
  });
})();