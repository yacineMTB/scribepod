## What is this?
What this does:
- Pages through a paper, and creates a series of facts using GPT
- Takes all of those facts, and requests a dialogue to be created about it

I take the output of this, and feed it into tortoise-tts to generate a podcast. It's how https://scribepod.substack.com/ is generated.

# how 2 run
Apologies, put this up quick. If you want to run this, you'll need to replace the localhost/3000 with a GPT inference API of your own. I run one on my own machine for a bunch of stuff that uses it.

To run;
```
npm install
npm run start
```

If you want to add your own paper, download all of the tex files and drop it under `./papers`

