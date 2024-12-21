export interface IChatIO {
    sendMessage(message: string): void;
    getInput(prompt: string, callback: (input: string) => void): void;
    sendError(message: string): void;
    close(): void;
}