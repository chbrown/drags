<script>
soundManager.onready(function() {
  soundManager.createSound('1', '/static/dichotic/control/{{category}}/{{control_1_file}}.mp3');
  soundManager.createSound('2', '/static/dichotic/control/{{category}}/{{control_2_file}}.mp3');
  soundManager.createSound('3', '/static/dichotic/stereo/{{category}}/{{stimulus_file}}.mp3');
});
var stimulus_gap = 300;
var heard = false;
var total = 166; // hack
var stimulus_id = {{stimulus_id}};
var remaining;
var nextEnabled = false;
function play_1() {
  soundManager.play('1', {
    onfinish: function() {
      $('#stimulus_1').css({visibility: 'visible'});
      setTimeout('play_2()', stimulus_gap);
    }
  });
}
function play_2() {
  soundManager.play('2', {
    onfinish: function() {
      $('#stimulus_2').css({visibility: 'visible'});
      setTimeout('play_3()', stimulus_gap);
    }
  });
}
function play_3() {
  soundManager.play('3', {
    onfinish: function() {
      $('#stimulus_3').css({visibility: 'visible'});
      setHeard();
    }
  });
}
function setHeard() {
  $("a#play").addClass('disabled');
  $('#controls').css({visibility: 'visible'});
  $('#stimulus_1').css({visibility: 'visible'});
  $('#stimulus_2').css({visibility: 'visible'});
  $('#stimulus_3').css({visibility: 'visible'});
  heard = true;
  $.cookie('heard', 'true', cookie_defaults);
}
function listen(ev) {
  if (!heard) {
    play_1(); // actually plays the chain
  }
  else {
    $("a#play").addClass('hover');
    setTimeout(function() { 
      $("a#play").removeClass('hover'); 
    }, 1000);
  }
  ev.preventDefault(); // don't jump up to the top for the hash.
}
function next(ev) {
  if (nextEnabled) {
    // prevent from continuing until the selected something.
    var done = new Date();
  
    var value = $('input[name=' + stimulus_id + ']:checked').val();
    var sureness = Math.floor($("#sureness").slider("value"))
    var response_data = JSON.stringify({ responses: [{ 
      stimulus_id: stimulus_id, total_time: (done - page_loaded), value: value, sureness: sureness
    }] });
    console.log('Sending ajax response: ' + value);
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
  $("#next").attr("disabled", null);
  nextEnabled = true;
}
$(function() {
  remaining = $.cookie('remaining').split(',');
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
        listen(ev); break;
      case 78:
        next(ev); break;
      case 49:
        $('#stimulus_top').click();
        break;
      case 50:
        $('#stimulus_bottom').click();
        break;
    }
    // 'l' == 76
    // 'n' == 78
    // '1' == 49
    // '2' == 50
    // console.log(ev.which, ev.which === '13', ev.which === 13);
  });
  $('#shortcuts_button').click(function(ev) {
    $('#shortcuts').toggle();
    ev.preventDefault(); // don't jump up to the top for the hash.
  });
});
</script>

<h2>The experiment</h2>

<div class="page">
  <div class="play"><a id="play" href="#" title="Click to play"><span class="icon icon-chat2"></span></a></div>
  
  <table class="stimuli">
    <tr>
      <td id="stimulus_1" style="visibility: hidden">{{control_1_value}}</td>
      <td id="stimulus_2" style="visibility: hidden">{{control_2_value}}</td>
      <td id="stimulus_3" style="visibility: hidden">
        <table class="stimuli_choice">
          <tr>
            <td><input type="radio" name="{{stimulus_id}}" value="{{stimulus_top}}" id="stimulus_top" /><label for="stimulus_top"> {{stimulus_top}}</label></td>
          </tr>
          <tr>
            <td><input type="radio" name="{{stimulus_id}}" value="{{stimulus_bottom}}" id="stimulus_bottom" /><label for="stimulus_bottom"> {{stimulus_bottom}}</label></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <div id="controls" style="visibility: hidden">
    <table class="slider">
      <tr>
        <td class="label" style="text-align: right">Unsure</td>
        <td style="text-align: center; padding-top: 0.3ex;">
          <div id="sureness"></div>
        </td>
        <td class="label" style="text-align: left">Very Sure</td>
      </tr>
    </table>
    
    <input type="button" value="Next" id="next" disabled="disabled" />
  </div>
</div>

<a id="shortcuts_button" href="#"><img src="/static/images/keyboard.png" /> Show keyboard shortcuts</a>
<div id="shortcuts" style="display: none">
  You can simply press keys to listen and navigate from question to question, and select answers:
  <table>
    <tr><td class="key">L or l</td><td>Listen</td></tr>
    <tr><td class="key">N or n</td><td>Next</td></tr>
    <tr><td class="key">1</td><td>Select the first option.</td></tr>
    <tr><td class="key">2</td><td>Select the second option.</td></tr>
  </table>
</div>


<table id="progress_footer">
  <td style="width: 80px;" class="center">Progress: </td>
  <td style="padding-top: 1ex"><div id="progressbar"></div></td>
  <td style="width: 80px" class="center"> <span id="progress_index"></span>/<span id="progress_total"></span> </span>
</table>
<!-- {{user_id}} -->