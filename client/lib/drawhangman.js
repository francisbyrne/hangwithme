// hangman image drawing methods

// draws hangman image based on number of guesses passed in
// if no guesses are passed in, show whole image
draw_hangman = function(guesses) {

  var total_guesses = 10;
  var colour = "#000000";
  var line_width = 3;
  var is_ingame = false;

  // if guesses or attributes aren't set, get single canvas 
  // and draw whole image (also sets whether dead face is drawn)
  if (typeof guesses !== 'undefined'
      && typeof guesses.player_id !== 'undefined'
      && typeof guesses.left !== 'undefined' )
    is_ingame = true;

  if ( ! is_ingame) {
    var context = $("#hangCanvas")[0].getContext("2d");
    var guesses_left = 0
  } else {
    // otherwise get canvas based on id tag in player DOM element
    // and draw only the parts of hangman that player has guessed wrong
    var context = $('#' + guesses.player_id)
                    .find("#hangCanvas")[0].getContext("2d");
    var guesses_left = guesses.left;
  }

  context.strokeStyle = colour;
  context.lineWidth = line_width;

  // clear canvas before drawing anything
  clear_canvas(context);

  // countdown guesses left, drawing a part of image at each step
  var i;
  for ( i = total_guesses; i >= guesses_left; i-- ) {
    switch (i) {
      case (9):
        draw_ground(context);
        break;
      case (8):
        draw_vertical_beam(context);
        break;
      case (7):
        draw_horizontal_beam(context);
        break;
      case (6):
        draw_noose(context);
        break;
      case (5):
        draw_head(context);
        break;
      case (4):
        draw_torso(context);
        break;
      case (3):
        draw_left_arm(context);
        break;
      case (2):
        draw_right_arm(context);
        break;
      case (1):
        draw_left_leg(context);
        break;
      case (0):
        draw_right_leg(context);

        // if player loses, draw dead face
        if (is_ingame) draw_death(context);

        break;
    }
  }
};

var clear_canvas = function (context) {
  // I have lots of transforms right now
  context.save();
  context.setTransform(1,0,0,1,0,0);
  // Will always clear the right space
  context.clearRect(0,0,context.canvas.width,context.canvas.height);
  context.restore();
  // Still have my old transforms
};

var draw_ground = function (context) {
  context.moveTo(20,190);
  context.lineTo(230,190);
  context.stroke();
};

var draw_vertical_beam = function (context) {
  context.moveTo(20,190);
  context.lineTo(20,20);
  context.stroke();
};

var draw_horizontal_beam = function (context) {
  context.moveTo(20,20);
  context.lineTo(130,20);
  context.stroke();
};

var draw_noose = function (context) {
  context.moveTo(130,20);
  context.lineTo(130,40);
  context.stroke();
};

var draw_head = function (context) {
  context.beginPath();
  context.arc(130,60,20,0,Math.PI*2,true);
  context.closePath();
  context.stroke();
};

var draw_torso = function (context) {
  context.moveTo(130,80);
  context.lineTo(130,130);
  context.stroke();
};

var draw_left_arm = function (context) {
  context.moveTo(130,90);
  context.lineTo(100,115);
  context.stroke();
};

var draw_right_arm = function (context) {
  context.moveTo(130,90);
  context.lineTo(160,115);
  context.stroke();
};

var draw_left_leg = function (context) {
  context.moveTo(130,130);
  context.lineTo(100,165);
  context.stroke();
};

var draw_right_leg = function (context) {
  context.moveTo(130,130);
  context.lineTo(160,165);
  context.stroke();
};

var draw_death = function (context) {
  context.lineWidth = 2;

  context.moveTo(119,52);
  context.lineTo(127,60);
  context.stroke();

  context.moveTo(119,60);
  context.lineTo(127,52);
  context.stroke();

  context.moveTo(141,52);
  context.lineTo(133,60);
  context.stroke();

  context.moveTo(141,60);
  context.lineTo(133,52);
  context.stroke();

  context.moveTo(120,70);
  context.lineTo(140,70);
  context.stroke();
};