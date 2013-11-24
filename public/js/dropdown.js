/* z-index counter. so that the last dropdown will be on top */
var z_counter = 100;

$(function() {
  var $login_trigger = $('#login_trigger')
    , $login_dropdown = $('#login');
  $login_trigger.click(function() {
    toggleDropdown($login_trigger, $login_dropdown,
                   { top: 0
                   , toggle_args: ['slide', { direction: 'up' }, 400] });
    $login_dropdown.find('#login_username').focus();
  });
});

$(function() {
  var $register_trigger = $('#register_trigger')
    , $register_dropdown = $('#register');
  $register_trigger.click(function() {
    toggleDropdown($register_trigger, $register_dropdown,
                   { top: 0
                   , toggle_args: ['slide', { direction: 'up' }, 400] });
    $register_dropdown.find('#register_username').focus();
  });
});

function toggleDropdown($trigger, $dropdown, options) {
  console.log('toggleDropdown called with', $trigger, $dropdown);
  //console.log('$dropdown\'s top and left are', $dropdown.position().top, $dropdown.position().left);
  
  // calculate and set position of $dropdown
  var left = (! _.isUndefined(options.left)) ? options.left : calculateLeft($trigger, $dropdown)
    , top = (! _.isUndefined(options.top)) ? options.top : calculateTop($trigger)
    , toggle_args = options.toggle_args || ['fade']
  $dropdown.css({
    left: left
  , top: top
  ,'z-index': z_counter
  });

  // add or remove active class
  $trigger.toggleClass('active');
  z_counter++;

  // show or hide dropdown
  $dropdown.stop(true, true)
           .toggle.apply($dropdown, toggle_args);
}

function calculateLeft($trigger, $dropdown) {
  // calculate trigger's left and maximum left
  var trigger_left = $trigger.position().left
    , max_left = $(window).width() - $dropdown.width() - 12.5
  // return whichever is less
    , left = trigger_left < max_left ? trigger_left : max_left;
  return left;
}

function calculateTop($trigger) {
  // return vertical position of $trigger's bottom
  console.log($trigger.position().top, $trigger.height());
  return $trigger.position().top + $trigger.height();
}

<!-- Hide/Show Register functionality -->
$.validator.setDefaults({
  messages: {
    new_password_confirm: {
      equalTo: 'Password fields must match.'
    }
  }
});
$(function() {
  $('#register form[action="/register"]').validate();
  $('#login form[action="/login"]').validate();
});