////////// Main client application logic //////////

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

//////
////// Initialization
//////

Meteor.startup(function () {

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