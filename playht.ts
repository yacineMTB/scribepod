import dotenv from 'dotenv-safe';
import { Discussion } from './lib/processWebpage';
import { got } from 'got';
import fs from 'fs';

interface SpeechLine {
  text: string;
  voice: string;
}

dotenv.config()
const playHtKey = process.env.PLAY_HT_SECRET_KEY;
const playhtUserId = process.env.PLAY_HT_USER_ID;

// A sampling of voices I enjoyed
const allVoices = [
  'Hudson',
  'Julian', 
  'Nova',
  'Evelyn',
  'Ellie',
]

const convert = async (content: SpeechLine) => {
  // use to lower, and then check if its 'alice'
  let voice: string;
  if (content.voice.toLowerCase() === 'alice') {
    voice = 'Ellie';
  } else {
    voice = 'Hudson';
  }
  try {
    const { body } = await got.post('https://play.ht/api/v1/convert', {
      json: {
        voice,
        content: [content.text]
      },
      headers: {
        'Authorization': playHtKey,
        'X-User-ID': playhtUserId,
        'Content-Type': 'application/json',
      }
    })
    return JSON.parse(body).payload;
  } catch (e) {
    console.error(e);
  }
  return { voice, fail: true };
}

const discussionToSpeechLines = (topicDiscussion: string[]): SpeechLine[] => {
  const speechLines: SpeechLine[] = [];
  for (const line of topicDiscussion) {
    const voice = line.split(':')[0];
    const text = line.split(':').slice(1).join(':');
    speechLines.push({ voice, text });
  }
  return speechLines;
}

// Quick and dirty script to generate speech using play.ht
const main = async () => {
  const discussions: Discussion = JSON.parse(fs.readFileSync(`./output/site_discussions.json`, 'utf8'));
  for (const topic in discussions) {
    const content: SpeechLine[] = discussionToSpeechLines(discussions[topic]);
    const responses: any = [];
    for (const speechLine of content) {
      const response = await convert(speechLine);
      console.log(response);
      responses.push(response[0]);
      fs.writeFileSync('./output/playHTDownloadLinks.json', JSON.stringify(responses, null, 2));
    }
  }

}

main();
