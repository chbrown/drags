<script>
var soundManagerReady = false;
soundManager.onready(function() {
  soundManager.createSound('1', '/static/dichotic/control/{{category}}/{{control_1_file}}.mp3');
  soundManager.createSound('2', '/static/dichotic/control/{{category}}/{{control_2_file}}.mp3');
  soundManager.createSound('3', '/static/dichotic/stereo/{{category}}/{{stimulus_file}}.mp3');
  soundManagerReady = true;
});
var stimulus_gap = 300;
var heard = false;
var heard_at = null;
var total = 166; // hack
var stimulus_id = {{stimulus_id}};
var remaining;
var next_enabled = false;
var shortcuts_visible = false;
var autoplay = false;

function setHeard() {
  $("a#play").addClass('disabled');
  $('#controls').css({visibility: 'visible'});
  $('#sound_1').css({visibility: 'visible'});
  $('#sound_2').css({visibility: 'visible'});
  $('#sound_3').css({visibility: 'visible'});
  heard = true;
  $.cookie('heard', 'true', cookie_defaults);
}
function listen(ev) {
  if (ev)
    ev.preventDefault(); // don't jump up to the top for the hash.
  if (!heard) {
    playSoundChain(300, setHeard, [
      {id: '1', reveal: '#sound_1'},
      {id: '2', reveal: '#sound_2'},
      {id: '3', reveal: '#sound_3'},
    ])
  }
  else {
    $("a#play").addClass('hover');
    setTimeout(function() { 
      $("a#play").removeClass('hover'); 
    }, 1000);
  }
}

// function submitResponse(stimulus_id) {
// }
function next(ev) {
  if (next_enabled) {
    // prevent from continuing until the selected something.
    var done = new Date();
    
    var value = $('input[name=' + stimulus_id + ']:checked').val();
    var sureness = Math.floor($("#sureness").slider("value"))
    var response_data = JSON.stringify({ responses: [{ 
      stimulus_id: stimulus_id, total_time: (done - page_loaded), value: value, sureness: sureness
    }] });
    //console.log('Sending ajax response: ' + value);
    $.ajax({
      url: '/api/1/responses',
      type: 'POST',
      data: response_data,
      dataType: 'text',
      complete: function() {
        remaining = remaining.slice(1)
        if (remaining.length > 0) {
          $.cookie('remaining', remaining, cookie_defaults);
          $.cookie('heard', 'false', cookie_defaults);
        }
        else {
          $.cookie('action', 'debrief', cookie_defaults);
        }
        window.location = '/dichotic/';
      }
    });
  }
}
function enableNext() {
  if (heard) {
    $("#next").attr("disabled", null);
    next_enabled = true;
  }
}
function refreshShortcutsVisible() {
  $('#shortcuts').toggle(shortcuts_visible);
  $.cookie('shortcuts_visible', shortcuts_visible ? 'true' : 'false', cookie_defaults);
}
function refreshHideSureness(hide_sureness) {
  // var visibility = ;
  $('.sureness').css({visibility: hide_sureness ? "hidden" : ""});
  $('#hide_sureness').attr('checked', hide_sureness ? "checked" : "");
  $.cookie('hide_sureness', hide_sureness ? 'true' : 'false', cookie_defaults);
}
$(function() {
  remaining = $.cookie('remaining').split(',');

  shortcuts_visible = $.cookie('shortcuts_visible') == 'true';
  refreshShortcutsVisible();

  autoplay = $.cookie('autoplay') == 'true';
  if (autoplay) {
    $('#autoplay').attr('checked', 'checked');
  }

  refreshHideSureness($.cookie('hide_sureness') == 'true');

  if ($.cookie('heard') == 'true') {
    setHeard();
  }
  $("a#play").click(listen);
  $("#next").click(next);
  $("#sureness").slider({ min: 0, max: 100, step: 1, value: 50 });
  $("#progress_index").html(total - remaining.length);
  $("#progress_total").html(total);
  $("#progressbar").progressbar({ value: ((total - remaining.length) / total) * 100 });
  $('#stimulus_top').click(enableNext);
  $('#stimulus_bottom').click(enableNext);
  $(document).keydown(function(ev) {
    switch (ev.which) {
      case 76:
        listen(ev);
        break;
      case 78:
      case 13:
        next(ev);
        break;
      case 49:
        $('#stimulus_top').click();
        break;
      case 50:
        $('#stimulus_bottom').click();
        break;
    }
    // 'l' == 76, 'n' == 78, '1' == 49, '2' == 50, [enter key] == 13
  });
  $('#shortcuts_button').click(function(ev) {
    ev.preventDefault();
    shortcuts_visible = !shortcuts_visible;
    refreshShortcutsVisible();
  });
  $('#autoplay').click(function(ev) {
    autoplay = $('#autoplay').attr('checked');
    $.cookie('autoplay', autoplay ? 'true' : 'false', cookie_defaults);
  });
  $('#hide_sureness').click(function(ev) {
    refreshHideSureness($('#hide_sureness').attr('checked'));
  });
  if (autoplay && !heard) {
    var play_label = $('#play_label');
    play_label.html('3');
    setTimeout(function() {
      play_label.html('2');
      setTimeout(function() {
        play_label.html('1');
        setTimeout(function() {
          play_label.html('');
          listen(null)
        }, 600);
      }, 600);
    }, 600);
  }
});
</script>

