////////// Server only logic //////////

//DICTIONARY = ['hello', 'how'];


// pauses for a given number of milliseconds (for testing performance)
var pause = function (ms) {
  ms += new Date().getTime();
  while (new Date() < ms){}
} 

// generate a new word to guess
var new_word = function () {
  var num_words = DICTIONARY.length;
  var rand = Math.floor(Math.random() * num_words);
  word_string = DICTIONARY[rand];

  // for debugging
  // var word_string = "hello";

  var letters = (word_string).split('');

  return letters;
};

Meteor.methods({
  start_new_game: function (players) {

    // TODO: focus input upon game start
    // TODO: investigate performance issue

    // create a new game w/ new word
    var game_id = Games.insert({word: new_word(), winner: ''});

    // move everyone who is ready in the lobby to the game
    Players.update({_id: {$in: players}},
                   {$set: {game_id: game_id}},
                   {multi: true});

    // Save a record of who is in the game, so when they leave we can
    // still show them.
    var p = Players.find({game_id: game_id},
                         {fields: {_id: true, name: true}}).fetch();
    Games.update({_id: game_id}, {$set: {players: p}});

    // set the number of guesses for each player
    p.forEach(function(player) {
      Guesses.insert({player_id: player._id, game_id: game_id, left: 10});
    });

    // replicate server latency
    // pause(2000);

    return game_id
  },

  keepalive: function (player_id) {
    Players.update({_id: player_id},
                  {$set: {last_keepalive: (new Date()).getTime(),
                          idle: false}});
  }
});

// monitor/set idle players
Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 70*1000; // 70 sec
  var remove_threshold = now - 60*60*1000; // 1hr

  Players.update({$lt: {last_keepalive: idle_threshold}},
                 {$set: {idle: true}});

  // XXX need to deal with people coming back!
  // Players.remove({$lt: {last_keepalive: remove_threshold}});

}, 30*1000);