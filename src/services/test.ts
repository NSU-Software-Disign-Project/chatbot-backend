import { ChatInterpreter } from '../control/interpreter/ChatInterpreter';
import { ConsoleChatIO } from '../boundary/io/ConsoleChatIO';

const rl = new ConsoleChatIO();
const interpreter = new ChatInterpreter(require('./jsonModel.json'), rl);
interpreter.start();