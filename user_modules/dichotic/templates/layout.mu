<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
  <link rel="stylesheet" href="/static/master.css" type="text/css" media="all" charset="utf-8">
  <title>Phonetics Perception Survey</title>
  <script type="text/javascript" src="/static/jquery.js"></script>
  <script type="text/javascript" src="/static/jquery-cookie.js"></script>
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
  </script>
</head>
<body>
  <div id="super-container"><div id="container">
    {{>yield}}
  </div></div>
  <div id="debug">
    <a href="#" id="reset_to_name">Reset to name</a>
    <a href="#" id="reset_to_intro">Reset to intro</a>
    <a href="#" id="two_left">Two left</a>
  </div>
</body>