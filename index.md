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

<div class="content row">
    <div class="column">

        <!-- Begin Experience -->
        <div class="content-class">
            <h3>Experience</h3>
            <ul>
                {% for job in site.data.settings.experience %}
                <li>
                    <h4><a href="{{ job.company_link }}">{{ job.company }}</a></h4>
                    <p>{{ job.title }}</p>
                </li>
                {% endfor %}
            </ul>
        </div>
        <!-- End Experience -->

        <!-- Begin Writings -->
        <div class="content-class">
            <h3>Writings</h3>
            <ul>
                {% for article in site.data.settings.writings %}
                <li>
                    <h4><a href="{{ article.link }}">{{ article.title }}</a></h4>
                    <p>{{ article.medium }} &middot; <em>{{ article.date }}</em></p>
                </li>
                {% endfor %}
            </ul>
        </div>
        <!-- End Writings -->

        <!-- Begin Talks -->
        <div class="content-class">
            <h3>Talks</h3>
            <p>Coming soon...</p>
        </div>
        <!-- End Talks -->

    </div>

    <div class="column">
        <!-- Begin Projects -->
        <div class="content-class">
            <h3>Projects</h3>
            <ul>
                {% for project in site.projects %}
                <li>
                    <h4><a href="{{ project.link }}">{{ project.title }}</a></h4>
                    <p>{{ project.subtitle }}</p>
                </li>
                {% endfor %}
            </ul>
            <p style="margin-top: 1em;">More to be added to site...</p>
        </div>
        <!-- End Projects -->
    </div>

</div>