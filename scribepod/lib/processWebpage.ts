#!/usr/bin/env zx
import fs from 'fs';
import got from 'got'
import 'zx/globals';
import { v4 as uuidv4 } from 'uuid'
import { JSDOM } from 'jsdom';

export interface WebsiteData {
  [webpage: string]: string[];
}

export interface WebsiteSummary {
  [webpage: string]: string[];
}

export interface Discussion {
  [webpage: string]: string[];
}
export interface ChatResponse {
  response: string
  conversationId: string
  messageId: string
}

const FOLDER_PATH = './websites';
const PROMPT_URL = 'http://localhost:3000/conversation';
const SUMMARIZE_PROMPT = `
Turn facts from the following section as a bullet list, retaining as much specific details as you can. For example
- Fact 1 about the information
- Fact 2 about the information
`

const FIRST_PODCAST_PROMPT = `
  Could you simulate a podcast conversation between "Alice" and "Bob" having a conversation about the following facts? 
  Some things I'd like to ask:
  - Use "Alice:" and "Bob:" to indicate who is speaking. 
  - Make the dialogue about this as long as possible.
  - Alice is presenting the information, Bob is asking very intelligent questions that help Alice elaborate the facts.
  Here's some of the facts from the paper. but do not end the conversation! I still have more facts I want to include in the dialgoue!
`;
const MIDDLE_PODCAST_PROMPT = `
 Continue the same podcast conversation with this next set of facts. Remember:
  - Make the dialogue about this as long as possible.
  - Alice is presenting the information, Bob is asking very intelligent questions that help Alice elaborate the facts.
  Here's some more facts. Do not end the conversation! I still have more facts I want to include in the dialgoue!
`;
const LAST_PODCAST_PROMPT = `
 Continue this same podcast conversation. Remember;
  - Make the dialogue about this as long as possible.
  - Alice is presenting the information, Bob is asking very intelligent questions that help Alice elaborate the facts.
  These are the last facts for the podcast discussion! Have them make some concluding remarks after talking about these facts, as the podcast is ending.
`;

export const getWebsiteData = async (folderPath: string): Promise<WebsiteData> => {
  const websiteData: WebsiteData = {};
  const folderPathLsResult = await $`ls ${folderPath}`;
  const files = folderPathLsResult.stdout.split('\n').filter((file) => file !== '');

  for (const file of files) {
    // check if file exists
    const html = fs.readFileSync(`${folderPath}/${file}`, 'utf8');
    const dom = new JSDOM(html);
    // remove the script tags
    const scripts = dom.window.document.querySelectorAll('script');
    scripts.forEach((script) => script.remove());
    // save the text content
    const textContent: string = dom.window.document.body.textContent;
    const contentCleaned: string[] = textContent.split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
    websiteData[file] = contentCleaned;
  }
  return websiteData;
}

export const splitPageIntoSections = (lines: string[], wordCountGoal: number): string[] => {
  // split the page into equal sections, as close as to the word count goal as possible
  const totalWords = lines.join(' ').split(' ').length;
  const sectionCount = Math.ceil(totalWords / wordCountGoal);
  const realWordCountGoal = Math.ceil(totalWords / sectionCount);

  const mergedLines: string[] = [];
  let mergedLine = '';
  for (const line of lines) {
    const currentLineWordCount = line.split(' ').length;
    const mergedLineWordCount = mergedLine.split(' ').length;
    if (currentLineWordCount + mergedLineWordCount <= realWordCountGoal) {
      mergedLine += ` ${line}`;
    } else {
      mergedLines.push(mergedLine);
      mergedLine = line;
    }
  }

  // add the last line to the last merged line, whatever
  mergedLines[mergedLines.length - 1] += ` ${mergedLine}`;
  return mergedLines;
}

