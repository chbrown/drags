<!-- special page gets special styles -->
<style>
body {
  background-color: #FBFBFB;
}
section {
  background-color: white;
  border: 1px solid #EEE;
  padding: 10px;
  margin: 100px;
}
li {
  font-size: 120%;
}
</style>

<section>
  <h2>Available surveys</h2>

  <ul>
  {{#surveys}}
    <li><a href="/{{.}}">{{.}}</a></li>
  {{/surveys}}
  </ul>
</section>
