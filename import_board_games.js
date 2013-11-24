var _ = require('underscore')
  , async = require('async')
  , csv = require('csv')
  , BoardGame = require('./models/board_game');

 csv()
.from.path(__dirname + '/board_games.csv')
.to.array(function(data) {
  var fields = data.shift()
    , board_games = []
    , board_game;
  _.each(data, function(row, i) {
    //console.log('row:', row);
    board_game = _.object(fields, row);
    if (_.isEmpty(board_game.skills_required)) {
      board_game.skills_required = [];
    }
    else {
      board_game.skills_required = board_game.skills_required.split(',');
    }
    board_game = new BoardGame(board_game);
    if (board_game.metrics.internal.aesthetic !== null) {
      board_games.push(board_game);
    }
  });
  async.series([
    function DropBoardGames(acb) {
      BoardGame.remove(acb);
    },
    function AddBoardGames(acb) {
      async.each(board_games, function(board_game, inner_acb) {
        board_game.save(inner_acb);
      }, acb);
    }
  ], exit);
});

function exit(err) {
  if (err) { console.error('Error while saving:', err); }
  process.exit(0);  
}