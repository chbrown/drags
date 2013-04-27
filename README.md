# This is how you do things with DRAGS

Sorry, a bit in the works and looking to open source a couple of modules, at the moment.

## Basic nginx configuration

    server {
        listen 1300;
        server_name kl localhost;
        proxy_set_header X-Real-IP $remote_addr;
        gzip on;

        set $root /Users/chbrown/github/drags;

        location /lib { root $root/static; }
        location ~ ^/surveys/([-a-z]*)/(.*)$ {
            alias $root/surveys/$1/static/$2;
            break;
        }
        location / { proxy_pass http://127.0.0.1:1301; }
    }

## Supervisor.d

    [program:drags]
    directory=/www/drags
    command=node drags.js --default /basic/ --admin superuser --password OKCAfdt0SQr7
    autorestart=true
    user=chbrown

## Outtakes

    http.ServerResponse.prototype.json = function(obj) {
      this.writeHead(200, {"Content-Type": "application/json"});
      this.write(JSON.stringify(obj));
      this.end();
    };

    select total_time, responses.value, name, stimuli.value from responses inner join stimuli on stimuli.id = stimulus_id;

    <script>
      function submit() {
        var response = $('#form').objectifyForm();
        console.log(response);
        window.data = response;
        next('admin_login');
      }
      $('#form').bind('keypress', function(e) {
        if (e.keyCode==13){
          submit();
        }
      });
      $('#submit').one('click', submit);
    </script>
