const capitalize = require('capitalize');

function applyTextTransform(text, textTransform) {
  if (textTransform === 'uppercase') {
    return text.toUpperCase();
  } else if (textTransform === 'lowercase') {
    return text.toLowerCase();
  } else if (textTransform === 'capitalize') {
    return capitalize.words(text);
  }
  // textTransform === 'none' or unsupported value
  return text;
}

module.exports = applyTextTransform;
