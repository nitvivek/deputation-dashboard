const fs = require('fs');
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRtNK339wNsCATEu20kc0XPlFjHKKahfxZqunH3Gll2mA-9witdSGrKB3-1jmeauT5gbwkNg5Y8rCKk/pub?output=csv')
  .then(res => res.text())
  .then(text => {
    const lines = text.split('\n');
    console.log("Header:", lines[0]);
    console.log("Row 1:", lines[1]);
  });
