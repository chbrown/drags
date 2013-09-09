<h2>Superuser login</h2>

<form action="/admin/login" method="POST">
  <div id="form" style="margin-top: 30px">
    <div>
      <label>Username</label>
      <input name="su_name" />
    </div>
    <div>
      <label>Password</label>
      <input name="su_pass" type="password" />
    </div>
  </div>
  <div style="margin: 20px 0;">
    <input type="submit" value="Login" />
  </div>
</form>


<script>
  $('#submit').one('click', function submit() {
    window.data = $('#form').objectifyForm();
    next('admin_login');
  });
  $('#form').keypress(function(event) {
    if (event.which === 13){
      $('#submit').click();
    }
  });
</script>
