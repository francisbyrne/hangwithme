////////// Main client application logic //////////


//////
////// Utility functions
//////

// avoid having to write this over and over
var pid = function () {
  return Session.get('player_id');
};

var gid = function () {
  var g = game();
  return g && game()._id;
};

// return player; defaults to this session's player
var player = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return Players.findOne(id);
};

var opponent_id = function () {
  return Session.get('opponent_id');
};

// get the current player's current game
var game = function () {
  return pid() && Games.findOne({players : pid()});
};

// helper for player state
// returns current state if no arg specified
// else sets the player state to arg
var my_state = function (state) {
  if (typeof state == 'undefined') {
    var p = player();
    return p && p.state;
  } else
    return Players.update(pid(), {$set: {state: state}});
};

// game state methods
var is_pending = function () {
  var g = game();
  return g && g.state === 'pending';
};

var is_playing = function () {
  var g = game();
  return g && g.word;
};

var is_multiplayer = function () {
  var g = game();
  return is_playing() && g.players && g.players.length > 1;
};

// return pending game for player id
// default: current player
var pending_game = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return Games.findOne({state : 'pending', players : id});
};

// TODO: change this for persistent player
// refresh player on game exit; set new player_id and re-subscribe
var refresh_player = function () {
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // pid() will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  var player_id = Players.insert({name: '', 
                                  idle: false, 
                                  state: 'lobby', 
                                  last_keepalive: (new Date()).getTime()});
  Session.set('player_id', player_id);

    // subscribe to all the players, the game i'm in, and all
  // my guessed letters in that game.
  Meteor.autosubscribe(function () {
    Meteor.subscribe('players');
    Meteor.subscribe('games');
    if (pid() && gid()) {
      Meteor.subscribe('letters', pid(), gid());
      Meteor.subscribe('guesses', pid(), gid());
    }
  });

  Session.set('error', '');

  // draw complete hangman
  Meteor.setTimeout( draw_hangman, 250);
};

// get the "good" letters for a player
var correct_letters = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return gid() && Letters.find({player_id: id, 
                                game_id: gid(), 
                                state: 'good'});
};

// returns number of guesses left for player
// default: current player
var guesses_left = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  var g = game();
  var guesses = g && Guesses.findOne({player_id: id, game_id: g._id});

  return guesses && guesses.left;
};

// return player to lobby and, if they are the last player to leave,
// remove the game, letters and players
var exit_game = function (player_id, game_id) {
    
  Players.update(player_id, {$set: {state: 'completed'}});
  refresh_player();

  // if player is last to leave
  var g = Games.findOne(game_id);
  if (Players.find({_id : {$in: g.players}, state: 'playing'}).count() < 1) {
    Letters.remove({player_id: {$in: g.players}, game_id: game_id});
    Guesses.remove({player_id: {$in: g.players}, game_id: game_id});
    Players.remove({_id: {$in: g.players}});
    Games.remove({_id: game_id});
  }
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
  var guessed_letters = Letters.find({player_id: pid(), 
                          game_id: gid()});
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
  if (is_multiplayer())
    return 'multiplayer';
  else
    return 'singleplayer';
};

Template.main.info = function () {
  return (is_multiplayer()) ? true : false;
};

Template.main.players = function () {
  var g = game();
  if (is_playing() && g.players && g.players.length >= 1)
    return g.players;
  else
    return [true];
};

Template.main.player_id = function () {
  var id = this.toString();
  return id;
};

Template.header.show = function () {
  return is_playing();
};

// display player name
Template.header.my_name = function() {
  var id = this.toString();
  return player(id) && player(id).name;
};

// display winner
Template.header.winlose = function () {
  var g = game();
  var id = this.toString();
  if (g && g.winner && g.winner == id)
    return 'winner';
  else if (g && g.winner || guesses_left(id) <= 0)
    return 'loser';
  return '';
};

// determine whether in game or in lobby
Template.hangman.ingame = function () {
  return is_playing();
};

Template.hangman.player_id = function () {
  var id = this.toString();
  return id;
};

// return the number of guesses the player has left
Template.hangman.guesses_left = function () {
  var id = this.toString();
  var guesses = Guesses.findOne({player_id: id, game_id: gid()});

  if (typeof guesses !== 'undefined' && typeof guesses.left !== 'undefined') {
    // re-draw hangman based on guesses; timeout is so render doesn't overwrite
    Meteor.setTimeout(function () {
      draw_hangman(guesses);
    }, 10);
    
    return guesses.left;
  } else
    return '';
};

Template.word.show = function () {
  return is_playing();
};

// TODO: this needs to be reviewed/refactored
// display all the guessed letters in the word, showing '_' for gaps
Template.word.correct_letters = function () {
  var word = [];
  var is_in_word;
  var g = game();
  var no_gaps = true;
  var id = this.toString();

  // if a winner is declared (or single player and no guesses left)
  // display the solved word
  if (g && g.winner == id 
    || is_playing() && ! is_multiplayer() && guesses_left() <= 0) {

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
      win(g._id, id);
    }
  }
  
  return word;
};

