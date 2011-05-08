// `npm install pg cookies formidable hashlib`
// Mu (git://github.com/chbrown/mu.git)
var sys = require('sys')
var fs = require('fs')
var path = require('path')
var http = require('http')
var util = require('util')
var pg = require('pg')
var mu = require('mu')
var hashlib = require('hashlib')
var querystring = require('querystring')
var formidable = require('formidable')
var Uuid = require('./lib/uuid')
var Cookies = require('cookies')
mu.root = path.join(__dirname, 'user_modules/dichotic/templates')

var repl = require('repl')

// ARGV[0] is "node" and [1] is the name of this script and [2] is the name of the first command line argument
var config_file = (process.ARGV[2] && process.ARGV[2].substr(-5) == '.json') ? process.ARGV[2] : 'config.json'
var CONFIG = JSON.parse(fs.readFileSync(config_file));
console.inspect = function (x) { return console.log(util.inspect(x, false, null)) }

JSON.niceParse = function(str, default_obj) {
  try { return JSON.parse(str) }
  catch (e) { return default_obj }
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.substr(1);
}
String.prototype.toTitleCase = function() { // David Gouch <http://individed.com>
  return this.replace(/([\w&`'‘’"“.@:\/\{\(\[<>_]+-? *)/g, function(match, p1, index, title) {
    if (index > 0 && title.charAt(index - 2) !== ":" &&
    	match.search(/^(a(nd?|s|t)?|b(ut|y)|en|for|i[fn]|o[fnr]|t(he|o)|vs?\.?|via)[ \-]/i) > -1)
        return match.toLowerCase();
    if (title.substring(index - 1, index + 1).search(/['"_{(\[]/) > -1)
        return match.charAt(0) + match.charAt(1).toUpperCase() + match.substr(2);
    if (match.substr(1).search(/[A-Z]+|&|[\w]+[._][\w]+/) > -1 || 
    	title.substring(index - 1, index + 1).search(/[\])}]/) > -1)
        return match;
    return match.charAt(0).toUpperCase() + match.substr(1);
  });
};
// this is not destructive! but it only returns a SHALLOW copy
// http://sedition.com/perl/javascript-fy.html
Array.prototype.shuffle = function() {
  var copy = this.slice(0)
  var i = copy.length
  if (i == 0)
    return []
  while (--i) {
    var j = Math.floor(Math.random() * (i + 1))
    var tempi = copy[i]
    var tempj = copy[j] // necessary to split?
    copy[i] = tempj
    copy[j] = tempi
  }
  return copy
}
// non-destructive, but shallow copies only!
Array.prototype.sampleMany = function(count, replacement) {
  var total = this.length
  if (count > total)
    replacement = true
  var samples = []
  var remaining_slots = count
  if (replacement) {
    for (; remaining_slots > 0; remaining_slots--) {
      samples.push(this[Math.floor(Math.random() * total)])
    }
  }
  else {
    // var samples_count = 0
    // this is a finite loop, so it can return less than count, in bad situations
    for (var i = 0; i < 100000 && remaining_slots > 0; i++) {
      if (total < 200) {
        var shuffled = this.shuffle()
        if (shuffled.length > remaining_slots) {
          samples = samples.concat(shuffled.slice(shuffled.length - remaining_slots))
          remaining_slots = 0
        }
        else {
          samples = samples.concat(shuffled)
          remaining_slots -= shuffled.length
        }
      }
      else {
        // this will likely bog down when it gets to the last few elements if count == total > 200
        var candidate = this[Math.floor(Math.random() * total)]
        if (samples.indexOf(candidate) === -1) {
          samples.push(candidate)
          remaining_slots--
        }
      }
    }
  }
  return samples
}
Date.prototype.addDays = function(days) {
  var then_ticks = this.getTime() + (days * 86400000)
  return new Date(then_ticks)
}

function querySql(sql, args, callback, client) {
  if (client === undefined) {
    pg.connect(CONFIG.database, function(err, client) {
      if (err) console.log(err)
      client.query(sql, args, function(err, result) {
        if (err) console.log(err)
        if (callback) callback(result, client)
      })
    })
  }
  else {
    client.query(sql, args, function(err, result) {
      if (err) console.log(err)
      if (callback) callback(result, client)
    })
  }
}
function addHtmlHead(res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  return res;
}
function addTextHead(res) {
  res.writeHead(200, {"Content-Type": "text/plain"});
  return res;
}


// {
//   "affixes_consonants": [
//     {
//       "file": "lock",
//       "value": "lock"
//     },
//     ...
var dichotic_stimuli_controls = JSON.parse(fs.readFileSync(path.join(__dirname, 'user_modules/dichotic/controls.json')))
// [
//   {
//     "category": "affixes_consonants",
//     "left": {file: "lock", value: "lock"},
//     "right": ...
//   },
//   ...
var dichotic_stimuli_pairs_list = JSON.parse(fs.readFileSync(path.join(__dirname, 'user_modules/dichotic/pairs.json'))) // len: 166
var i = 0
var dichotic_stimuli_pairs = {}
var dichotic_stimuli_indices = []
dichotic_stimuli_pairs_list.forEach(function (dichotic_stimuli_pair) {
  dichotic_stimuli_pairs[i] = dichotic_stimuli_pair
  dichotic_stimuli_indices.push(i)
  i++
})

function monthFromNow() {
  return (new Date()).addDays(31)
}
function cookieDefaults() {
  return { expires: monthFromNow(), httpOnly: false }
}
function _fileNameForPair(left, right) {
  return left + '-l+' + right + '-r' // .mp3
}
  
function _createUser(ip, user_agent, cookies, callback) {
  querySql("INSERT INTO users DEFAULT VALUES RETURNING id", [], function(user_id_result, client) {
    var user_id = user_id_result.rows[0].id
    var ticket_name = Uuid.uuidFast()
    // let the rest branch off ...
    querySql("INSERT INTO tickets (user_id, name) VALUES ($1, $2) RETURNING id", [user_id, ticket_name], function(ticket_id_result) {
      var ticket_id = ticket_id_result.rows[0].id
      querySql("INSERT INTO locations (ticket_id, ip, user_agent) VALUES ($1, $2, $3)", 
        [ticket_id, ip, user_agent], function() { 
          // don't need to do anything
      }, client)
    }, client)
    // ... all we need is the user_id
    var cookie_defaults = cookieDefaults()
    cookies.set('ticket', ticket_name, cookie_defaults)
    cookies.set('action', 'intro', cookie_defaults)
    cookies.set('remaining', '', cookie_defaults)
    cookies.set('heard', 'false', cookie_defaults)
    callback(undefined, user_id)
  })
}
function _getUserForKey(ip, user_agent, cookies, callback) {
  var ticket_name = cookies.get('ticket')
  // ip, user_agent aren't used unless the user has a different ip than last time
  querySql("SELECT id, user_id FROM tickets WHERE tickets.name = $1", [ticket_name], function(ticket_id_results, client) {
    var ticket_id_result = ticket_id_results.rows[0]
    if (ticket_id_result) {
      var ticket_id = ticket_id_result.id
      var user_id = ticket_id_result.user_id
      querySql("SELECT ip FROM locations \
        WHERE ticket_id = $1 ORDER BY created DESC", [ticket_id], function(location_ip_results) {
        var location_ip_result = location_ip_results.rows[0]
        if (location_ip_result && location_ip_result.ip != ip) {
          querySql("INSERT INTO locations (ticket_id, ip, user_agent) VALUES ($1, $2, $3)", 
            [ticket_id, ip, user_agent], function() { 
              // don't need to do anything
          }, client)
        }
      }, client)
      callback(undefined, user_id)
    }
    else {
      // reassign a ticket, since that one is not in the database
      console.log("Creating new user because the ticket is bad.")
      _createUser(ip, user_agent, cookies, callback)
      // callback('That ticket cannot be found.')
    }
  })
}
function _getUserIdFromRequest(req, res, cookies, callback) {
  // callback = function(err, user_id) { ... }
  var ticket_cookie = cookies.get('ticket')
  var ip = req.headers['x-real-ip'] || req.client.remoteAddress
  if (ticket_cookie) {
    return _getUserForKey(ip, req.headers['user-agent'], cookies, callback)
  }
  return _createUser(ip, req.headers['user-agent'], cookies, callback)
}
var dichotic_actions = {
  intro_1: function(req, res, state) {
    addHtmlHead(res)
    mu.render(['layout.mu', 'intro_1.mu'], {user_id: state.user_id}).pipe(res)
  },
  intro_2: function(req, res, state) {
    addHtmlHead(res)
    mu.render(['layout.mu', 'intro_2.mu'], {user_id: state.user_id}).pipe(res)
  },
  name: function(req, res, state) {
    addHtmlHead(res)
    
    var context = {
      user_id: state.user_id,
    }
    // need to check if they already have these stimuli pending.
    querySql("INSERT INTO stimuli (user_id, survey_id, name, value) VALUES \
      ($1, 1, 'general', 'name'), \
      ($1, 1, 'general', 'email'), \
      ($1, 1, 'general', 'handedness') \
      RETURNING id", [state.user_id], function(stimulus_id_results) {
        context.name_stimulus_id = stimulus_id_results.rows[0].id
        context.email_stimulus_id = stimulus_id_results.rows[1].id
        context.handedness_stimulus_id = stimulus_id_results.rows[2].id
    
        mu.render(['layout.mu', 'name.mu'], context).pipe(res)
    })
  },
  stimulus: function(req, res, state) {
    var remaining_count = state.remaining.length
    var current_dichotic_index = parseInt(state.remaining[0])
    var pair = dichotic_stimuli_pairs[current_dichotic_index]
    // console.log("Pair: " + pair)
    var controls = dichotic_stimuli_controls[pair.category].sampleMany(2)
    var pair_order = [pair.left.value, pair.right.value]
    if (Math.random() > 0.5)
      pair_order.reverse() // destructive funciton! = [pair.right, pair.left]
    var context = {
      user_id: state.user_id,
      category: pair.category,
      control_1_file: controls[0].file,
      control_1_value: controls[0].value,
      control_2_file: controls[1].file,
      control_2_value: controls[1].value,
      stimulus_file: _fileNameForPair(pair.left.file, pair.right.file),
      stimulus_top: pair_order[0],
      stimulus_bottom: pair_order[1]
    }
    stimulus_details = controls[0].file + ',' + controls[1].file
    querySql("INSERT INTO stimuli (user_id, survey_id, name, value, details) \
      VALUES ($1, 1, $2, $3, $4) RETURNING id", [state.user_id, pair.category, context.stimulus_file, stimulus_details], 
      function(stimulus_id_results) {
        context.stimulus_id = stimulus_id_results.rows[0].id
        
        mu.render(['layout.mu', 'stimulus.mu'], context).pipe(res)
    })
  },
  debrief: function(req, res, state) {
    addHtmlHead(res)
    mu.render(['layout.mu', 'debrief.mu'], {}).pipe(res)
  },
  results: function(req, res) {

    var format = req.url.match(/[?&]format=csv/) ? 'csv' : 'html'
    var user_ids_qs = req.url.match(/[?&]user_ids=([^&]+)/)
    var user_ids = [0]
    var override = 1
    if (user_ids_qs) {
      user_ids = user_ids_qs[1].split(',')
      if (user_ids.length > 0) {
        override = 0
        user_ids = user_ids.map(function(user_id) { return parseInt(user_id) })
      }
      else {
        users_ids = [0]
      }
    }
    
    // var cols = ['user_id', 
    //   'total_time', 'sureness', 
    //   'response_value', 'response_details', 
    //   'stimulus_name', 'stimulus_value', 'stimulus_details']
    var cols = ['user_id', 'category', 'subcategory', 'choice', 'sureness', 'time']

    // var cols = ['user_id', 'category', 'choice', 'sureness', 'time']

    var separator = '\t' //','
    // header
    if (format == 'csv') {
      addTextHead(res)
      res.write(cols.join(separator) + '\n')
    }
    else {
      addHtmlHead(res)
      res.write('<table>\n')
      res.write('<tr><th>' + cols.join('</th><th>') + '</th></tr>\n')
    }

    var in_clause = '(' + user_ids.join(',') + ')'
    querySql("SELECT users.id AS user_id, \
      responses.total_time, responses.sureness, \
      responses.value AS response_value, responses.details AS response_details, \
      stimuli.name AS stimulus_name, stimuli.value AS stimulus_value, \
      stimuli.details AS stimulus_details \
      FROM responses \
      INNER JOIN stimuli ON stimuli.id = responses.stimulus_id \
      INNER JOIN users ON users.id = responses.user_id \
      WHERE (users.id IN (" + user_ids.join(',') + ") OR 1 = $1) \
        AND stimuli.name != 'general' \
      ORDER BY users.id ASC, responses.created DESC", [override],
      function(response_results) {
        response_results.rows.forEach(function(row) {
          var left = 'na'
          var right = 'na'
          if (row.stimulus_name == 'male_female') {
            var matches = row.stimulus_value.match(/\w+_([mf])-l\+\w+_([mf])-r/)
            // if (!matches) console.log(row.stimulus_value)
            left = matches[1] == 'm' ? 'male' : 'female'
            right = matches[2] == 'm' ? 'male' : 'female'
          }
          else {
            var matches = row.stimulus_value.match(/(\w+)-l\+(\w+)-r/)
            // if (!matches) console.log(row.stimulus_value)
            left = matches[1]
            right = matches[2]
          }
          var choice = '?'
          if (row.response_value == left)
            choice = 'L'
          else if (row.response_value == right)
            choice = 'R'
          else
            console.log(row.response_value, left, right)
          
          // I did a silly (sureness || null) when uploading responses, so this fixes that:
          var sureness = row.sureness || 0
          
          var supercategory = 'low'
          if (row.stimulus_name.match(/numbers/)) {
            supercategory = 'high'
          }
          else if (row.stimulus_name == 'male_female') {
            supercategory = 'gender'
          }
          
          var vals = [row.user_id, supercategory, row.stimulus_name, choice, sureness, row.total_time]
          if (format == 'csv')
            res.write(vals.join(separator) + '\n')
          else
            res.write('<tr><td>' + vals.join('</td><td>') + '</td></tr>\n')
        })
        if (format == 'html') {
          res.write('</table>\n')
        }
        res.end()
    })
  }
}

function _getCookieWithDefault(cookies, name, default_value, cookie_options) {
  var cookie_value = cookies.get(name)
  // console.log("cookies[" + name + "] = " + cookie_value)
  if (!cookie_value) {
    cookies.set(name, default_value, cookie_options)
    console.log("cookies[" + name + "] <- " + default_value)
    return default_value
  }
  return cookie_value
}

function dichotic(req, res, action) {
  var cookies = new Cookies(req, res)
  _getUserIdFromRequest(req, res, cookies, function(err, user_id) {
    if (err) 
      throw err
    
    // var state_cookie = querystring.unescape(cookies.get('state') || '') // the cookie is urlencoded
    // JSON.niceParse(state_cookie, dichotic_default_state)
    var state = {}
    state.action = _getCookieWithDefault(cookies, 'action', 'intro', cookieDefaults())
    state.heard = _getCookieWithDefault(cookies, 'heard', 'false', cookieDefaults())
    state.remaining = cookies.get('remaining')
    if (!state.remaining) {
      state.remaining = dichotic_stimuli_indices.shuffle(); // shuffle does a shallow copy of an array, and returns fisher-yates shuffle
      cookies.set('remaining', state.remaining, cookieDefaults())
    }
    else {
      state.remaining = state.remaining.split(',')
    }
    state.user_id = user_id // don't let the user lie about their user_id
    
    // /dichotic/results?key=xxxxxxxxxxxxxxx&user_ids=11,17,2,15,6,3,14,9
    if (action && action.match(/^results/)) {
      var key_qs = req.url.match(/[?&]key=([^&]+)/)
      if (key_qs && key_qs[1]) {
        // almost ashamed of this hack, it's so hacky
        var key_sha512 = hashlib.sha256(key_qs[1])
        if (key_sha512.slice(4) == '5cc607b03a98e337f232b5524c8ef558144d073add6ccd45592eba72b7d5') {
          state.action = 'results'
        }
      }
    }

    dichotic_action = dichotic_actions[state.action] || dichotic_actions["intro_1"]
    dichotic_action(req, res, state)
  })
}

function api(req, res, action) {
  var postData = '';
  req.addListener("data", function(chunk) {
		postData += chunk;
	})
  // todo: handle req's errors.
	req.addListener("end", function() {
    // console.log('postData: ' + postData);

    var cookies = new Cookies(req, res)
    _getUserIdFromRequest(req, res, cookies, function(err, user_id) {
      if (err) throw err
      
      var responses = JSON.niceParse(postData, {})['responses']
      // { responses: 
      //   [ { stimulus_id: 85, total_time: 58987, value: 'ERT' }, ...
      responses.forEach(function(response) {
        var sureness = response.sureness
        if (sureness === undefined)
          sureness = null
        querySql("INSERT INTO responses (user_id, stimulus_id, total_time, sureness, value, details) VALUES ($1, $2, $3, $4, $5, $6)",
          [user_id, response.stimulus_id, response.total_time || null, sureness, response.value || null, response.details || null])
      })
    
      addTextHead(res).end('success')
    })
  })
}

function router(req, res) {
  console.log("Routing request: " + req.url)
  // console.log(req);
  var m = null;
  if (m = req.url.match(/^\/api\/\d+\/(.+)$/)) {
    // discard the version, for now // console.log('API: ' + m[1])
    api(req, res, m[1])
  }
  else if (req.url.match(/^\/test$/)) {
    res.end(util.inspect(req, false, null))
    // console.log(req.headers['x-real-ip'])
  }
  else if (m = req.url.match(/^\/([^\/]+)(\/(.*))?$/)) {
    if (m[1] === 'dichotic') {
      dichotic(req, res, m[3])
    }
    else {
      res.end('That module is not yet supported.')
    }
  }
  else {
    // addHtmlHead(res)
    res.writeHead(302, { 'Location': '/dichotic/'});
    res.end();
    // res.end('Error: 404')
  }
}

// run server
http.createServer(router).listen(CONFIG.port, CONFIG.host)
console.log('Server running at http://' + CONFIG.host + ':' + CONFIG.port + '/')
