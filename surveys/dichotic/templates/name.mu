<script>
var stimulus_ids = [{{name_stimulus_id}}, {{email_stimulus_id}}, {{handedness_stimulus_id}}];
$(function() {
  $("#next").click(function() {
    sendResponses(stimulus_ids);
    changeAction('stimulus');
  });
});
</script>

<h2>Optional pre-experiment questions</h2>

<p>The following fields are <strong>entirely optional</strong>, but if you want to hear how the experiment turned out,
  leave at least your email, and I'll send you a note when I have compiled the results.</p>
  
<div class="page">
  <table class="twocol padcell">
    <tr>
      <td class="right">Name</td>
      <td class="left" style="width: 50%"><input type="text" name="{{name_stimulus_id}}" style="width: 20em" /></td>
    </tr>
    <tr>
      <td class="right">Email</td>
      <td class="left"><input type="text" name="{{email_stimulus_id}}" style="width: 20em" /></td>
    </tr>
    <tr>
      <td class="right">What hand do you write with?</td>
      <td class="left">
        <div><input type="radio" name="{{handedness_stimulus_id}}" value="right" id="handedness_right" /><label for="handedness_right"> Right</label></div>
        <div><input type="radio" name="{{handedness_stimulus_id}}" value="left" id="handedness_left" /><label for="handedness_left"> Left</label></div>
        <div><input type="radio" name="{{handedness_stimulus_id}}" value="both" id="handedness_both" /><label for="handedness_both"> Both</label></div>
        <div><input type="radio" name="{{handedness_stimulus_id}}" value="neither" id="handedness_neither" /><label for="handedness_neither"> Neither</label></div>
      </td>
    </tr>
  </table>
  
  <input type="button" value="Next" id="next" />
</div>
    
<p><em>One more note:</em> some of the selections will be incredibly frustrating, 
  because you have to pick between two options, neither of which may seem right. 
  In that case, just pick the one that is <em>closest</em>.</p>
