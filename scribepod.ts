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
    console.log("Webpage:", webpage)
    console.log("Lines:", lines)
    const mergedLines = splitPageIntoSections(lines, WORDS_FOR_FACT_EXTRACTION);
    websiteDataWithMergedLines[webpage] = mergedLines;
  }
  const summaries = await generateSummary(websiteDataWithMergedLines, true);
  console.log("Summaries:", summaries)
  const discussions = await generateDiscussion(summaries, true, SPLIT_FACTS_BY);
  console.log("Discussions:", summaries)
}

export const main = async () => {
  // Generate The paper summaries and discussions
  const arxivData: ArxivData = await getAllPapers(PAPER_FOLDER_PATH);
  console.log('ArxivData:', arxivData)

  // This gets the lines of each section of each paper and puts them into a single array 
  // so that we can massage the data into the format that generateSummary expects
  // (ArxivData => WebsiteData)
  const arxivPaperAsWebsiteData: WebsiteData = Object.keys(arxivData).reduce((acc, paper) => {
    acc[paper] = arxivData[paper].reduce((acc: string[], section: Section) => [...acc, ...section.lines], []);
    return acc;
  }, {});
  console.log('ArxivPaperAsWebsiteData:', arxivPaperAsWebsiteData)

  console.log('Generating arxiv paper discussions & summaries..');
  await generateSummariesAndDiscussions(arxivPaperAsWebsiteData);
}

main();
