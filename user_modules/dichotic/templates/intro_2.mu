<script>
soundManager.onready(function() {
  soundManager.createSound('bVt1', '/static/dichotic/control/bVt/beat.mp3');
  soundManager.createSound('bVt2', '/static/dichotic/control/bVt/bet.mp3');
  soundManager.createSound('bVt3', '/static/dichotic/stereo/bVt/boot-l+bait-r.mp3');
  soundManager.createSound('mf1', '/static/dichotic/control/male_female/turquoise_f.mp3');
  soundManager.createSound('mf2', '/static/dichotic/control/male_female/silver_m.mp3');
  soundManager.createSound('mf3', '/static/dichotic/stereo/male_female/navy_m-l+navy_f-r.mp3');
});
$(function() {
  $("a#bVt_play").click(function(ev) {
    ev.preventDefault();
    playSoundChain(300, function() {
        $('#bVt_controls').css({visibility: 'visible'}); 
      }, [
      {id: 'bVt1', reveal: '#bVt_sound_1'},
      {id: 'bVt2', reveal: '#bVt_sound_2'},
      {id: 'bVt3', reveal: '#bVt_sound_3'},
    ])
  });
  $("a#mf_play").click(function(ev) {
    ev.preventDefault();
    playSoundChain(300, function() {
        $('#mf_controls').css({visibility: 'visible'}); 
      }, [
      {id: 'mf1', reveal: '#mf_sound_1'},
      {id: 'mf2', reveal: '#mf_sound_2'},
      {id: 'mf3', reveal: '#mf_sound_3'},
    ])
  });
  $("#bVt_sureness").slider({ min: 0, max: 100, step: 1, value: 50 });
  $("#mf_sureness").slider({ min: 0, max: 100, step: 1, value: 50 });
  $("#bVt_next_dummy").click(function() {
    $("#bVt_next_dummy_text").html('Normally, this would take you to the next page').fadeIn().delay(3000).fadeOut();
    // setTimeout(function() { $("#bVt_next_dummy_text").fadeOut(); }, 3000);
  });
  $("#mf_next_dummy").click(function() {
    $("#mf_next_dummy_text").html('Normally, this would take you to the next page').fadeIn().delay(3000).fadeOut();
    // setTimeout(function() { $("#bVt_next_dummy_text").fadeOut(); }, 3000);
  });

  $("#next").click(function(ev) {
    ev.preventDefault();
    changeAction('name');
  });
});
</script>

<h2>Examples</h2>

<p>Each page will look kind of like the following:</p>

<div class="page">
  <div class="play"><a id="bVt_play" href="#" title="Click to play"><span class="icon icon-chat2"></span></a> 
    <span style="padding-left: 10px;">(click this icon)</span></div>
  
  <table class="stimuli">
    <tr>
      <td id="bVt_sound_1" style="visibility: hidden" class="control">beat</td>
      <td id="bVt_sound_2" style="visibility: hidden" class="control">bet</td>
      <td id="bVt_sound_3" style="visibility: hidden">
        <table class="stimuli_choice">
          <tr><td><input type="radio" id="bVt_word_1" /><label for="bVt_word_1"> boot</label></td></tr>
          <tr><td><input type="radio" id="bVt_word_2" /><label for="bVt_word_2"> bait</label></td></tr>
        </table>
      </td>
    </tr>
  </table>
  
  <div id="bVt_controls" style="visibility: hidden">
    <table class="sureness">
      <tr>
        <td class="label right">Unsure</td>
        <td class="input center"><div id="bVt_sureness" class="slider"></div></td>
        <td class="label left">Very Sure</td>
      </tr>
    </table>
    
    <input type="button" value="Next" id="bVt_next_dummy" /> &nbsp; <span id="bVt_next_dummy_text" class="small"></span>
  </div>
</div>

Some of the questions will ask about the gender of the speaker, not the word; in that case, the page will look like this one:
<div class="page">
  <div class="play"><a id="mf_play" href="#" title="Click to play"><span class="icon icon-chat2"></span></a> 
    <span style="padding-left: 10px;">(click this icon)</span></div>
  
  <table class="stimuli">
    <tr>
      <td id="mf_sound_1" style="visibility: hidden" class="control">female</td>
      <td id="mf_sound_2" style="visibility: hidden" class="control">male</td>
      <td id="mf_sound_3" style="visibility: hidden">
        <table class="stimuli_choice">
          <tr><td><input type="radio" id="bVt_word_1" /><label for="bVt_word_1"> male</label></td></tr>
          <tr><td><input type="radio" id="bVt_word_2" /><label for="bVt_word_2"> female</label></td></tr>
        </table>
      </td>
    </tr>
  </table>
  
  <div id="mf_controls" style="visibility: hidden">
    <table class="sureness">
      <tr>
        <td class="label right">Unsure</td>
        <td class="input center"><div id="mf_sureness" class="slider"></div></td>
        <td class="label left">Very Sure</td>
      </tr>
    </table>
    
    <input type="button" value="Next" id="mf_next_dummy" /> &nbsp; <span id="bVt_next_dummy_text" class="small"></span>
  </div>
</div>


<p>The sureness slider is optional. The only <em>required</em> thing is to select one of the radio buttons.</p>

<p>Throughout the actual experiment, the sound will only play once, 
  so <strong>please use the repeatable players above to make sure your volume is set correctly, before continuing.</strong></p>
  
<p>As long as you have a link to this webpage, you can come back whenever, assuming you use the same browser on the same computer;
  there is already a cookie keeping track of your session here.</p>
  
<div class="center bold" style="margin: 1em">
  <p><a href="#" id="next">Start!</a></p> 
</div>

