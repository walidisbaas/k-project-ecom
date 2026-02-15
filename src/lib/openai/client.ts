import OpenAI from "openai";

let _openai: OpenAI | null = null;

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    if (!_openai) {
      _openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
    return Reflect.get(_openai, prop, receiver);
  },
});
