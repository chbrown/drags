<h2>All results</h2>

<div style="margin: 20px 0;">
  <a id="download_csv" href="/admin/results.csv">
    <img src="/images/page_excel.png" style="vertical-align: -20%;" />
    <span>Download CSV</span>
  </a>
  <span id="download_wait" style="display: none">Please wait while your CSV report is generated.</span>
</div>

<h2>Last 500 results</h2>

<table class="tablesorter">
  <tr>
    <th>User id</th>
    <th>Stimulus id</th>
    <th>Value</th>
    <th>Time since choices shown</th>
    <th>Created</th>
  </tr>
  {{#response}}
  <tr>
    <td><a href="/admin/users/{{user_id}}">{{user_id}}</a></td>
    <td>{{stimulus_id}}</td>
    <td>{{value}}</td>
    <td>{{time_since_choices_shown}}</td>
    <td class="nowrap">{{created}}</td>
  </tr>
  {{/}}
</table>

<script>
  $('#download_csv').click(function(el) {
    $('#download_csv').fadeOut(100);
    $('#download_wait').fadeIn(100);
    setTimeout(function() {
      $('#download_wait').fadeOut(100);
      $('#download_csv').fadeIn(100);
    }, 5000);
    return true;
  });
</script>
