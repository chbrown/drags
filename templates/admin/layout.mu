<!DOCTYPE html>
<head>
  <meta charset="utf-8">
  <title>DRAGS</title>
  <link rel="stylesheet" href="/static/site.css" type="text/css">
  <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
  <script src="/static/lib/underscore.min.js"></script>
  <script src="/static/lib/angular.min.js"></script>
  <script src="/static/lib/ngStorage.min.js"></script>
  <script src="/static/lib/cookies.js"></script>
  <!-- <script src="/static/lib/jquery-flags.js"></script> -->
  <script src="/static/lib/moment.min.js"></script>
  <script src="/static/local.js"></script>
  <script src="/static/app.js"></script>
</head>
<body>
  <nav>
    <a href="/admin">Admin</a>
    <!-- <a href="/admin/users">Users</a> -->
    <a href="/users/logout" style="float: right">Logout</a>
    <span style="float: right" title="User#{{ticket_user.id}}">Logged in as {{ticket_user.email}}</span>
  </nav>
  <div ng-app="app" style="padding: 25px 5px 5px">
    {{<}}
  </div>
  <script>
  var p = console.log.bind(console);
  document.querySelector('a[href="' + window.location.pathname + '"]').classList.add('current');
  </script>
</body>
