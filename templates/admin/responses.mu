<section class="all">
  <h2>All results</h2>
  <img src="/static/img/page_excel.png" />
  <a href="/admin/results.csv">Download CSV</a>
  <a href="/admin/results.csv?view">View CSV</a>
</section>

<h2>{{responses.length}} most recent responses</h2>
<table class="tablesorter">
  <tr>
    <th>Response</th>
    <th>User</th>
    <th>Experiment</th>
    <th>Stimulus</th>
    <th>Value</th>
    <th>Details</th>
    <th>Created</th>
  </tr>
  {{#responses}}
  <tr>
    <td>{{id}}</td>
    <td><a href="/admin/users/{{user_id}}">{{user_id}}</a></td>
    <td>{{experiment_id}}</td>
    <td>{{stimulus_id}}</td>
    <td>{{value}}</td>
    <td>{{{JSON.stringify(details)}}}</td>
    <td><time>{{created}}</time></td>
  </tr>
  {{/}}
</table>

<script>
$('.all a').on('click', function(ev) {
  // ev.preventDefault();
  $(this).prop('disabled', true).flag({text: 'Please wait while your CSV report is generated.', fade: 5000});
  setTimeout(function() {
    $(this).prop('disabled', false);
  }, 5000);
});
</script>
