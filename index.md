---
layout: main
---

<div class="intro">

<div class="hr">&nbsp;</div>

<h1>Hi, I'm <strong>Bobby Craig</strong>, an engineer currently living in the San Francisco Bay Area.</h1>

<ul class="socials">
    {% for item in site.social %}
    <li>
        <a target="_blank" href="{{ item.link }}" class="fab fa-{{ item.fa }}"></a>
    </li>
    {% endfor %}
</ul>

<div class="hr">&nbsp;</div>
</div>
