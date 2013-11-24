module.exports = (function() {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , async = require('async') // flow control utility library
    , _ = require('underscore') // list utility library

    , db = require('./db'); // make sure db is connected

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var BoardGameSchema = new Schema({
  // instance properties - document.field_name
    name               : { type: String, unique: true }
  , num_players        : { min: Number, max: Number }
  , min_age            : Number // minimum player age, in years
  , setup_time         : { min: Number, max: Number } // how long this game takes to set up, in minutes
  , play_time          : { min: Number, max: Number } // how long this game takes to play, in minutes
  , skills_required    : [String]
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
        confrontation  : Number // 1-5
      , manipulation   : Number // 1-5
      , accumulation   : Number // 1-5
      , teamwork       : Number // 1-5
      }
    }
  }, { minimize: false }); // set minimize to false to save empty objects

  // static methods - Model.method()
  BoardGameSchema.statics.createBoardGame = function(spec, cb) {
    var board_game = new BoardGame(spec);
    console.log('created board game with', spec, board_game);
    board_game.save(function(save_err, result) {
      if (save_err) { return cb(save_err); }
      cb(null, result);
      //}
    });
  };

  // lookup and return current, complete user document
  BoardGameSchema.methods.fetch = function(cb) {
    BoardGame.findOne({ _id: this._id }, function(err, board_game) {
      //console.log('findOne returns', err, board_game);
      cb(err, board_game);
    });
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var BoardGame = mongoose.model('BoardGame', BoardGameSchema);

  return BoardGame;
})();