import FirecrawlApp from "@mendable/firecrawl-js";

let _firecrawl: FirecrawlApp | null = null;

export const firecrawl: FirecrawlApp = new Proxy({} as FirecrawlApp, {
  get(_target, prop, receiver) {
    if (!_firecrawl) {
      _firecrawl = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY!,
      });
    }
    return Reflect.get(_firecrawl, prop, receiver);
  },
});
