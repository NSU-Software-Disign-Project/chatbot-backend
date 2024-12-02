import { ChatInterpreter } from './interpreter';

const interpreter = new ChatInterpreter(require('./jsonModel.json'));
interpreter.start();