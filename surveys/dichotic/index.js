// pages = [
//   'intro',
//   '',
// ]

// encode state in cookie? or database? database.
state = {}

// there will be two states, and the first one has a few sub-categories.
// 1) vowel differences
//   the various Cee, bVt, etc.
// 2) gender differences



function present_page() {
  // check state. if the user has just 
  
  
}

var dichotic = {
  intro_1: function(req, res, state) {
    addHtmlHead(res)
    amulet.render(['layout.mu', 'intro_1.mu'], {user_id: state.user_id}, res)
  },
  intro_2: function(req, res, state) {
    addHtmlHead(res)
    amulet.render(['layout.mu', 'intro_2.mu'], {user_id: state.user_id}, res)
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
    var controls = dichotic_stimuli_controls[pair.category].sample(2)
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
          if (row.stimulus_name.match(/numbers/) || row.stimulus_name == 'reverses') {
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


function dichotic_router(req, res, action) {
  var cookies = new Cookies(req, res)
  _getUserIdFromRequest(req, res, cookies, function(err, user_id) {
    if (err) { console.log(err); }
    var state = {
      action: (cookies.action || 'intro'),
      index: (cookies.index || 0),
      user_id: user_id
    }

    if (!state.remaining) {
      state.remaining = dichotic_stimuli_indices.shuffle(); // shuffle does a shallow copy of an array, and returns fisher-yates shuffle
      cookies.set('remaining', state.remaining)
    }
    else {
      state.remaining = state.remaining.split(',')
    }
    
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
