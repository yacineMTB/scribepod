![generated with stable diffusion](https://github.com/yacineMTB/scribepod/blob/master/upscaledrobot.png?raw=true)

# Scribepod, after https://github.com/yacineMTB/scribepod/pull/7

This is a half baked project. I'm building an AI conversational agent, accessible through a webpage. Hey, it might work!
My scribepod code is under ./scribepod

Want to run it?

```
npm install && npm run start-reason-dev                                                                      
python python agent/whisper/app.py (after installing deps, figure it out)
cd ./agent/ear && npm run install & npm run start
```
Not guaranteed to work!

# Important note about code quality
It'll get better! I _promise_

# Scribepod - Podcast Generator, before https://github.com/yacineMTB/scribepod/pull/7
These are my scripts that
- Page through papers (`./paper/<paper_name>/*.tex`) & websites (`./websites/<webpage_name>.*html`) 
  - You can add your own files under those subdirectories!
- Summarize the text into facts with GPT and save the facts under ./output/summaries
  - *Note*, I've abstracted over all my LLMs through a webserver that sits on my machine and serves under `http://localhost:3000/conversation`, I haven't had time to swap this out with openAPI & a key set. See processWebpage.ts
- Takes all of those facts, and requests a dialogue to be created about it through the same `http://localhost:3000/conversation` API.

To run this script
```
npm install
npm run start
```

# Scribepod - Podcast Audio Generator
I started using play.ht. Those scripts aren't really cleaned up. You can try tot figure it out though! Check out `playht.ts` & `downloadConversation.ts`.

## Sample outputs!

```
// ./output/summaries.json
  "Burrito": [
    "-A burrito is a Tex-Mex dish consisting of a wheat flour tortilla wrapped around various fillings",
    "-It originated in Ciudad Juárez, Mexico",
    "-The tortilla is sometimes lightly grilled or steamed to soften it and make it more pliable",
    "-Burritos are often eaten by hand as the wrapping keeps the ingredients together",
    "-They can also be served \"wet\", covered in sauce, and eaten with a fork and knife",
    "-Fillings often include meat, rice, beans, vegetables, cheese, and condiments such as salsa, pico de gallo, guacamole, or crema",
    "-They are often contrasted with tacos, which are made with small hand-sized tortillas folded in half around the ingredients, and enchiladas, which use corn masa tortillas and are covered in sauce",
    "-The word \"burrito\" means \"little donkey\" in Spanish",
    "-The name possibly derives from the tendency for burritos to contain a lot of different things, similar to how a donkey can carry a large burden",
    "-The first known mention of the word \"burrito\" was in the 1895 Dictionary of Mexicanisms",
    "-The dish was popularized in the United States by Mexican farm workers and gained widespread popularity in the 1960s",
    "-The modern burrito's precise origin is unknown",
    "-It was identified as a regional dish from the Mexican state of Guanajuato in the 1895 Diccionario de Mejicanismos by Feliz Ramos i Duarte",
    "-It is speculated to have originated with vaqueros, or Mexican cowboys, in the 19th century",
    "-One origin story involves a street food vendor in Ciudad Juárez during the Mexican Revolution who wrapped food in large homemade flour tortillas to keep it warm, and the dish became known as \"food of the little donkey\" or burrito",
    "-Another origin story involves a vendor in Ciudad Juárez in the 1940s selling tortilla-wrapped food to poor children at a state-run middle school and using the term \"burrito\" as a colloquial term for a dunce or dullard",
    "-Burritos were first mentioned in the U.S. media in 1934 and appeared on American restaurant menus in the 1930s",
    "-A frozen burrito was developed in Southern California in 1956"
  ],
```

```
// ./output/discussions.json
  "Burrito": [
    "Alice: A burrito is a popular Tex-Mex dish that consists of a wheat flour tortilla wrapped around various fillings.",
    "Bob: That sounds delicious! What kind of fillings are typically included in a burrito?",
    "Alice: Fillings for burritos can include meat, rice, beans, vegetables, cheese, and condiments such as salsa, pico de gallo, guacamole, or crema.",
    "Bob: Wow, that's a lot of variety! Where did burritos originate?",
    "Alice: Burritos actually originated in Ciudad Juárez, Mexico.",
    "Bob: Interesting! How is the tortilla typically prepared in a burrito?",
    "Alice: The tortilla is often lightly grilled or steamed to soften it and make it more pliable. This makes it easier to wrap and eat by hand.",
    "Bob: I see. Are burritos always eaten by hand, or are there other ways to eat them?",
    "Alice: Burritos are usually eaten by hand, as the wrapping helps to keep all the ingredients together. However, they can also be served \"wet\", covered in sauce, and eaten with a fork and knife.",
    "Alice: Burritos are often contrasted with other popular Mexican dishes like tacos and enchiladas. Tacos are made with small, hand-sized tortillas that are folded in half around the ingredients, while enchiladas are made with corn masa tortillas and are covered in sauce.",
    "Bob: Ah, that makes sense. I was wondering how these dishes differed from each other. So, where does the word \"burrito\" come from?",
    "Alice: \"Burrito\" means \"little donkey\" in Spanish. It's thought that the name may have come from the fact that burritos often contain a lot of different things, similar to how a donkey can carry a large burden.",
    "Bob: That's an interesting origin! When was the word \"burrito\" first used?",
    "Alice: The first known mention of the word \"burrito\" was in the 1895 Dictionary of Mexicanisms.",
    "Bob: And how did burritos become popular in the United States?",
    "Alice: Burritos were actually popularized in the United States by Mexican farm workers and gained widespread popularity in the 1960s. The exact origins of the modern burrito are unknown, however.",
    "Alice: The burrito was actually identified as a regional dish from the Mexican state of Guanajuato in the 1895 Diccionario de Mejicanismos by Feliz Ramos i Duarte.",
    "Bob: That's really interesting! Do we know how the burrito first came about?",
    "Alice: It's speculated that burritos originated with vaqueros, or Mexican cowboys, in the 19th century. There are a few different origin stories for the dish. One story involves a street food vendor in Ciudad Juárez during the Mexican Revolution who wrapped food in large homemade flour tortillas to keep it warm, and the dish became known as \"food of the little donkey\" or burrito. Another story involves a vendor in Ciudad Juárez in the 1940s selling tortilla-wrapped food to poor children at a state-run middle school and using the term \"burrito\" as a colloquial term for a dunce or dullard.",
    "Bob: That's really interesting! When did burritos start appearing in the United States?",
    "Alice: Burritos were first mentioned in the U.S. media in 1934 and appeared on American restaurant menus in the 1930s. In 1956, a frozen burrito was developed in Southern California.",
    "Bob: Wow, it's amazing to think about how this dish has evolved and spread over time. Thanks for sharing all of this information about burritos with us, Alice. It's been a great discussion.",
    "Alice: No problem, Bob. It's been great talking with you about burritos. I hope you've learned a lot about this delicious and versatile dish."
  ],
```




### What sort of maitenance can I expect?
Not a lot :( I am very busy these days (procastinating on twitter at https://twitter.com/yacineMTB)

### Buy me an avacado toast & maybe a disney subscription ([stripe donate link](https://buy.stripe.com/dR6eWGaK41MX2YgaEF))

