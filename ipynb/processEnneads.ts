// yep, this is what peak performance looks like
// you might not like it
// but you should probably learn javascript
import fs from 'fs';
import 'zx/globals';

const main = async () => {
  const enneadLines = fs.readFileSync('enneads.txt', 'utf8').split('\n').map(s => s.trim());

  // regex to match ennead lines with 'Tractate'
  const tractateRegex = /TRACTATE.$/;
  const enneadLinesWithTractate = enneadLines
    .map((line, i) => ({ line, i }))
    .filter(({ line, i }) => tractateRegex.test(line));

  const enneadTitleRegex = /THE.*ENNEAD$/;
  const enneadTitleLines = enneadLines
    .map((line, i) => ({ line, i }))
    .filter(({ line, i }) => enneadTitleRegex.test(line));

  // section, space, and ends with a digit
  const sectionRegex = /Section.*\d$/;
  const sectionLines = enneadLines
    .map((line, i) => ({ line, i }))
    .filter(({ line, i }) => sectionRegex.test(line));

  console.log(sectionLines);

  // for each ennead, get the whole ennead
  const enneads: any[] = [];

  for (let j = 0; j < sectionLines.length; j++) {
    const { line: sectionTitle, i: sectionIndex } = sectionLines[j];
    const currentEnnead = enneadTitleLines.filter(({ i }) => i < sectionIndex).pop();
    const currentTractate = enneadLinesWithTractate.filter(({ i }) => i < sectionIndex).pop();
    const { line: enneadTitle } = currentEnnead || {};
    const { line: tractateTitle } = currentTractate || {};
    let currentLines: any;
    if (j < sectionLines.length - 1) {
      const { i: nextSectionIndex } = sectionLines[j + 1];
      currentLines = enneadLines.slice(sectionIndex, nextSectionIndex);
    } else {
      currentLines = enneadLines.slice(sectionIndex);
    }
    // empty strings are new lines. remove the empty strings if they are duplicates
    currentLines = currentLines.filter((line, i) => {
      if (line === '') {
        return currentLines[i - 1] !== '';
      }
      return true;
    });
    // turn all of the empty strings into new lines
    currentLines = currentLines.map(line => line === '' ? '\n' : line);

    enneads.push({ enneadTitle, tractateTitle, sectionTitle, lines: currentLines.join(' ') });

  }

  fs.writeFileSync('./enneads.json', JSON.stringify(enneads, null, 2));
}
main();
