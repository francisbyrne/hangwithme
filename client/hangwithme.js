////////// Main client application logic //////////


//////
////// Utility functions
//////

var player = function () {
  return Players.findOne(Session.get('player_id'));
};

var game = function () {
  var me = player();
  return me && me.game_id && Games.findOne(me.game_id);
};

var correct_letters = function () {
  var me = player();
  return me && me.game_id && Letters.find({player_id: me._id, 
                                game_id: me.game_id, 
                                state: 'good'});
};

var guesses_left = function () {
  var me = player();
  var guesses = me && Guesses.findOne({player_id: me._id,
                                game_id: me.game_id});

  return guesses && guesses.left;
};

// check whether letter is alpha and hasn't already been guessed
var is_valid_letter = function (letter) {
  
  // check if letter is non-blank
  if (letter == "") {
    Session.set('error', 'Enter a letter!');
    return false;
  }

  // check if letter is alphabetical
  var lwr = 'abcdefghijklmnopqrstuvwxyz';
  var upr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var alpha = lwr+upr;
  if (alpha.indexOf(letter,0) == -1) {
    Session.set('error', 'Enter a letter!');
    return false;
  }

  // check if letter has already been guessed
  var me = player();
  var guessed_letters = Letters.find({player_id: me._id, 
                          game_id: me.game_id});
  var is_valid = true;

  guessed_letters.forEach( function(guessed_letter) {
    if (guessed_letter.letter == letter) {
      is_valid = false;
      Session.set('error', 'Letter already guessed!');
    }
  });

  if (is_valid) Session.set('error', undefined);

  return is_valid;
};

Template.player.show = function () {
  return game();
};

// display player name
Template.player.my_name = function() {
  return player().name;
};

// display winner
Template.player.winlose = function () {
  var g = game();
  if (g.winner && g.winner == player()._id)
    return 'winner';
  else if (g.winner || guesses_left() <= 0)
    return 'loser';
  return '';
};

// determine whether in game or in lobby
Template.hangman.ingame = function () {
  return game();
};

// return the number of guesses the player has left
Template.hangman.guesses_left = function () {
  return guesses_left();
};

Template.word.show = function () {
  return game();
};

// display all the guessed letters in the word, showing '_' for gaps
Template.word.correct_letters = function () {
  var word = [];
  var is_in_word;
  var g = game();
  var no_gaps = true;

  // if a winner is declared, just display the solved word
  if (g.winner || guesses_left() <= 0) {
    g.word.forEach( function (letter) {
      word.push({letter: letter});
    });
  } else {

    // otherwise display guessed letters
    g.word.forEach( function (word_letter) {
      is_in_word = false;
      correct_letters().forEach( function (letter) {
        if (word_letter == letter.letter) {
          word.push({letter: word_letter});
          is_in_word = true;
        }
      });

      // and gaps 
      if ( ! is_in_word ) {
        word.push({letter: '_'});
        no_gaps = false;
      }
    });

    // if no gaps exist, declare the player winner
    if (no_gaps) {
      win(game()._id, Session.get('player_id'));
    }
  }
  
  return word;
};

Template.wrong_letters.show = function () {
  return game();
};

// display all incorrectly guessed words
// TODO: add commas between letters
Template.wrong_letters.wrong_letters = function () {
  var me = player();

  return me && me.game_id && Letters.find({player_id: me._id, 
                                game_id: me.game_id, 
                                state: 'bad'});
};

Template.validation.error = function () {
  return Session.get('error');
};

Template.guess.show = function () {
  return game() && ! game().winner && guesses_left() > 0;
};

Template.guess.events = {
  'click button, keyup input': function (evt) {
    var textbox = $('#guess input');

    // if we clicked the button or hit enter
    if (evt.type === "click" ||
        (evt.type === "keyup" && evt.which === 13)) {

      letter = textbox.val().toLowerCase();

      if (is_valid_letter(letter)) {
        var letter_id = Letters.insert({player_id: Session.get('player_id'),
                                    game_id: game() && game()._id,
                                    letter: letter,
                                    state: 'pending'});

        Meteor.call('set_letter_state', letter_id);
      } else {
        // send error message
      }
      textbox.val('');
      textbox.focus();
    }
  }
};

//////
////// lobby template: shows everyone not currently playing, and
////// offers a button to start a fresh game.
//////

Template.lobby.show = function () {
  // only show lobby if we're not in a game or loading
  return ! Session.get('loading') && ! game();
};

// show players waiting in the lobby 
// (not current player, with names and not in game)
Template.lobby.waiting = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players;
};

// display number of players in the lobby 
// (not current player, with names and not in game)
Template.lobby.count = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players.count();
};

// disable the play button if no name has been entered
Template.lobby.disabled = function () {
  var me = player();
  if (me && me.name)
    return '';
  return 'disabled="disabled"';
};

Template.lobby.loader = function () {
  return Session.get('loading');
};

Template.lobby.events = {

  // update the player's name as they type
  'keyup input#myname': function (evt) {
    var name = $('#lobby input#myname').val().trim();
    Players.update(Session.get('player_id'), {$set: {name: name}});
  },

  // when the player clicks play or presses enter, display loader and
  // start game
  'click button.startgame, keyup input#myname': function (evt) {
    if (evt.type === "click" ||
        (evt.type === "keyup" && evt.which === 13)) {
      Session.set('loading', true);
      Meteor.call('start_new_game', function() {
        Session.set('loading', undefined);
      });
    }
  }
};

Template.postgame.show = function () {
  return game() && (game().winner || guesses_left() <= 0);
};

Template.postgame.events = {
  'click button': function (evt) {
    Players.update(Session.get('player_id'), {$set: {game_id: null}});
  }
};

//////
////// Initialization
//////

Meteor.startup(function () {
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // Session.get('player_id') will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  var player_id = Players.insert({name: '', idle: false});
  Session.set('player_id', player_id);

  // subscribe to all the players, the game i'm in, and all
  // my guessed letters in that game.
  Meteor.autosubscribe(function () {
    Meteor.subscribe('players');

    if (Session.get('player_id')) {
      var me = player();
      if (me && me.game_id) {
        Meteor.subscribe('games', me.game_id);
        Meteor.subscribe('letters', me._id, me.game_id);
      }
    }
  });

  error = '';

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 20*1000);
});