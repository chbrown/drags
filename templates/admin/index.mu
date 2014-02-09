<section class="filters" ng-controller="ResponsesCtrl">
  <h2>Filters</h2>

  <label>
    <span>Experiment</span>
    <select ng-model="$storage.filter.experiment_id" ng-options="id for id in filters.experiment_ids" ng-change="refilter()"></select>
  </label>

  <label>
    <span>Stimulus</span>
    <select ng-model="$storage.filter.stimulus_id" ng-options="id for id in filters.stimulus_ids" ng-change="refilter()"></select>
  </label>

  <label>
    <span>User</span>
    <select ng-model="$storage.filter.user_id" ng-options="id for id in filters.user_ids" ng-change="refilter()"></select>
  </label>

  <button ng-click="clearFilters()">Clear filters</button>

  <div ng-if="responses">
    <h2>Showing <% responses.length %> of <% total %> responses</h2>
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
      <tr ng-repeat="response in responses">
        <td><% response.id %></td>
        <td><% response.user_id %></td>
        <td><% response.experiment_id %></td>
        <td><% response.stimulus_id %></td>
        <td><% response.value %></td>
        <td><% response.details %></td>
        <td><time><% response.created %></time></td>
      </tr>
    </table>
  </div>
</section>

<!--
  <img src="/static/img/page_excel.png" />
  <a href="/admin/results.csv">Download CSV</a>
  <a href="/admin/results.csv?view">View CSV</a>
  // $('.all a').on('click', function(ev) {
  //   // ev.preventDefault();
  //   $(this).prop('disabled', true).flag({text: 'Please wait while your CSV report is generated.', fade: 5000});
  //   setTimeout(function() {
  //     $(this).prop('disabled', false);
  //   }, 5000);
  // });
-->
