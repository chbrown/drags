<section style="padding: 0 20px">
  {{#redirect}}
  <h2>Access denied; your account does not have administator privileges.</h2>
  {{/redirect}}

  <h2>DRAGS login</h2>
  <form action="/users" method="POST">
    <div>
      <label><div>Email</div>
        <input name="email" type="text" value="{{user.email}}" />
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
</section>
