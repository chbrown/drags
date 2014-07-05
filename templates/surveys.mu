<section style="background-color: white; border: 1px solid #EEE; padding: 10px; margin: 100px;">
  <h3>Available surveys</h3>

  <ul>
  {{#surveys}}
    <li><a href="/{{.}}">{{.}}</a></li>
  {{/surveys}}
  </ul>
</section>
