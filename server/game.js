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

Meteor.startup(function () {
    // publish all the non-idle players.
    Meteor.publish('players', function () {
      return Players.find({idle: false});
    });

    // publish single games
    Meteor.publish('games', function () {
      return Games.find();
    });

    // publish all my guessed letters
    Meteor.publish('letters', function (player_id, game_id) {
      return Letters.find({player_id: player_id, game_id: game_id});
    });

    // publish all guesses
    Meteor.publish('guesses', function (player_id, game_id) {
      return Guesses.find({player_id: player_id, game_id: game_id});
    });

});

// monitor/set idle players
Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 70*1000; // 70 sec
  var remove_threshold = now - 10*60*1000; // 10mins

  Players.update({last_keepalive: {$lt: idle_threshold}},
                 {$set: {idle: true}});

  // XXX need to deal with people coming back!
  Players.remove({last_keepalive: {$lt: remove_threshold}});

 }, 30*1000);

// reset db once a day, to prevent performance degradation
Meteor.setInterval(function () {
  reset();
 }, 24*60*60*1000);