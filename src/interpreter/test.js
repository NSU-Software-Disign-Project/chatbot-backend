const interpreter = require("./interpreter_js.js");

const model = require("./jsonModel.json");
const chatInterpreter = new interpreter.ChatInterpreter(model);
chatInterpreter.start();