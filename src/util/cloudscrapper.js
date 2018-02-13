const challengeRegex = /\(([![\]+]+)\)/g;

/**
 * Parses the challenge string into a decimal.
 * For reference:
 *  - '!' equals 1
 *  - '!![]' equals 1
 *  - '[]' equals 0
 * @param {string} str Required. The string to convert to decimal.
 * @returns {integer} The integer value of the challenge string.
 */
function solveString(str) {
  const parts = str.split('+');
  let count = 0;

  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === '!![]' || parts[i] === '!') count += 1;
  }

  return count;
}

/**
 * Parses the challenge string into a number.
 * For reference, challenge string is divided into two type:
 *  - '+((SOMETHING)+(ANOTHER_THING))' : Each parenthesis expression is a digit in its place in the integer number
 *  - 'SOMETHING'
 * @param {string} str Required. The string to parse.
 * @returns {integer} The integer representation of the challenge string.
 */
function parseString(str) {
  // If string has format +(( ...
  if (!str.startsWith('+((')) {
    return solveString(str);
  }

  const matches = [];

  let match = challengeRegex.exec(str);
  while (match !== null) {
    matches.push(match[1]);
    match = challengeRegex.exec(str);
  }

  let value = '';
  for (let i = 0; i < matches.length; i += 1) {
    value += `${solveString(matches[i])}`;
  }

  return parseInt(value, 10);
}

/**
 * Solves the numerical challenge.
 * @param {string} challenge Required. The string containing the challenge to solve.
 * @returns {integer} The numerical answer for the challenge.
 */
function solveChallenge(challenge) {
  let value = /var [\w,]+ [\w]+={"[\w]+":([![\]()+]+)};/.exec(challenge);
  if (!value) return false;

  value = parseString(value[1]);

  const regex = /[\w.]+([*+-])=([![\]+()]+);/g;

  let match = regex.exec(challenge);
  while (match !== null) {
    const integer = parseString(match[2]);

    switch (match[1]) {
      case '*':
        value *= integer;
        break;
      case '+':
        value += integer;
        break;
      case '-':
        value -= integer;
        break;
      default:
        break;
    }

    match = regex.exec(challenge);
  }

  return value;
}

/**
 * Solves the Cloudflare challenge.
 * @param {object} response Required. The response object of the previous fetched URL.
 * @param {object~HTMLDocument} body Required. The HTMLDocument of the challenge response.
 * @returns {string} The string representation of the URL which solves the challenge.
 */
export default function solveCloudflare(response, body) {
  // Split host and base url
  const [, url, host] = /(https*:\/\/([\w-]+\.[\w]{2,}))\//.exec(response.url);
  if (!url || !host) return false;

  // Get the challenge id
  let challenge = body.match(/name="jschl_vc" value="(\w+)"/);
  if (!challenge) return false;

  const jsChlVc = challenge[1];

  // Get the challenge pass
  const challengePass = body.match(/name="pass" value="(.+?)"/)[1];

  // Solves the challenge and get its answer
  challenge = body.match(/getElementById\('cf-content'\)[\s\S]+?setTimeout.+?\r?\n([\s\S]+?a\.value =.+?)\r?\n/i);
  if (!challenge) return false;

  const answer = {
    jschl_vc: jsChlVc,
    jschl_answer: solveChallenge(challenge[1]) + host.length, // the solution needs to be added to the number of characters in the host name
    pass: challengePass,
  };

  const solution = `${url}/cdn-cgi/l/chk_jschl?jschl_vc=${answer.jschl_vc}&pass=${answer.pass}&jschl_answer=${answer.jschl_answer}`;

  return solution;
}
