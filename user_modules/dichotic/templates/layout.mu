<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
  <link rel="stylesheet" href="/static/master.css" type="text/css" media="all" charset="utf-8">
  <title>Phonetics Perception Survey</title>
  <script type="text/javascript" src="/static/jquery.js"></script>
  <script type="text/javascript" src="/static/jquery-ui.js"></script>
  <link rel="stylesheet" href="/static/jquery-ui/jquery-ui.css" type="text/css" media="all" charset="utf-8">
  <script type="text/javascript" src="/static/soundmanager2-jsmin.js"></script>
  <script>
  var cookie_defaults = { expires: 31, path: '/' };
  var page_loaded = new Date();
  soundManager.url = '/static/swf/';
  soundManager.useFlashBlock = false; // optionally, enable when you're ready to dive in
  soundManager.debugMode = false;
  soundManager.flashVersion = 9; // optional: shiny features (default = 8)
  soundManager.useFastPolling = false;
  soundManager.useHighPerformance = false;
  // enable HTML5 audio support, if you're feeling adventurous. iPad/iPhone will always get this.
  // soundManager.useHTML5Audio = true;
  $(function() {
    var remaining = $.cookie('remaining').split(',');
    $('#reset_to_name').click(function(ev) {
      ev.preventDefault();
      $.cookie('action', 'name', cookie_defaults);
    });
    $('#reset_to_intro').click(function(ev) {
      ev.preventDefault();
      $.cookie('action', 'intro', cookie_defaults);
    });
    $('#two_left').click(function(ev) {
      ev.preventDefault();
      $.cookie('action', 'stimulus', cookie_defaults);
      $.cookie('remaining', remaining.slice(-2), cookie_defaults);
    });
  });
  
  // playSoundChain takes an array: [{id: <soundManagerSoundId>, reveal: <jQuerySelector>}, ... ],
  //   and a callback, to call when they've all finished.
  function playSoundChain(interval, callback, sound_reveals) {
    var sound_id = sound_reveals[0].id;
    var reveal = sound_reveals[0].reveal;
    var next_sound_reveals = sound_reveals.slice(1);
    soundManager.play(sound_id, {
      onfinish: function() {
        $(reveal).css({visibility: 'visible'});
        if (next_sound_reveals.length > 0 && next_sound_reveals[0]) {
          setTimeout(function() {
            playSoundChain(interval, callback, next_sound_reveals);
          }, interval);
        }
        else if (callback) {
          callback();
        }
      }
    });
  }
  function changeAction(action) {
    $.cookie('action', action, cookie_defaults);
    window.location = '/dichotic/';
  }
  function sendResponses(stimulus_ids) {
    var done = new Date();
    var responses = [];
    $.each(stimulus_ids, function(index, stimulus_id) {
      var selector = 'input[name=' + stimulus_id + ']';
      var value = $(selector).val();
      var type = $(selector).attr('type');
      if (type === "radio" || type === "checkbox") {
        // look up the input with a better selector for checkboxes/radio buttons
        value = $(selector + ':checked').val();
      }
      if (value) {
        responses.push({ stimulus_id: stimulus_id, total_time: (done - page_loaded), value: value });
      }
    });
    $.post('/api/1/responses', JSON.stringify({ responses: responses }));
  }
  </script>
</head>
<body>
  <div id="super-container"><div id="container">
    {{>yield}}
  </div></div>
  {{|<div id="debug">
    <a href="#" id="reset_to_name">Reset to name</a>
    <a href="#" id="reset_to_intro">Reset to intro</a>
    <a href="#" id="two_left">Two left</a>
  </div>}}
</body>