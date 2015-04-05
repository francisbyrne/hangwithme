//////
////// Utility functions
//////

// avoid having to write this over and over
pid = function () {
  return Session.get('player_id');
};

gid = function () {
  var g = game();
  return g && game()._id;
};

// return player; defaults to this session's player
player = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return Players.findOne(id);
};

opponent_id = function () {
  return Session.get('opponent_id');
};

// get the current player's current game
game = function () {
  return pid() && Games.findOne({players : pid()});
};

// helper for player state
// returns current state if no arg specified
// else sets the player state to arg
my_state = function (state) {
  if (typeof state == 'undefined') {
    var p = player();
    return p && p.state;
  } else
    return Players.update(pid(), {$set: {state: state}});
};

// game state methods
is_pending = function () {
  var g = game();
  return g && g.state === 'pending';
};

is_playing = function () {
  var g = game();
  return g && g.word;
};

is_multiplayer = function () {
  var g = game();
  return is_playing() && g.players && g.players.length > 1;
};

// return pending game for player id
// default: current player
pending_game = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return Games.findOne({state : 'pending', players : id});
};

// TODO: change this for persistent player
// refresh player on game exit; set new player_id and re-subscribe
refresh_player = function () {
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
  Meteor.autorun(function () {
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
correct_letters = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  return gid() && Letters.find({player_id: id, 
                                game_id: gid(), 
                                state: 'good'});
};

// returns number of guesses left for player
// default: current player
guesses_left = function (player_id) {
  var id = (typeof player_id == 'undefined') ? pid() : player_id;
  var g = game();
  var guesses = g && Guesses.findOne({player_id: id, game_id: g._id});

  return guesses && guesses.left;
};

// check whether letter is alpha and hasn't already been guessed
is_valid_letter = function (letter) {
  
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