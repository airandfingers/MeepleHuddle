(function(exports) {
  var db_config = require('./db.config') //connection information for users-db
    , mongoose = require('mongoose') //MongoDB abstraction layer
    , express = require('express')
    , MongooseStore = require('session-mongoose')(express); //used as our session store

  var url = 'mongodb://' + db_config.DB_HOST + ':' + db_config.DB_PORT + '/' + db_config.DB_NAME
    , credentials = { user: db_config.DB_USER, pass: db_config.DB_PASSWORD };
  mongoose.connect(url, credentials);
  mongoose.connection.on('error', function(err) { console.error(err); });

  exports.session_store = new MongooseStore({
    connection: mongoose.connection
  }, function onConnect() {
    exports.session_store.connected = true;
  });

})(module.exports = {});