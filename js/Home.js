import React from 'react'
import smoothScroll from 'smoothscroll-polyfill'
import 'css/index.scss'

export default class Home extends React.Component {
  render() {
    return (
      <div className="home-container">
        <Navbar />
        <Hero />
        <About statements={this.props.statements}/>
        <h2 id="projects" className="section-title">Projects</h2>
        <Projects projects={this.props.projects}/>
        <div className="background"></div>
        <h2 id="contact" className="section-title">Contact me!</h2>
        <ContactLinks />
        <Footer />
      </div>
    );
  }
}

class Navbar extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const self = this;
    smoothScroll.polyfill();

    document.addEventListener('DOMContentLoaded', function(event) {
      self.refs.navbar.addEventListener('click', function(e) {
        if (e.target.innerText === 'Projects') {
          document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
        } else if (e.target.innerText === 'Contact') {
          document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  render() {
    return (
      <nav className="navbar" ref="navbar">
        <a href="https://bobbylcraig.com/">Home</a>
        <a href="#projects">Projects</a>
        <a href="#contact">Contact</a>
      </nav>
    );
  }
}

class Hero extends React.Component {
  constructor(props) {
    super(props);
    this.typewrite = this.typewrite.bind(this);
    this.state = {
      heroText: ''
    }
  }

  typewrite(str) {
    var text = '';
    var typespeed = 0;
    var mintypespeed = 90;
    var maxtypespeed = 150;
    var self = this;

    for (var i = 0; i <= str.length; i++) {
      (function(x) {
        typespeed += Math.random() * (maxtypespeed - mintypespeed) + mintypespeed;
        setTimeout(function() {
          self.setState({
            heroText: text + '<span>_</span>'
          });
          text += str[x];
        }, typespeed);
      }(i));
    }
  }

  componentDidMount() {
    this.typewrite('Bobby Craig');
  }

  render() {
    return (
      <div className="hero-container">
        <div className="hero-title" ref="heroTitle" dangerouslySetInnerHTML={{__html: this.state.heroText}}></div>
        <div className="hero-description">
          I am a Full Stack Developer attending school in Ohio. The goal for all my projects is to produce simple, beautiful user experiences. Follow my progress by exploring my recent projects below.
        </div>
      </div>
    );
  }
}

class ContactLinks extends React.Component {
  render() {
    return (
      <div className="contact-links">
        <span><a href="mailto:bobbylcraig@gmail.com">bobbylcraig@gmail.com</a></span>
        <span><a href="https://www.linkedin.com/in/bobbylcraig">LinkedIn</a></span>
        <span><a href="https://github.com/bobbylcraig">Github</a></span>
      </div>
    );
  }
}

class Footer extends React.Component {
  render () {
    return (
      <div className="footer">
        <span>Bobby Craig &copy; 2017</span>
      </div>
    );
  }
}

class About extends React.Component {
  render() {
    return (
      <div className="about-container">
        <div className="terminal">
          <div className="terminal-header">
            <div className="header-button red"></div>
            <div className="header-button yellow"></div>
            <div className="header-button green"></div>
          </div>
          <div className="terminal-window">
            <Statements statements={this.props.statements}/>
          </div>
        </div>
      </div>
    );
  }
}

class Statements extends React.Component {
  render() {
    return (
      <div>
        {this.props.statements.map((statement, index) => {
          return <Statement statement={statement} key={index} />;
        })}
        <div className="statement">
          <div className="input-statement">
            <span>&nbsp;</span>
          </div>
        </div>
      </div>
    );
  }
}

class Statement extends React.Component {
  render() {
    return (
      <div className="statement">
        <div className="input-statement">{this.props.statement.input}</div>
        <div className="return-statement" dangerouslySetInnerHTML={{__html: this.props.statement.return}}></div>
      </div>
    );
  }
}


class Projects extends React.Component {
  render() {
    return (
      <div className="projects-container">
        {this.props.projects.map((project, index) => {
          return (
            <ProjectCard projectTitle={project.title}
              projectDescription={project.description}
              projectSkills={project.skills}
              projectLinks={project.links}
              projectScreenshot={project.screenshot}
              key={index} />
          )
        })}
      </div>
    );
  }
}

class ProjectCard extends React.Component {
  componentDidMount() {
    this.refs.screenshot.style.background = "url('./images/" + this.props.projectScreenshot + "')";
    this.refs.screenshot.style.backgroundSize = 'cover';
    this.refs.screenshot.style.backgroundRepeat = 'no-repeat'
  }
  render() {
    return (
      <div className="project-card">
        <div className="project-screenshot" ref="screenshot"></div>
        <div className="project-background"></div>
        <div className="project-content">
          <h3>{this.props.projectTitle}</h3>
          <p dangerouslySetInnerHTML={{__html: this.props.projectDescription}}></p>
          <ProjectSkills skills={this.props.projectSkills}/>
          <ProjectLinks links={this.props.projectLinks}/>
        </div>
      </div>
    );
  }
}

class ProjectSkills extends React.Component {
  render() {
    return (
      <div className="project-skills">
        {this.props.skills.map((skill, index) => {
          return <ProjectSkill skill={skill} key={index} />;
        })}
      </div>
    );
  }
}

class ProjectSkill extends React.Component {
  render() {
    return (
      <span className="project-skill">{this.props.skill}</span>
    );
  }
}

class ProjectLinks extends React.Component {
  render() {
    return (
      <div className="project-links">
        {Object.keys(this.props.links).map((key, index) => {
          return <ProjectLink site={key} link={this.props.links[key]} key={index} />
        })}
      </div>
    );
  }
}

class ProjectLink extends React.Component {
  render() {
    var buttonText = "";
    switch (this.props.site) {
      case 'github':
      case 'codepen':
        buttonText = "View Code";
        break;
      case 'demo':
        buttonText = "Explore Demo";
        break;
      case 'preview':
        buttonText = "See Project";
        break;
      default:
        buttonText = "Open";
    }
    // const buttonText = (this.props.site === 'github') ? 'view code' : 'explore demo';
    return (
      <a href={this.props.link} className="project-link">{buttonText}</a>
    );
  }
}
