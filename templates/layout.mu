<!DOCTYPE html>
<head>
  <meta charset="utf-8">
  <title>DRAGS</title>
  <link rel="stylesheet" href="/static/site.css" type="text/css">
  <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
  <script src="/static/compiled.js"></script>
  <script src="/static/local.js"></script>
  <script>
  // local setup
  cookies.defaults = function() {
    var expires = new Date(time() + 31*24*60*60*1000); // one month
    return {path: '/', expires: expires};
  };
  $.ajaxSetup({
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    accepts: 'application/json',
    processData: false
  });
  </script>
</head>
<body>
  {{<}}
</body>
