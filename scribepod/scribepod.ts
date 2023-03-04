// import all the functions from processWebpage.ts
import { WebsiteData, getWebsiteData, splitPageIntoSections, generateSummary, generateDiscussion } from './lib/processWebpage';
import { getAllPapers, ArxivData, Section } from './lib/processPaper';
const PAPER_FOLDER_PATH = './papers' ;
const WEBSITE_FOLDER_PATH = './websites';

// You might need to play around with these a bit
const WORDS_FOR_FACT_EXTRACTION = 2000;
// TODO: Turn into something that generates equal sized chunks rather than just splitting arbitarily 
const SPLIT_FACTS_BY = 5;

const generateSummariesAndDiscussions = async (websiteData: WebsiteData): Promise<void> => {
  const websiteDataWithMergedLines: WebsiteData = {};
  for (const [webpage, lines] of Object.entries(websiteData)) {
    const mergedLines = splitPageIntoSections(lines, WORDS_FOR_FACT_EXTRACTION);
    websiteDataWithMergedLines[webpage] = mergedLines;
  }
  const summaries = await generateSummary(websiteDataWithMergedLines, true);
  await generateDiscussion(summaries, true, SPLIT_FACTS_BY);
}

export const main = async () => {
  const websiteData: WebsiteData = await getWebsiteData(WEBSITE_FOLDER_PATH);
  console.log('Generating website discussions & summaries..');
  generateSummariesAndDiscussions(websiteData);

  // Generate The paper summaries and discussions
  // TODO: Change hte interface of getAllPapers to return the websiteData interface
  const arxivData: ArxivData = await getAllPapers(PAPER_FOLDER_PATH);

  // This gets the lines of each section of each paper and puts them into a single array 
  // so that we can massage the data into the format that generateSummary expects
  // (ArxivData => WebsiteData)
  const arxivPaperAsWebsiteData: WebsiteData = Object.keys(arxivData).reduce((acc, paper) => {
    acc[paper] = arxivData[paper].reduce((acc: string[], section: Section) => [...acc, ...section.lines], []);
    return acc;
  }, {});

  console.log('Generating arxiv paper discussions & summaries..');
  generateSummariesAndDiscussions(arxivPaperAsWebsiteData);
}

main();