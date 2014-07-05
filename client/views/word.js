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
