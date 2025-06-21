import { ChatInterpreter } from '../control/interpreter/ChatInterpreter';
import { ConsoleChatIO } from '../boundary/io/ConsoleChatIO';
import * as fs from 'fs';
import * as path from 'path';

// Read the JSON model file
const jsonModelPath = path.join(
  __dirname,
  '../boundary/websocket/jsonModel.json',
);
const jsonModelContent = fs.readFileSync(jsonModelPath, 'utf-8');
const model = JSON.parse(jsonModelContent);

const rl = new ConsoleChatIO();
const interpreter = new ChatInterpreter(model, rl);
interpreter.start();
