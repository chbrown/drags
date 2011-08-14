<h2>Choices</h2>

<p>
  <table class="choices">
    <tr>
      {{#choices}}
      <td>
        <img src="{{url}}" />
        <div class="input"><input type="button" class="next" value="{{value.capitalize}}" /></div>
      </td>
      {{/choices}}
    </tr>
  </table>
</p>

<script>
  $(function() {
    $('.next').click(function() {
      console.log("Clicked choice:", this.value);
      var now = new Date();
      var response = {
        stimulus_id: "{{id}}",
        value: this.value,
        total_time: page_loaded - now,
        details: ''
      };
      data.responses = [response]; // data is (should be) a global
      next();
    });
  });
</script>