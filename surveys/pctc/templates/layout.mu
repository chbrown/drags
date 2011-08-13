<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
  <title>Phonetics Perception Survey</title>
  
  <link rel="stylesheet" href="/static/master.css" type="text/css" media="all" charset="utf-8">
  <script type="text/javascript" src="/static/jquery.js"></script>
  <script type="text/javascript" src="/static/jquery-ui.js"></script>
  <link rel="stylesheet" href="/static/jquery-ui/jquery-ui.css" type="text/css" media="all" charset="utf-8">
  
  <script type="text/javascript">
    var cookie_defaults = { expires: 31, path: '/' };
    var page_loaded = new Date();
    function preloadVideo(url, callback) {
      // callback signature: function(err, video_element)
      // all this function should depend on is there being a hidden div, #prebuffer
      var video_id = name.replace(/\W/g, '');
      var video_html = '<video width="640" height="360" id="' + video_id + '" preload>' + 
        '<source src="' + url + '" type="video/mp4"></video>';
      $('#prebuffer').append(video_html);
      var video = $('#' + video_id)[0];

      (function bufferWatcher() {
        if (!video) {
          callback(new Error("Video cannot be loaded from that url: " + url));
        }
        var video_buffered = video.buffered || {};
        var buffered = video_buffered.length > 0 ? video_buffered.end(0) : 0;

        if (buffered >= video.duration) {
          callback(null, video);
        }
        else {
          setTimeout(bufferWatcher, 250);
        }
      })();
    }
    var videos = {}; // keyed by their sanitized url.
    function preloadVideos(urls) {
      // urls will be a list of strings (urls)
      // each url, on loading, will be stuck in the dom, in a hidden div.
      // and these elements will be inserted into the global videos dict,
      // keyed by their santized urls, i.e. url.replace(/\W/g, '')
      var i = 0;
      (function next() {
        preloadVideo(urls[i], function(err, video_element) {
          if (err) { console.log(err); }
          videos[video_element.id] = video_element;
          if (i++ < urls.length) {
            next();
          }
        });
      });
    }
    var data = {};
    $(function() {
      var state = $.cookies('state');
      preloadVideos(state.index)
      $('#next').click(function(ev) {
        $.ajax('/pctc/next.json', {
          data: data,
          success: function(data, textStatus, jqXHR) {
            $('#container').html(data.html);
          }
        });
      });
    });
  </script>
</head>
<body>
  <div id="container">
    {{<}}
  </div>

  {{!
    <div id="debug">
      <a href="#" id="reset_to_name">Reset to name</a>
      <a href="#" id="reset_to_intro">Reset to intro</a>
      <a href="#" id="two_left">Two left</a>
    </div>
  }}
  <div id="prebuffer" style="display: none"></div>
</body>