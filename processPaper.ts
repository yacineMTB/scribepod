#!/usr/bin/env zx
import fs from 'fs';
import got from 'got'
import 'zx/globals';


interface GroupedSection {
  groupedTitle: string;
  text: string;
}
interface Prompt {
  title: string;
  sections: GroupedSection[];
}
interface Section {
  sectionName: string;
  lines: string[];
}
interface ArxivData {
  [title: string]: Section[];
}


const FOLDER_PATH = './papers';
// However you're getting to GPT
// You could use the openAI API, I have a webserver running on my machine that I use to talk to GPT
// Just didn't have time to swap it out
const PROMPT_URL = 'http://localhost:3000/conversation'; 
const SUMMARIZE_PROMPT = `Turn facts from the following section as a bullet list, retaining the specific details`
const PODCAST_PROMPT = `
  Could simulate simulate a podcast conversation between "Alice" and "Bob" having a very engaging converstaion about a research paper? The conversation should be intelligent, elaborative, with each speaker asking questions and makign comments.
  Some things I'd like to ask:
  - Use "Alice:" and "Bob:" to indicate who is speaking. 
  - Make dialogue as long as possible. I want the dialogue to be 4000 words
  Here's a summary of the paper:
`;


const getSections = (tex: string): Section[] => {
  // create a list of tuples where the first element is the section name and the second element is the section content
  const unprocessedSections: string[] = tex.split('\\section{');
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
    return { sectionName: sectionName.toLowerCase(), lines };
  });
  return processedSections;
}

// TODO: Render the title through something more reliable (like the arxiv ID)
const getTitle = (tex) => {
  const title = tex.split('\\title{')[1] && tex.split('\\title{')[1].split('}')[0];
  return title;
}

const promptGPT = async (text: string, title: string, oneshotPrompt: string) => {
  const prompt = `
    ${oneshotPrompt} 
    Paper section title: ${title}
    The text: 
    ${text}
  `;
  const { body } = await got.post(PROMPT_URL, {
    json: {
      prompt,
    }
  });
  return JSON.parse(body).promptResponse.response;
}

// yes.
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// For each folder in the papers folder, get all of the sections and their corresponding text
// At the end of this loop, arxivData will be a dictionary where the key is the title of the paper
// and the value is a list of sections. 
const getAllPapers = async (folder: string): Promise<ArxivData> => {
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
const createPromptsFromArxivData = async (arxivData: ArxivData): Promise<Prompt[]> => {
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
          text: sectionText
        });
        groupedSectionName = '';
        groupedSectionText = '';
      }
      groupedSectionName += (' ' + sectionName);
      groupedSectionText += (' ' + sectionText);
    }
    groupedSections.push({
      groupedTitle: groupedSectionName,
      text: groupedSectionText
    });

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
        const gptResponse = await promptGPT(section.text, section.groupedTitle, SUMMARIZE_PROMPT);
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
      const gptResponse = await promptGPT(summary.join('\n'), title, PODCAST_PROMPT);
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
  console.log(discussions);
  console.log("Done!")
}

main();