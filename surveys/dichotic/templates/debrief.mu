<script>
$(function() {
  $("#next").click(function() {
  });
  $("#restart").click(function() {
    $.cookie('action', 'intro', cookie_defaults);
    $.cookie('ticket', 'reset', cookie_defaults);
    $.cookie('remaining', '', cookie_defaults);
    $.cookie('heard', 'false', cookie_defaults);
    window.location = '/dichotic/';
  });
});
</script>

<h2 id="greeting">The End</h2>

<p>Thanks!</p>
<p>As you could probably tell, this test was all about 
  "dichotic" listening&mdash;where what one ear hears is different from what the other hears.
  The prevailing theory about dichotic listening is that people defer to their right ear, usually, since the wiring from 
  the right ear to the language center in the brain (on the left side) is faster than the wiring from the left ear to
  the language processing center.</p>
<p><strong>But</strong> most previous studies have just focused on number words spoken by the same source. 
  There is much more variety in the experiment you just took part in.
  Once all the results are compiled, we shall see if the right ear <em>always</em> has the advantage, 
  or if there is some other phenomenon going on.</p>
  
<p style="margin-top: 25px">If, alternatively, you are interested in the source code behind this experiment administrator, 
  you can find it <a href="https://github.com/chbrown/drags">here on github</a>.
  You should realize, though, at this point it's <em>very</em> rough. It might be a decent starting point, though,
  if you want to do something similar.</p>

<p style="margin-top: 50px"><a href="#" id="restart">Click here</a> if you would like to 
  allow someone else to complete the survey in this browser. Otherwise, you are done! Thanks again.</p>
