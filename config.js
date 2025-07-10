const { config } = require('dotenv');

console.log('loading env..');
const result = config({
    path: __dirname + `/.env`,
});

if (result.error) {
    throw result.error;
}

const { parsed: envs } = result;

module.exports = envs;