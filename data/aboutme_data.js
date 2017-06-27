const statements = [
  {
    input: 'pwd',
    return: '/Users/guest/'
  },
  {
    input: 'ls -l',
    return: 'drwxr-xr-x&nbsp;&nbsp;1&nbsp;guest&nbsp;&nbsp;everyone&nbsp;&nbsp;&nbsp;&nbsp;201&nbsp;Jun&nbsp;24&nbsp;11:11&nbsp;bobby-info.txt<br>drw-------&nbsp;&nbsp;1&nbsp;bobby&nbsp;&nbsp;everyone&nbsp;&nbsp;22349&nbsp;Jun&nbsp;25&nbsp;18:46&nbsp;bobbys-deepest-darkest-secrets.txt<br>drwxr-xr-x&nbsp;&nbsp;1&nbsp;guest&nbsp;&nbsp;everyone&nbsp;&nbsp;&nbsp;&nbsp;312&nbsp;Jun&nbsp;22&nbsp;22:01&nbsp;contact-info.txt<br>drwxr-xr-x&nbsp;&nbsp;1&nbsp;guest&nbsp;&nbsp;everyone&nbsp;&nbsp;43727&nbsp;Jun&nbsp;21&nbsp;12:03&nbsp;<a href="http://denison.academia.edu/bobbylcraig">bobby_craig_resume.pdf</a>'
  },
  {
    input: 'cat bobbys-deepest-darkest-secrets.txt',
    return: '-bash: cat: bobbys-deepest-darkest-secrets.txt: Permission Denied'
  },
  {
    input: 'cat bobby-info.txt',
    return: 'Bobby Craig - Full Stack Developer<br>Student at <a href="https://denison.edu">Denison University</a> (BSc CompSci)<br>Software Engineering Intern at <a href="https://mailchimp.com">MailChimp</a>'
  },
  {
    input: 'cat contact-info.txt',
    return: 'Email...... <a href="mailto:bobbylcraig@gmail.com">bobbylcraig@gmail.com</a><br>Location... <a href="https://www.google.com/maps/place/Ohio/@40.1687077,-84.9126117,7z/data=!3m1!4b1!4m5!3m4!1s0x8836e97ab54d8ec1:0xe5cd64399c9fd916!8m2!3d40.4172871!4d-82.907123">Ohio</a><br>LinkedIn... <a href="https://www.linkedin.com/in/bobbylcraig/">LinkedIn</a><br>GitHub..... <a href="https://github.com/bobbylcraig">GitHub</a><br>Codepen.... <a href="http://codepen.io/bobbylcraig">Codepen</a>'
  },
];

export default statements;