Template.wrong_letters.show = function () {
  return is_playing();
};

// display all incorrectly guessed words
Template.wrong_letters.wrong_letters = function () {
  var id = this.toString();
  var me = player(id);

  // if no player or game return empty
  if (!me || !gid()) return undefined;

  // get all bad letters
  var letters = Letters.find({player_id: me._id, 
                                game_id: gid(), 
                                state: 'bad'});

  // if opponent, mask letters
  if (is_multiplayer() && player()._id !== id) {
    var masked_letters = [];
    letters.forEach( function (letter) {
      masked_letters.push({letter: '+'});
    });
    return masked_letters;
  } else {
    // else show all letters
    return letters
  }

  return me && gid() && Letters.find({player_id: me._id, 
                                game_id: gid(), 
                                state: 'bad'});
};

Template.validation.error = function () {
  var id = this.toString();
  if ( pid() == id )
    return Session.get('error');
  else
    return undefined;
};

Template.guess.show = function () {
  var g = game();
  var id = this.toString();
  return pid() == id && is_playing() && ! g.winner && guesses_left() > 0;
};

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
  return my_state() === 'lobby' && ! pending_game();
};

// show players waiting in the lobby 
// (not current player, with names and in lobby)
Template.lobby.waiting = function () {
  var players = Players.find({_id: {$ne: pid()},
                              name: {$ne: ''},
                              state: 'lobby'});

  return players;
};

// display number of players in the lobby 
// (not current player, with names and in lobby)
Template.lobby.count = function () {
  var players = Players.find({_id: {$ne: pid()},
                              name: {$ne: ''},
                              state: 'lobby'});

  return players.count();
};

// disable the play button if no name has been entered
Template.lobby.disabled = function () {
  var me = player();
  if (me && me.name)
    return '';
  return 'disabled="disabled"';
};

// disable the play button if no name has been entered
Template.multi.disabled = function () {
  var me = player();

  if (me && me.name && opponent_id())
    return '';
  return 'disabled="disabled"';
};

Template.lobby.loader = function () {
  return my_state() === 'waiting';
};

Template.lobby.events = {

  // update the player's name as they type
  'keyup input#myname': function (evt) {
    var name = $('#lobby input#myname').val().trim();
    Players.update(pid(), {$set: {name: name}});
  },

  // update the opponent upon selection
  'mouseup option.player': function (evt) {
    Session.set('opponent_id', $('#opponents').val());
  },

  // select a player and click invite to invite them to a game
  // creates player array, creates new game and sends invitation to opponent
  'click button#invite': function (evt) {
    var player_ids = [player()._id];
    player_ids.push(opponent_id());
    Meteor.call('invite_players', player_ids, function(error, result) {
      if ( typeof result !== Meteor.Error ) my_state('waiting');
    });
  },

  // launches a solo game
  'click button#solo, keyup input#myname': function (evt) {
    if (evt.type === "click" ||
        (evt.type === "keyup" && evt.which === 13)) {

      var player_ids = [player()._id];
      Meteor.call('invite_players', player_ids, function (error, result) {
        my_state('waiting');
        Meteor.call('start_game', result);
      });
    }
  }
};

// show invite message when game is pending
Template.invite.show = function () {
  return my_state() === 'lobby' && pending_game();
};

// return players versing in game invitation
Template.invite.versus = function () {
  var message = "";
  var players = pending_game().players;

  for (var i = 0; i < players.length - 1; i++ ) {
    message += player(players[i]).name + " vs ";
  }

  message += player(players[i]).name;

  return message;
};

// handle accepting or declining game invitation
Template.invite.events = {
  'click button#accept': function (evt) {
    Meteor.call('start_game', gid(), function (error, result) {});
  },
  'click button#decline': function (evt) {
    Players.update( {_id: {$in: pending_game().players}}, 
                    {$set : {state : 'lobby'}},
                    {multi : true});
    remove_game(pending_game()._id);
  }
};

Template.postgame.show = function () {
  var g = game();
  var id = this.toString();
  return is_playing() && pid() == id  
    && (g.winner || guesses_left(id) <= 0);
};

Template.postgame.events = {
  'click button': function (evt) {
    exit_game(pid(), gid());
  }
};

//////
////// Initialization
//////

Meteor.startup(function () {

  // preserve inputs
  Template.lobby.preserve({
    'input[id]': function (node) { return node.id; }
  });

  Template.guess.preserve({
    'input[id]': function (node) { return node.id; }
  });

  // add new player and subscribe
  refresh_player();

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected) {
      Meteor.call('keepalive', pid());
    }
  }, 20*1000);
});