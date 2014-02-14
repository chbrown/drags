<section class="filters" ng-controller="ResponsesCtrl">

  <div>
    <label>
      <span>Filter experiments</span>
      <select ng-model="$storage.filter.experiment_id"
        ng-options="id for id in distinct.experiment_ids"></select>
      <button ng-click="$storage.filter.experiment_id = null">Clear</button>
    </label>
    <!-- <label>
      <span>Stimulus</span>
      <select ng-model="$storage.filter.stimulus_id"
        ng-options="id for id in distinct.stimulus_ids"></select>
      <button ng-click="$storage.filter.stimulus_id = null">Clear</button>
    </label> -->
    <!-- <label>
      <span>User</span>
      <select ng-model="$storage.filter.user_id"
        ng-options="id for id in distinct.user_ids"></select>
      <button ng-click="$storage.filter.user_id = null">Clear</button>
    </label> -->
  </div>

  <div>
    <label>
      <span>Filter by user where stimulus</span>
      <select ng-model="$storage.filter.stimulus_id" ng-change="loadDistinctValues()"
        ng-options="id for id in distinct.stimulus_ids"></select>
    </label>
    <label>
      <span>has value</span>
      <select ng-model="$storage.filter.value"
        ng-options="id for id in stimulus_values"></select>
    </label>
    <button ng-click="$storage.filter.value = null">Clear</button>
  </div>

  <a href="/admin/responses.csv" ng-click="clickDebounce($event)" class="valign-middle">
    <img src="/static/img/page_excel.png" /><b>Export spreadsheet</b></a>

  <a href="/admin/responses.csv?view=yes" style="padding-left: 20px; font-size: 80%;">preview csv</a>

  <hr />

  <div ng-if="responses">
    <h2>Showing <% responses.length %> of <% total %> responses</h2>
    <table class="tablesorter">
      <thead>
        <tr>
          <th>Response</th>
          <th>User</th>
          <th>Experiment</th>
          <th>Stimulus</th>
          <th>Value</th>
          <th>Details</th>
          <th>Created</th>
        </tr>
      </thead>
      <tr ng-repeat="response in responses">
        <td><% response.id %></td>
        <td><% response.user_id %></td>
        <td><% response.experiment_id %></td>
        <td><% response.stimulus_id %></td>
        <td><% response.value %></td>
        <td>
          <map ng-model="response.details"></map>
        </td>
        <td><time><% response.created %></time></td>
      </tr>
    </table>
  </div>
</section>
