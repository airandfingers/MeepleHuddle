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
    , length           : Number // sqrt(SUMPRODUCT(all metrics, all metrics))
    }
  , similarity         : Number //should never get saved
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

  BoardGameSchema.statics.calculateSumProduct = function(metrics1, metrics2) {
    var square =  _.isUndefined(metrics2)
      , sum_product = 0;
    metrics1 = _.pick(metrics1, ['internal', 'external']);
    if (! square) metrics2 = _.pick(metrics2, ['internal', 'external']);
    _.each(metrics1, function(metrics_obj, category) {
      if (_.isFunction(metrics_obj) || category === 'length') { return; }
      _.each(metrics_obj, function(value1, metric) {
        if (_.isFunction(value1)) { return; }
        if (_.isNull(value1) || value1 < 1) {
          value1 = metrics_obj[metric] = 1;
        }
        value2 = square ? value1 : metrics2[category][metric];
        sum_product += value1 * value2;
      });
    });
    //console.log('calculateSumProduct', metrics1, metrics2, square, sum_product);
    return sum_product;
  };

  BoardGameSchema.pre('save', function(next) {
    var sum_product = BoardGame.calculateSumProduct(this.metrics);
    this.metrics.length = Math.sqrt(sum_product);
    next();
  });

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
  var BoardGame = mongoose.model('board_game', BoardGameSchema);

  return BoardGame;
})();