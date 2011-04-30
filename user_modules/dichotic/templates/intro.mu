<script>
soundManager.onready(function() {
  soundManager.createSound('1', '/static/dichotic/control/bVt/beat.mp3');
  soundManager.createSound('2', '/static/dichotic/control/bVt/bet.mp3');
  soundManager.createSound('3', '/static/dichotic/stereo/bVt/boot-l+bait-r.mp3');
});
function greet() {
  var hour = (new Date()).getHours();
  var greeting = null;
  if (hour > 5 && hour < 12)
    greeting = 'Good morning!';
  else if (hour >= 12 && hour < 17)
    greeting = 'Good afternoon!';
  else if (hour >= 17)
    greeting = 'Good evening!';
  if (greeting)
    $('#greeting').attr("title", greeting);
}
function play_1() {
  soundManager.play('1', {
    onfinish: function() {
      $('#stimulus_1').css({visibility: 'visible'});
      setTimeout('play_2()', 300);
    }
  });
}
function play_2() {
  soundManager.play('2', {
    onfinish: function() {
      $('#stimulus_2').css({visibility: 'visible'});
      setTimeout('play_3()', 300);
    }
  });
}
function play_3() {
  soundManager.play('3', {
    onfinish: function() {
      $('#stimulus_3').css({visibility: 'visible'});
      $('#controls').css({visibility: 'visible'});
    }
  });
}
function fadeDummyText() {
  $("#next_dummy_text").fadeOut();
}
$(function() {
  greet();
  $("a#play").click(function(ev) {
    play_1();
    ev.preventDefault();
  });
  $("#sureness").slider({ min: -1, max: 1, step: 0.01 });
  $("#next").click(function() {
    $.cookie('action', 'name', cookie_defaults);
    window.location = '/dichotic/';
  });
  $("#next_dummy").click(function() {
    $("#next_dummy_text").html('Normally, this would take you to the next page').fadeIn();
    setTimeout('fadeDummyText()', 3000);
  });
});
</script>

<h2 id="greeting">Hi, welcome to Chris Brown's phonetics experiment.</h2>

<p>This website will play you some sounds, and your task will be to select what word you heard.</p>
<p>Most importantly, first, some software requirements:</p>
<ul>
  <li><strong>Cookies!</strong> You must have cookies enabled. This is very likely the case already.</li>
  <li><strong>Javascript!</strong> You should also have javascript enabled. If the internet does not seem 
    utterly broken when you are looking at other webpages, you are good to go.</li>
  <li><strong>Audio!</strong> You must either have Flash enabled, or have a modern browser, like Chrome or Firefox 4 or Safari 5. MobileSafari is cool, too.</li>
  <li><strong>Stereo!</strong> You <em>must</em> be using headphones. Being able to hear things in stereo is <em>très important!</em></li>
</ul>

<p>Each page will look kind of like the following:</p>

<div class="page">
  <div class="play"><a id="play" href="#" title="Click to play"><span class="icon icon-chat2"></span></a> <span style="padding-left: 10px;">(click this icon)</span></div>
  
  <table class="stimuli">
    <tr>
      <td id="stimulus_1" style="visibility: hidden">Beat</td>
      <td id="stimulus_2" style="visibility: hidden">Bet</td>
      <td id="stimulus_3" style="visibility: hidden">
        <table class="stimuli_choice">
          <tr>
            <td><input type="radio" name="word" value="boot" id="word_1" /><label for="word_1"> boot</label></td>
          </tr>
          <tr>
            <td><input type="radio" name="word" value="bait" id="word_2" /><label for="word_2"> bait</label></td>
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
    
    <input type="button" value="Next" id="next_dummy" /> &nbsp; <span id="next_dummy_text" class="small"></span>
  </div>
  
</div>

<p>The sureness slider is optional. The only <em>required</em> thing is to select a one of the radio buttons. </p>

<p>Throughout the actual experiment, the sound will only play once, 
  so <strong>please use the repeatable player above to make sure your volume is set correctly, before continuing.</strong></p>
  
<p>As long as you have a link to this webpage, you can come back whenever, assuming you use the same browser on the same computer;
  there is already a cookie keeping track of your session here.</p>
  
<p>When you're ready, click this button:&nbsp; <input type="button" value="Start!" id="next" /></p> 

<!-- {{user_id}} -->