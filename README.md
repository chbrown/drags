# This is how you do things with DRAGS

Sorry, a bit in the works and looking to open source a couple of modules, at the moment.

## Surveys:

A survey is just a module that exposes a single export:

    function(request, response) { ... }

This is just like an http server request handler.

Note, though, that the received response will be http-enhanced, and has a few additional fields already added to it.


## Basic nginx configuration, if you _must_ have nginx

    server {
        listen 80;
        server_name drags.henrian.com;
        gzip on;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_pass http://127.0.0.1:1301;
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


    var zz_design = {};
    ['ptct-a', 'ptct-b', 'ptct-c'].forEach(function(survey_name) {
      var design_csv_path = path.join(__dirname, 'surveys', survey_name, 'design.csv');
      fs.exists(design_csv_path, function(exists) {
        if (exists) {
          csv().from.path(design_csv_path, {columns: true}).on('data', function(row, index) {
            // some row might be 'a10','Question 8','wi-c1','c-wi0','c-wo135','wo-c270','wi-c225','d'
            zz_design[row.id] = row;
          });
        }
      });
    });


    logger.info('Loading survey "%s" from path "%s"', name, survey_path);
    var survey = require(survey_path);
    R.any(new RegExp('^/' + name + '(/.*)?$'), function(req, res, m) {
      survey(req, res, m[1] || '/');
    });

    var module = path.join(argv.surveys_path, survey_name);
    var survey_path = package_json.surveys[name].replace(/^~/, process.env.HOME);

    "ptct-audio": "~/work/ptct/audio",
    "ptct-image": "~/work/ptct/image",
    "ptso-video": "~/work/ptso/video"

## Development comments

To handle serving static files from various sub-packages, we don't reverse-proxy through nginx and set up nginx to handle certain subpaths.
Instead, I'm using visionmedia's [`send`](https://github.com/visionmedia/send) package.
If that doesn't pan out, we could try [`node-static`](https://github.com/cloudhead/node-static).


## License

Copyright © 2013 Christopher Brown. [MIT Licensed](LICENSE).
