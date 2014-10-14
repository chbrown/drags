<section style="border: 1px solid #EEE; margin-top: 100px; width: 720px">
  <h3>Available surveys</h3>

  <ul>
  {{#surveys}}
    <li><a href="/{{.}}">{{.}}</a></li>
  {{/surveys}}
  </ul>
</section>
