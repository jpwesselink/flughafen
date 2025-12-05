const globOrig = require("glob");
const { promisify } = require("node:util");
module.exports = promisify(globOrig);
