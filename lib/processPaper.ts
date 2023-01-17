#!/usr/bin/env zx
import * as fs from 'fs';
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
