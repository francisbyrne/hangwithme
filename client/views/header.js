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