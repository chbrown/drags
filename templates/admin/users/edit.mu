{{#user}}
  <h3>User: {{_id}}</h3>
  <form method="POST" action="/admin/users/{{_id}}">
    <div>
      <label><div>Email</div>
        <input name="email" type="text" />
      </label>
    </div>

    <div>
      <label><div>Set password (leave blank to leave unchanged)</div>
        <input name="password" type="text" />
      </label>
    </div>

    <div>
      <label><div>Administrator</div></label>
      <label>
        <input name="administrator" type="radio" value="true" {{#administrator}}checked{{/}} />
        <span>True</span>
      </label>
      <label>
        <input name="administrator" type="radio" value="false" {{^administrator}}checked{{/}} />
        <span>False</span>
      </label>
    </div>

    <button>Save</button>
  </form>
{{/user}}
