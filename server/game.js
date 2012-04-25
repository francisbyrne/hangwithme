////////// Server only logic //////////

//DICTIONARY = ['hello', 'how'];


// pauses for a given number of milliseconds (for testing performance)
var pause = function (ms) {
  ms += new Date().getTime();
  while (new Date() < ms){}
};

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

  // create game_id and send invitation to players to start
  invite_players: function (player_ids) {
    var game_id = Games.insert({players: player_ids, state: 'pending'});
    return game_id;
  },

  // update the game with a new word and set play states to playing
  // and set guesses
  start_game: function (game_id) {
    var g = Games.findOne(game_id);
    Players.update ({_id: {$in: g.players}}, 
                    {$set: {state: 'playing'}}, 
                    {multi: true});
    for (player in g.players)
      Guesses.insert({player_id: g.players[player], game_id: game_id, left: 10});

    Games.update(game_id, {$set: {word: new_word(), winner: '', state: 'playing'}});
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
  Players.remove({$lt: {last_keepalive: remove_threshold}});

 }, 30*1000);