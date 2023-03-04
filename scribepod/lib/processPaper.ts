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

// TODO(whoamikidding): Render the title through something more reliable (like the arxiv ID)
export const getTitle = (tex) => {
  const title = tex.split('\\title{')[1] && tex.split('\\title{')[1].split('}')[0];
  return title;
}

// For each folder in the papers folder, get all of the sections and their corresponding text
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