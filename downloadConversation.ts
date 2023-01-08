#!/usr/bin/env zx
import fs from 'fs';
import 'zx/globals';

const FOLDER = './output/audio';
// Download the URLs
const main = async () => {
  const responsesFile = './output/playHTDownloadLinks.json';
  const responses: string[] = JSON.parse(fs.readFileSync(responsesFile, 'utf8'));

  // use zx to wget the files
  for (let i = 0; i < responses.length; i++) {
    const url = responses[i];
    const filename = i + '.wav';
    console.log(`downloading ${url} to ${filename}`)
    await $`wget ${url} -O ${FOLDER}/${filename}`;

  }
  console.log('done downloading! now concatenating with ffmpeg...');

  await $`ls ${FOLDER}/*.wav | sort -V > ${FOLDER}/input_list.txt`;
  await $`ffmpeg -f concat -safe 0 -i ${FOLDER}/input_list.txt -c copy ${FOLDER}/output.wav`;
  await $`rm ${FOLDER}/input_list.txt`;
}

main();