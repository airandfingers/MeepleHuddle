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
    , len           : Number // sqrt(SUMPRODUCT(all metrics, all metrics))
    }
  , similarity         : Number //should never get saved
  , file_name          : String // file name (path is public/img/games)
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
      if (_.isFunction(metrics_obj) || category === 'len') { return; }
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

  BoardGameSchema.statics.getRecommendations = function(metrics, num, excluded_games, cb) {
    //console.log('getRecommendations called with', metrics, num, excluded_games);
    BoardGame.find({ _id: { $nin : excluded_games } }, function(find_err, board_games) {
      //console.log('find returns', find_err, board_games);
      if (find_err) { return cb(find_err); }
      var board_game_metrics
        , sum_product;
      _.each(board_games, function(board_game) {
        board_game_metrics = board_game.metrics;
        sum_product = BoardGame.calculateSumProduct(metrics, board_game_metrics);
        //console.log('Setting', board_game.name, '\'s similarity', sum_product, metrics.len, board_game_metrics.len);
        board_game.similarity = sum_product / metrics.len / board_game_metrics.len;
        //console.log(board_game.similarity);
      });
      board_games = _.sortBy(board_games, 'similarity');
      //console.log('sorted board_games:', board_games);
      cb(null, _.last(board_games, num).reverse());
    });
  };

  // calculate metrics based on games' metrics
  BoardGameSchema.statics.calculateMetricsFromGames = function(games, cb) {
    if (! _.isArray(games.liked) || ! _.isArray(games.disliked)) {
      return cb('Non-array given to calculateMetricsFromGames', games);
    }

    async.parallel({
      liked: function(acb) {
        BoardGame.find({ _id: { $in: games.liked } }, acb );
      },
      disliked: function(acb) {
        BoardGame.find({ _id: { $in: games.disliked } }, acb );
      }
    }, function(find_err, results) {
      if (find_err) { return cb(find_err); }
      var liked_metrics = _.pluck(results.liked, 'metrics')
        , disliked_metrics = _.pluck(results.disliked, 'metrics')
        , metrics = {
            internal: {
              aesthetic: 3
            , challenge: 3
            , pass_time: 3
            , narrative: 3
            , discovery: 3
            , chance: 3
            }
          , external: {
              confrontation: 3
            , manipulation: 3
            , accumulation: 3
            , teamwork: 3
            }
          };
      // sum likes and dislikes
      _.each(metrics, function(metrics_obj, category) {
        if (_.isFunction(metrics_obj) || category === 'len') { return; }
        _.each(metrics_obj, function(val, metric) {
          // val starts at 3. change it per the liked/disliked games
          _.each(liked_metrics, function(liked_metric) {
            val += liked_metric[category][metric];
          });
          _.each(disliked_metrics, function(disliked_metric) {
            val -= disliked_metric[category][metric] / 2;
          });
          metrics_obj[metric] = val;
        });
      });

      // calculate raw length
      metrics.len = BoardGame.calculateSumProduct(metrics);
      metrics.len = Math.sqrt(metrics.len);
      console.log('raw length is', metrics.len);

      // divide metrics by raw length, multiply by 15
      _.each(metrics, function(metrics_obj, category) {
        if (_.isFunction(metrics_obj) || category === 'len') { return; }
        _.each(metrics_obj, function(val, metric) {
          val = val / metrics.len * 15;
          val = Math.round(val);
          if (val < 1) { val = 1; }
          else if (val > 5) { val = 5; }
          metrics_obj[metric] = val;
        });
      });
      // recalculate length
      metrics.len = BoardGame.calculateSumProduct(metrics);
      metrics.len = Math.sqrt(metrics.len);
      console.log('final length is', metrics.len);

      cb(null, metrics);
    });
  };

  BoardGameSchema.pre('save', function(next) {
    var sum_product = BoardGame.calculateSumProduct(this.metrics);
    this.metrics.len = Math.sqrt(sum_product);
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