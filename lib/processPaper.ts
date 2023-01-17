#!/usr/bin/env zx
import * as fs from 'fs';
import 'zx/globals';
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

interface GroupedSection {
  groupedTitle: string;
  text: string;
}
interface Prompt {
  title: string;
  sections: GroupedSection[];
}
export interface Section {
  sectionName: string;
  lines: string[];
}
export interface ArxivData {
  [title: string]: Section[];
}


const FOLDER_PATH = './papers';

export const getSections = (tex: string): Section[] => {
  // create a list of tuples where the first element is the section name and the second element is the section content
  const unprocessedSections: string[] = tex.split('\\section{').slice(1);
  const processedSections: Section[] = unprocessedSections.map((section) => {
    const sectionName = section.split('}')[0];
    // remove all new lines that start with a % sign or are empty or are only whitespace or a
    // remove all lines thata are less than 50 characters
    const lines = section
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith('%'))
      .filter((line) => !line.startsWith('\\'))
      .filter((line) => line.length > 50);
    console.log('Section:', sectionName, 'lines:', lines)
    return { sectionName: sectionName.toLowerCase(), lines };
  });
  return processedSections;
}

// TODO(whoamikidding): Render the title through something more reliable (like the arxiv ID)
export const getTitle = (tex) => {
  const title = tex.split('\\title{')[1] && tex.split('\\title{')[1].split('}')[0];
  console.log('Title:', title)
  return title;
}

const promptGPT = async (text: string, title: string, oneshotPrompt: string, maxTokens: number = 250) => {
  const prompt = `
${oneshotPrompt}
Paper section title: ${title}
Paper text: 
${text}
  `;
  console.log('Prompt for GPT:')
  console.log(prompt)
  console.log('')
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0.6,
    max_tokens: maxTokens
  });
  // console.log('completion:', completion)
  // console.log('completion.data:', completion.data)
  // console.log('completion.data.choices:', completion.data.choices)
  return completion.data.choices[0].text;

  // const { body } = await got.post(PROMPT_URL, {
  //   json: {
  //     prompt,
  //   }
  // });
  // return JSON.parse(body).promptResponse.response;
}

// yes.
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// For each folder in the "papers" folder, get all the sections and their corresponding text
// At the end of this loop, arxivData will be a dictionary where the key is the title of the paper
// and the value is a list of sections.
export const getAllPapers = async (folder: string): Promise<ArxivData> => {
  const arxivData: ArxivData = {};
  const folderPathLsResult = await $`ls ${folder}`;
  const folders = folderPathLsResult.stdout.split('\n');

  for (const folder of folders) {
    const folder_path = `${FOLDER_PATH}/${folder}`;
    const latexFiles = await $`find ${folder_path} -type f | grep tex$`;

    let allOfTheTexInTheFolder = '';
    for (const file of latexFiles.stdout.split('\n')) {
      if (fs.existsSync(file)) {
        const tex = fs.readFileSync(file, 'utf8');
        allOfTheTexInTheFolder += tex;
      }
    }

    const sections = getSections(allOfTheTexInTheFolder);
    const title = getTitle(allOfTheTexInTheFolder) || folder;
    arxivData[title] = sections;
  }
  return arxivData;
}

// For each paper, we want to create a prompt for each section. However, GPT has a token limit
// per prompt. So, we need to group sections together until its attention limit is reached. 
// Warning, lurky
export const createPromptsFromArxivData = async (arxivData: ArxivData): Promise<Prompt[]> => {
  const prompts: Prompt[] = []
  for (const title in arxivData) {
    const sections = [...arxivData[title]];
    const groupedSections: {groupedTitle: string, text: string}[] = [];
    let groupedSectionName = '';
    let groupedSectionText = '';
    while (sections.length > 0) {
      const section = sections.shift();
      const sectionName = section?.sectionName || ''; 
      const sectionText = section?.lines.join(' ') || '';
      // if the word length is greater than 2000, then we should start a new group
      const textWordCount = sectionText.split(' ').length + groupedSectionText.split(' ').length;
     if (textWordCount > 2000) {
        groupedSections.push({
          groupedTitle: groupedSectionName,
          text: groupedSectionText
        });
        groupedSectionName = '';
        groupedSectionText = '';
      }
      if (groupedSectionName.length == 0) { groupedSectionName = sectionName } else { groupedSectionName += (', ' + sectionName)};
      if (groupedSectionText.length == 0) { groupedSectionText = sectionText } else { groupedSectionText += ('\n\n ' + sectionText)};
    }
    groupedSections.push({
      groupedTitle: groupedSectionName,
      text: groupedSectionText
    });

    console.log('groupedSections:')
    console.log(JSON.stringify(groupedSections));
    prompts.push({
      title,
      sections: groupedSections
    });
  }
  return prompts;
}

// For each prompt, we want to generate a summary for each section.
const generateSummariesForPapers = async (prompts: Prompt[], writeToDisk: boolean = true): Promise<{[key: string]: string[]}> => {
  const summarizedPapers: {[key: string]: string[]} = {};
  for (const prompt of prompts) {
    summarizedPapers[prompt.title] = [];
    for (const section of prompt.sections) {
      try {
        const gptResponse = await promptGPT(section.text, section.groupedTitle, SUMMARIZE_PROMPT, maxTokens=500);
        summarizedPapers[prompt.title] = [...summarizedPapers[prompt.title], ...gptResponse.split('\n')];
        if (writeToDisk) {
          fs.writeFileSync(`./output/summarizedPapers.json`, JSON.stringify(summarizedPapers, null, 2));
        }
      } catch (e) {
        console.log(e);
        // Avoid spamming the big altman
        await sleep(2000);
      }
    }
  }
  return summarizedPapers;
}

// Using the summaries and generate a discussion for each paper
const generateDiscussionForPaper = async (
  summaries: {[key: string]: string[]}, 
  writeToDisk: boolean = true
): Promise<{[key: string]: string[]}> => {
  const discussions: {[key: string]: string[]} = {};
  for (const title in summaries) {
    const summary = summaries[title];
    try {
      const gptResponse = await promptGPT(summary.join('\n'), title, PODCAST_PROMPT, maxTokens=2000);
      discussions[title] = gptResponse.split('\n');
      if (writeToDisk) {
        fs.writeFileSync(`./output/discussions.json`, JSON.stringify(discussions, null, 2));
      }
    } catch (e) {
      console.log(e);
      // Avoid spamming the big altman
      await sleep(2000);
    }
  }
  return discussions;
}

const main = async () => {
  const arxivData: ArxivData = await getAllPapers(FOLDER_PATH);
  const prompts: Prompt[] = await createPromptsFromArxivData(arxivData);
  const summaries = await generateSummariesForPapers(prompts, true);
  const discussions = await generateDiscussionForPaper(summaries, true);
  console.log('Discussions:')
  for (const title in discussions) {
    console.log(title)
    console.log(discussions[title].join('\n'))
  }
  console.log("\nDone!")
}

main();
