{{#redirect}}
<h2>Access denied; your account does not have administator privileges.</h2>
{{/redirect}}

<h2>Administrator login</h2>

<form action="/users" method="POST">
  <h3>User id: {{user._id}}</h3>

  <div>
    <label><div>Email</div>
      <input name="email" value="{{user.email}}" />
    </label>
  </div>
  <div>
    <label><div>Password</div>
      <input name="password" type="password" />
    </label>
  </div>
  <input name="redirect" type="hidden" value="{{redirect}}" />
  <button>Login</button>
</form>
