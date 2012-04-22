////////// Main client application logic //////////


//////
////// Utility functions
//////

// avoid having to write this over and over
var pid = function () {
  return Session.get('player_id');
};

// return player; defaults to this session's player
var player = function (player_id) {
  var id = (typeof player_id == 'undefined') ?
     pid() : player_id;
  return Players.findOne(id);
};

var game = function () {
  var me = player();
  return me && me.game_id && Games.findOne(me.game_id);
};

var is_multiplayer = function () {
  var g = game();
  return g && g.players && g.players.length > 1;
};


var correct_letters = function (player_id) {
  var id = (typeof player_id == 'undefined') ?
     pid() : player_id;
  var me = player(id);
  return me && me.game_id && Letters.find({player_id: me._id, 
                                game_id: me.game_id, 
                                state: 'good'});
};

// returns number of guesses left for player
// default: current player
var guesses_left = function (player_id) {
  var id = (typeof player_id == 'undefined') ?
     pid() : player_id;
  var me = player(id);
  var guesses = me && Guesses.findOne({player_id: id,
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

Template.main.multiplayer = function () {
  var g = game();
  if (is_multiplayer())
    return 'multiplayer';
  else
    return 'singleplayer';
};

Template.main.players = function () {
  var g = game();
  if (g && g.players) {
    return g.players;
  }
  else {
    return [true];
  }
};

Template.header.show = function () {
  return game();
};

// display player name
Template.header.my_name = function() {
  return this.name;
};

// display winner
Template.header.winlose = function () {
  var g = game();
  if (g && g.winner && g.winner == this._id)
    return 'winner';
  else if (g && g.winner || guesses_left(this._id) <= 0)
    return 'loser';
  return '';
};

// determine whether in game or in lobby
Template.hangman.ingame = function () {
  return game();
};

// return the number of guesses the player has left
Template.hangman.guesses_left = function () {
  return guesses_left(this._id);
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
  var id = this._id;

  // if a winner is declared, just display the solved word
  if (g && g.winner == this._id) { //|| guesses_left(id) <= 0) {
    g.word.forEach( function (letter) {
      word.push({letter: letter});
    });
  } else if (g && g.word && id && correct_letters(id)) {

    // otherwise display guessed letters (or + for opponent)
    g.word.forEach( function (word_letter) {
      is_in_word = false;
      correct_letters(id).forEach( function (letter) {
        if (word_letter == letter.letter) {
          if (id == pid() || g && g.winner == id)
            word.push({letter: word_letter});
          else
            word.push({letter: '+'});
          is_in_word = true;
        }
      });

      // display _ for gaps
      if ( ! is_in_word ) {
        word.push({letter: '_'});
        no_gaps = false;
      }
    });

    // if no gaps exist, declare the player winner
    if (no_gaps) {
      win(g._id, this._id);
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
  var me = player(this._id);
  if (!me || !me.game_id) return undefined;

  var letters = Letters.find({player_id: me._id, 
                                game_id: me.game_id, 
                                state: 'bad'});

  if (is_multiplayer() && player()._id !== this._id) {
    var masked_letters = [];
    letters.forEach( function (letter) {
      masked_letters.push({letter: '+'});
    });
    return masked_letters;
  } else {
    return letters
  }

  return me && me.game_id && Letters.find({player_id: me._id, 
                                game_id: me.game_id, 
                                state: 'bad'});
};

Template.validation.error = function () {
  if ( pid() == this._id)
    return Session.get('error');
  else
    return undefined;
};

Template.guess.show = function () {
  var g = game();

  return pid() == this._id && g && ! g.winner && guesses_left() > 0;
};

// TODO: get working for mobile
Template.guess.events = {
  'click button, keyup input': function (evt) {
    var textbox = $('#guess input');
    var g = game();

    // if user clicked the button or hit enter
    if (evt.type === "click" ||
        (evt.type === "keyup" && evt.which === 13)) {

      // grab the letter entered
      letter = textbox.val().toLowerCase();

      // check if the letter is valid
      if (is_valid_letter(letter)) {

        // if so, insert it
        var letter_id = Letters.insert({player_id: pid(),
                                    game_id: g && g._id,
                                    letter: letter,
                                    state: 'pending'});

        // and set it to "good" or "bad" 
        // based on whether it's in the word or not
        Meteor.call('set_letter_state', letter_id);

      }

      // clear and refocus the input
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
  var players = Players.find({_id: {$ne: pid()},
                              name: {$ne: ''},
                              game_id: {$exists: false}});

  return players;
};

// display number of players in the lobby 
// (not current player, with names and not in game)
Template.lobby.count = function () {
  var players = Players.find({_id: {$ne: pid()},
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
    Players.update(pid(), {$set: {name: name}});
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
  var g = game();
  return g && pid() == this._id  && (g.winner || guesses_left(this._id) <= 0);
};

Template.postgame.events = {
  'click button': function (evt) {
    Players.update(pid(), {$set: {game_id: null}});
  }
};

//////
////// Initialization
//////

Meteor.startup(function () {
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // pid() will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  var player_id = Players.insert({name: '', idle: false});
  Session.set('player_id', player_id);

  // subscribe to all the players, the game i'm in, and all
  // my guessed letters in that game.
  Meteor.autosubscribe(function () {
    Meteor.subscribe('players');

    if (pid()) {
      var me = player();
      if (me && me.game_id) {
        Meteor.subscribe('games', me.game_id);
        Meteor.subscribe('letters', me._id, me.game_id);
      }
    }
  });

  error = '';

  // TODO: fix issue where guess box is cleared/unfocussed 
  // every time this is called

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected) {
      Meteor.call('keepalive', pid(), function() {
        $('#guess input').focus();
      });
    }
  }, 20*1000);
});