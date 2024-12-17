import { ChatInterpreter } from './ChatInterpreter';
import { ConsoleChatIO } from './io/ConsoleChatIO';

const rl = new ConsoleChatIO();
const interpreter = new ChatInterpreter(require('./jsonModel.json'), rl);
interpreter.start();