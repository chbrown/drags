<div ng-controller="ResponsesCtrl">

  <section class="hpad">
    <label>
      <div>
        <b>Filter experiments</b>
        <span class="help">Only responses linked to the specified experiment will show up in the list below and in the exported CSV</span>
      </div>
      <select ng-model="$storage.filter.experiment_id"
        ng-options="id for id in distinct.experiment_ids"></select>
    </label>
    <button ng-click="$storage.filter.experiment_id = null">Clear</button>
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
  </section>

  <section class="hpad">
    <label>
      <div>
        <b>Metadata variables</b>
        <span class="help">Separate with commas. If you have demographic data for each user, like "age", "sex" and "hearing", that you want replicated on every response row, enter "age,sex,hearing" in this area. This has no effect on the response preview on this page.</span>
      </div>
      <textarea ng-model="$storage.melt" style="width: 600px" rows="4" ng-list=","></textarea>
      <p>
    </label>
  </section>

  <section class="hpad">
    <h3>CSV Export</h3>
    <ul>
      <li ng-repeat="link in export_links">
        <a href="/admin/responses.csv?download=<% link.download %>&experiment_id=<% $storage.filter.experiment_id %>&melt=<% $storage.melt.join(',') %>" ng-click="clickDebounce($event)">
          <b><% link.name %></b>
        </a>
      </li>
    </ul>
  </section>

  <section class="hpad">
    <table>
      <tr>
        <td><b>Filter by user where stimulus</b></td>
        <td><b>has value</b></td>
        <td></td>
      </tr>
      <tr>
        <td>
          <select ng-model="$storage.filter.stimulus_id" ng-options="id for id in distinct.stimulus_ids">
            <option value="">-- stimulus id --</option>
          </select>
        </td>
        <td>
          <select ng-model="$storage.filter.value" ng-options="id for id in stimulus_values">
            <option value="">-- stimulus value --</option>
          </select>
        </td>
        <td>
          <button ng-click="$storage.filter.value = null">Clear</button>
        </td>
      </tr>
    </table>
    <span class="help">This has no effect on the exported data above.</span>
  </section>

  <div ng-if="responses">
    <div class="hpad">
      <h3>Showing <% responses.length %> of <% total %> responses</h3>
    </div>
    <table class="tablesorter fill">
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
        <td><time><% response.created | date:'yyyy-MM-dd HH:mm:ss' %></time></td>
      </tr>
    </table>
  </div>
</div>
