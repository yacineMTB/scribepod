![generated with stable diffusion](https://github.com/yacineMTB/scribepod/blob/master/upscaledrobot.png?raw=true)

# Scribepod - Podcast Generator
These are my scripts that
- Page through papers (`./paper/<paper_name>/*.tex`) & websites (`./websites/<webpage_name>.*html`) 
  - You can add your own files under those subdirectories!
- Summarize the text into facts with GPT and save the facts under ./output/summaries
  - *Note*, I've abstracted over all my LLMs through a webserver that sits on my machine and serves under `http://localhost:3000/conversation`, I haven't had time to swap this out with openAPI & a key set. See processWebpage.ts
- Takes all of those facts, and requests a dialogue to be created about it thorugh the same `http://localhost:3000/conversation` API.

To run this script
```
npm install
npm run start
```

# Scribepod - Podcast Audio Generator
I started using play.ht. Those scripts aren't really cleaned up. You can try tot figure it out though! Check out `playht.ts` & `downloadConversation.ts`.

### What sort of maitenance can I expect?
Not a lot :( I am very busy these days (procastinating on twitter at https://twitter.com/yacineMTB)

### Buy me an avacado toast (donate link)
[support scribepod with stripe](https://buy.stripe.com/dR6eWGaK41MX2YgaEF)