export const promptGPT = async (text: string, title: string, oneshotPrompt: string, conversationId?: string, parentMessageId?: string): Promise<ChatResponse> => {
  const prompt = `
    ${oneshotPrompt} 
    Title of topic: ${title}
    ${text}
  `;
  const { body } = await got.post(PROMPT_URL, {
    json: {
      prompt,
      conversationId,
      parentMessageId,
    }
  });
  const chatResponse: ChatResponse = JSON.parse(body);
  console.log(chatResponse);
  return chatResponse;
}

export const generateSummary = async (websiteData: WebsiteData, writeToDisk: boolean = true): Promise<WebsiteSummary> => {
  const summarizedSites: WebsiteSummary = JSON.parse(fs.readFileSync(`./output/summaries.json`, 'utf8'));;
  // read sumaries json, avaoid reprocessing the same sites
  for (const [webpage, lines] of Object.entries(websiteData)) {
    let conversationID;
    let parentMessageID;
    if (summarizedSites.hasOwnProperty(webpage)) {
      continue;
    }
    for (const line of lines) {
      try {
        const chatResponse = await promptGPT(line, webpage, SUMMARIZE_PROMPT, conversationID, parentMessageID);
        const gptResponse = chatResponse.response;
        conversationID = chatResponse.conversationId;
        parentMessageID = chatResponse.messageId;
        const points = gptResponse.split('\n').map((line) => line.trim()).filter((line) => line !== '');
        summarizedSites[webpage] = [...(summarizedSites[webpage] || []), ...points];
        if (writeToDisk) {
          fs.writeFileSync(`./output/summaries.json`, JSON.stringify(summarizedSites, null, 2));
        }
      } catch (e) {
        console.log(e);
        // Avoid spamming the big altman
        await sleep(2000);
      }
    }
  }
  return summarizedSites;
}

function splitArray(array, n) {
  const result: any[] = [];
  const chunkSize = Math.ceil(array.length / n);
  for (let i = 0; i < n; i++) {
    const startIndex = i * chunkSize;
    const chunk = array.slice(startIndex, startIndex + chunkSize);
    result.push(chunk);
  }
  return result;
}


// TODO, move the prompting logic up a layer
export const generateDiscussion = async (
  summaries: WebsiteSummary,
  writeToDisk: boolean = true,
  splitsOnFacts: number = 7
): Promise<Discussion> => {
  const discussions: Discussion = JSON.parse(fs.readFileSync(`./output/discussions.json`, 'utf8'));
  let conversationID;
  let parentMessageID;
  for (const [title, summary] of Object.entries(summaries)) {
    if (discussions.hasOwnProperty(title)) {
      continue;
    }
    console.log(`Processing ${title}... number of points: ${summary.length}`);
    const summaryPoints = [...summary];
    const summaryPointsSplit = splitArray(summaryPoints, splitsOnFacts);
    console.log(summaryPointsSplit);
    for (let i = 0; i < summaryPointsSplit.length; i++) {
      const summaryPoint = summaryPointsSplit[i];
      const summarySplitJoined = summaryPoint.join('\n');
      const prompt = i === 0 ? FIRST_PODCAST_PROMPT : i === summaryPointsSplit.length - 1 ? LAST_PODCAST_PROMPT : MIDDLE_PODCAST_PROMPT;
      try {
        const chatResponse = await promptGPT(summarySplitJoined, title, prompt, conversationID, parentMessageID);
        parentMessageID = chatResponse.messageId;
        conversationID = chatResponse.conversationId;
        const gptResponse = chatResponse.response;
        const speech = gptResponse.split('\n').map((line) => line.trim()).filter((line) => line !== '');
        discussions[title] = [...(discussions[title] || []), ...speech];
        if (writeToDisk) {
          fs.writeFileSync(`./output/discussions.json`, JSON.stringify(discussions, null, 2));
        }

      } catch (e) {
        console.log(e);
        // Avoid spamming the big altman
        await sleep(10000);
      }
    }

    break;
  }
  return discussions;
}