<h2>The experiment</h2>

<div class="page">
  <div class="play">
    <a id="play" href="#" title="Click to play"><span class="icon icon-chat2"></span></a> 
    <span style="padding-left: 10px;" id="play_label"></span>
  </div>
  
  <table class="stimuli">
    <tr>
      <td id="sound_1" style="visibility: hidden" class="control">{{control_1_value}}</td>
      <td id="sound_2" style="visibility: hidden" class="control">{{control_2_value}}</td>
      <td id="sound_3" style="visibility: hidden">
        <table class="stimuli_choice">
          <tr>
            <td><input type="radio" name="{{stimulus_id}}" value="{{stimulus_top}}" id="stimulus_top" /><label for="stimulus_top"> 
              {{stimulus_top}}</label></td>
          </tr>
          <tr>
            <td><input type="radio" name="{{stimulus_id}}" value="{{stimulus_bottom}}" id="stimulus_bottom" /><label for="stimulus_bottom"> 
              {{stimulus_bottom}}</label></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <div id="controls" style="visibility: hidden">
    <table class="sureness">
      <tr>
        <td class="label right">Unsure</td>
        <td class="input center"><div id="sureness" class="slider"></div></td>
        <td class="label left">Very Sure</td>
      </tr>
    </table>
    
    <input type="button" value="Next" id="next" disabled="disabled" />
  </div>
</div>

<a id="shortcuts_button" href="#"><img src="/static/images/keyboard.png" /> Show keyboard shortcuts / options</a>
<div id="shortcuts" style="display: none">
  You can simply press keys to listen and navigate from question to question, and select answers:
  <table>
    <tr><td class="key">L or l</td><td>Listen</td></tr>
    <tr><td class="key">N or n or [enter]</td><td>Next</td></tr>
    <tr><td class="key">1</td><td>Select the first option.</td></tr>
    <tr><td class="key">2</td><td>Select the second option.</td></tr>
  </table>
  <div style="margin-top: 1ex">
    <input type="checkbox" id="autoplay" /><label for="autoplay"> Automatically play the next stimulus</label>
  </div>
  <div style="margin-top: 0.5ex">
    <input type="checkbox" id="hide_sureness" /><label for="hide_sureness"> Hide the sureness bar</label>
  </div>
</div>

<table id="progress_footer">
  <td style="width: 80px;" class="center">Progress: </td>
  <td style="padding-top: 1ex"><div id="progressbar"></div></td>
  <td style="width: 80px" class="center"> <span id="progress_index"></span>/<span id="progress_total"></span> </span>
</table>
<!-- {{user_id}} -->