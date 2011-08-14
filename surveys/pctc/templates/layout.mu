<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-type" content="text/html; charset=utf-8">
  <title>ASL Survey</title>
  
  <link rel="stylesheet" href="/css/master.css" type="text/css" media="all" charset="utf-8">
  <script type="text/javascript" src="/js/jquery.js"></script>
  <script type="text/javascript" src="/js/jquery-helpers.js"></script>
  {{!<script type="text/javascript" src="/js/jquery-ui.js"></script>}}
  {{!<link rel="stylesheet" href="/css/jquery-ui/jquery-ui.css" type="text/css" media="all" charset="utf-8">}}
  
  <script type="text/javascript">
    var cookie_defaults = { expires: 31, path: '/' };
    var page_loaded = new Date();
    var stimuli = {{{stimuli.toJsonString}}};
    function generateVideoHtml(url, id) {
      var id_attr = (id === undefined) ? '' : 'id="' + id + '"';
      return '<video width="640" height="360" ' + id_attr + ' preload>\
        <source src="' + url + '" type="video/mp4"></video>';
    }
    function preloadVideo(url, callback) {
      // callback signature: function(err, video_element)
      // all this function should depend on is there being a hidden div, #prebuffer
      var video_id = url.replace(/\W/g, '');
      var video_html = generateVideoHtml(url, video_id);
      // console.log('Prebuffering with:', video_html);
      $('#prebuffer').append(video_html);
      var video = $('#' + video_id)[0];

      (function bufferWatcher() {
        if (!video) {
          console.log("Cannot find that video! Weird, right?!", video, url);
          callback({type: 'UrlError', message: 'Video cannot be loaded from that url: ' + url});
        }
        var video_buffered = video.buffered || {};
        var buffered = video_buffered.length > 0 ? video_buffered.end(0) : 0;

        if (buffered >= video.duration) {
          callback(undefined, video);
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
        // console.log('preloadVideo:', urls[i]);
        var url = urls[i];
        preloadVideo(url, function(err, video_element) {
          if (err) { console.log(err); }
          console.log('Preloaded video #' + i + ' : ' + url);
          videos[url] = video_element;
          if (urls[++i]) {
            next();
          }
        });
      })();
    }
    function initVideoHooks() {
      var video_url = $('video#placeholder').attr('data-url');
      if (video_url !== undefined) {
        var video_id = video_url.replace(/\W/g, '');
        if (videos[video_url]) {
          $('video#placeholder').replaceWith(videos[video_url]);
          videos[video_url].play();
        }
        else {
          // here we load the video from source, because it hasn't been preloaded:
          $('video#placeholder').replaceWith(generateVideoHtml(video_url, video_id));
          $('#' + video_id)[0].play();
        }
      
      
        $('#' + video_id).bind('ended', function() {
          console.log('Video ended!');
          next();
        });      
      }
      else {
        console.log("Cannot find any video placeholders! That's probably okay!");
      }
    }
    var data = {};
    function next() {
      $.ajax('/pctc/next.json', {
        data: data,
        success: function(next_data, textStatus, jqXHR) {
          $('#container').html(next_data.html);
          page_loaded = new Date();
          
          state = { index: $.cookie('index'), label: $.cookie('label') }; // xxx: does this work?
          history.replaceState(state, '', '/pctc/' + state.label);
          
          // now we need to sub in any movies, from the prebuffer/cache, making sure that they're there!
          initVideoHooks();
        }
      });
    }
    $(function() {
      var state = { index: $.cookie('index'), label: $.cookie('label') };
      // pushState/replaceState signatures: (state, dummy, url)
      history.replaceState(state, '', '/pctc/' + state.label);

      initVideoHooks();

      var urls = $.map(stimuli.slice(state.index), function(stimulus) { return stimulus.url; } );
      preloadVideos(urls);

      $('#next').click(function(ev) {
        ev.preventDefault();
        next();
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