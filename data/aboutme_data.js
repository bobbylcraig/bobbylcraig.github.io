const statements = [
  {
    input: 'bobby.currentLocation',
    return: '"Ohio"'
  },
  {
    input: 'bobby.contactInfo',
    return: '["<a href="mailto:bobbylcraig@gmail.com">bobbylcraig@gmail.com</a>", "<a href="https://www.linkedin.com/in/bobbylcraig/">LinkedIn</a>", "<a href="https://github.com/bobbylcraig">github</a>"]'
  },
  {
    input: 'bobby.resume',
    return: '"<a href="http://denison.academia.edu/bobbylcraig" target="_blank">bobby_craig.pdf</a>"'
  },
  {
    input: 'bobby.interests',
    return: '["design"]'
  },
  {
    input: 'bobby.education',
    return: '"B.Sc. Computer Science - Denison University"'
  },
  {
    input: 'bobby.skills',
    return: '["HTML5", "CSS3", "Sass", "JavaScript", "ReactJS", "webpack", "git", "Sketch"]'
  }
];

export default statements;
