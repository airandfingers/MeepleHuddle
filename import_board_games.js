var _ = require('underscore')
  , async = require('async')
  , csv = require('csv')
  , BoardGame = require('./models/board_game');

 csv()
.from.path(__dirname + '/board_games.csv')
.to.array(function(data) {
  var fields
    , board_game;
  _.each(data, function(row, i) {
    //console.log('row:', row);
    if (i === 0) {
      fields = row;
    }
    else {
      board_game = _.object(fields, row);
      board_game.skills_required = board_game.skills_required.split(',');
      board_game = new BoardGame(board_game);
      console.log('board_game:', board_game);
    }
  });
  exit();
});

function exit() {
  process.exit(0);  
}