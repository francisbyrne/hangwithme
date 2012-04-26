////////// Shared code (client and server) //////////

Games = new Meteor.Collection('games');
// { word: ['h','a','p','p','y'], players: [player_id],
// winner: player_id, state: 'pending'}
// state is one of: 'pending', 'playing', 'completed'

Players = new Meteor.Collection('players');
// {name: 'matt', state: 'lobby', idle: false, keepalive: 010203003302}
// state is one of: 'lobby', 'waiting', 'playing', 'completed'

Letters = new Meteor.Collection('letters');
// {player_id: 10, game_id: 123, letter: 'a', state: 'good'}

Guesses = new Meteor.Collection('guesses');
// {player_id: 10, game_id: 123, left: 8}


// boolean function whether letter is in word to guess
var check_letter = function (letter_id) {
  var letter = Letters.findOne(letter_id);
  var game = Games.findOne(letter.game_id);

  if (game.word.indexOf(letter.letter,0) == -1) {
    return false;
  } else {
    return true;
  }
};

// end the game with a winner
var win = function (game_id, player_id) {
  Games.update(game_id, {$set: {winner: player_id}});
};

var remove_game = function (game_id) {
  return Games.remove(game_id);
};

// remotely accessible methods for client
Meteor.methods({

  // set the state of the letter based on whether it is in the word
  set_letter_state: function (letter_id) {

    is_in_word = check_letter(letter_id);

    if (is_in_word) {
      Letters.update(letter_id, {$set: {state: 'good'}});
    } else {
      Letters.update(letter_id, {$set: {state:'bad'}});
      var letter = Letters.findOne(letter_id);

      // decrement the player's guesses left
      var guess_id = Guesses.update({player_id: letter.player_id, 
                          game_id: letter.game_id}, 
                        {$inc: {left: -1}});

      // check if the player has no guesses left
      var guesses = Guesses.findOne(guess_id);
      if (guesses && guesses.left <= 0) {
        // declare the other player the winner
        var opponent = Players.findOne( {$and: [{game_id: letter.game_id}, {
                          player_id: {$ne: letter.player_id}}]});
        win(letter.game_id, opponent.player_id);
      }
    }
  }
});


if (Meteor.is_server) {
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

}