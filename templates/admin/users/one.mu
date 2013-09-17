<section>
  {{#user}}
    <h3>User: {{_id}}</h3>
    <table>
      <tr><td>Created</td><td>{{created}}</td></tr>
      <tr><td>Email</td><td>{{email}}</td></tr>
      <tr><td>Password</td><td>{{password}}</td></tr>
      <tr><td>Administrator</td><td>{{administrator}}</td></tr>
      <tr><td>Number of Responses</td><td>{{responses.length}}</td></tr>
      <tr>
        <td>Tickets</td>
        <td>
          {{#tickets}}
            <div>{{.}}</div>
          {{/tickets}}
        </td>
      </tr>
    </table>
  {{/user}}
</section>

<section>
  <h3>Responses</h3>

  <table class="tablesorter">
    <tr>
      <th>Created</th>
      <th>Stimulus ID</th>
      <th>Value</th>
      <th>Details</th>
    </tr>
    {{#responses}}
    <tr>
      <td><time>{{created}}</time></td>
      <td>{{stimulus_id}}</td>
      <td>{{value}}</td>
      <td>{{details}}</td>
    </tr>
    {{/}}
  </table>
</section>
