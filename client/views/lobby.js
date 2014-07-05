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
    return null;
  return 'disabled';
};

// disable the play button if no name has been entered
Template.multi.disabled = function () {
  var me = player();

  if (me && me.name && opponent_id())
    return null;
  return 'disabled';
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
    Meteor.call( 'exit_game', pid(), gid(), function(error) {
      if (error) {
        console.log(error.reason);
      }
    });
    refresh_player();
  }
};
