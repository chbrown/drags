<section>
  <h2>{{users.length}} most recent users</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th></th>
        <th>Email</th>
        <th>Created</th>
        <th># Responses</th>
        <th>Administrator</th>
      </tr>
    </thead>
    <tbody>
      {{#users}}
        <tr>
          <td><a href="/admin/users/{{_id}}">{{_id}}</td>
          <td><a href="/admin/users/{{_id}}/edit">Edit</td>
          <td>{{email}}</td>
          <td class="date">{{created}}</td>
          <td>{{responses_length}}</td>
          <td>{{administrator}}</td>
        </tr>
      {{/users}}
    </tbody>
  </table>
</section>
