<script>
soundManager.onready(function() {
  soundManager.createSound('left', '/static/dichotic/bird-l.mp3');
  soundManager.createSound('right', '/static/dichotic/book-r.mp3');
});
$(function() {
  $("#left_only").click(function(ev) {
    ev.preventDefault();
    soundManager.play('left');
  });
  $("#right_only").click(function(ev) {
    ev.preventDefault();
    soundManager.play('right');
  });
  $("#next").click(function(ev) {
    ev.preventDefault();
    changeAction('intro_2');
  });
});
</script>

<h2>Hi, welcome to Chris Brown's phonetics experiment.</h2>

<p>This website will play you some sounds, and your task will be to select what word you heard.</p>
<p>Most importantly, first, some requirements:</p>
<ul>
  <li><strong>Cookies!</strong> You must have cookies enabled. This is very likely the case already.</li>
  <li><strong>Javascript!</strong> You should also have javascript enabled. If the internet does not seem 
    utterly broken when you are looking at other webpages, you are good to go.</li>
  <li><strong>Audio!</strong> You must either have Flash enabled, or have a modern browser, like Chrome or Firefox 4 or Safari 5. MobileSafari is cool, too.</li>
  <li><strong>Stereo!</strong> You <em>must</em> be using headphones. Being able to hear things in stereo is <em>très important!</em> 
    Also, making sure that you get the sides correct is crucial. To check, make sure that you hear 
    <a href="#" id="left_only">this <em>'bird'</em></a> only on your left side, and <a href="#" id="right_only">this <em>'book'</em></a> only on your right. 
    Note that your computer might blend the two slightly (e.g. you might hear a little of 'bird' on the right side), 
    but the important thing is to make sure you get the loudest side correct.
  </li>
</ul>

<div class="center bold" style="margin: 1em">
  <p><a href="#" id="next">Next &raquo;</a></p> 
</div>

<!-- {{user_id}} -->