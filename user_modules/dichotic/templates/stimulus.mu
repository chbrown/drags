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
  // prevent from continuing until the selected something.
  var done = new Date();
  
  var value = $('input[name=' + stimulus_id + ']:checked').val();
  var sureness = Math.floor($("#sureness").slider("value"))
  $.post('/api/1/responses', JSON.stringify({ responses: [{ 
    stimulus_id: stimulus_id, total_time: (done - page_loaded), value: value, sureness: sureness
  }] }));

  $.cookie('remaining', remaining.slice(1), cookie_defaults);
  $.cookie('heard', 'false', cookie_defaults);
  window.location = '/dichotic/';
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
            <td><input type="radio" name="{{stimulus_id}}" value="boot" id="stimulus_top" /><label for="stimulus_top"> {{stimulus_top}}</label></td>
          </tr>
          <tr>
            <td><input type="radio" name="{{stimulus_id}}" value="bait" id="stimulus_bottom" /><label for="stimulus_bottom"> {{stimulus_bottom}}</label></td>
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
    
    <input type="button" value="Next" id="next" />
  </div>
  
</div>


<table id="progress_footer">
  <td style="width: 80px;" class="center">Progress: </td>
  <td style="padding-top: 1ex"><div id="progressbar"></div></td>
  <td style="width: 80px" class="center"> <span id="progress_index"></span>/<span id="progress_total"></span> </span>
</table>
<!-- {{user_id}} -->