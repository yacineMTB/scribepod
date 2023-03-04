import express from 'express';
import bodyParser from 'body-parser';
import asyncHandler from "express-async-handler"
import cors from 'cors';
import multer from 'multer';
import { postAudioData, generateThoughts, Thots } from './localInference';

// Init block
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// end init block

type StateType = 'listening' | 'responding' | 'done';
type EventType = 'new_transcription' | 'silence_detected';


class MindState {
  stateType: StateType;
  latestQuestion: string;
  thoughts: string[];
  derived_intent: string[];
  subject_is: string[];
  responses: string[];

  constructor(public conversation: string[]) {
    this.latestQuestion = '';
    this.stateType = 'listening';
    this.thoughts = [];
    this.derived_intent = [];
    this.subject_is = [];
    this.responses = [];
  }

  updateThoughts = (thots: Thots) => {
    const {extra_state, intent, person_is, response, thoughts} = thots;
    const dedupedThoughts = Array.from(new Set([...this.thoughts, thoughts, extra_state])).slice(-5); 
    const dedupedDerivedIntent = Array.from(new Set([...this.derived_intent, intent])).slice(-5);
    const dedupedSubjectIs = Array.from(new Set([...this.subject_is, person_is])).slice(-5);
    const dedupedResponses = Array.from(new Set([...this.responses, response])).slice(-5);
    this.subject_is = dedupedSubjectIs;
    this.thoughts = dedupedThoughts;
    this.derived_intent = dedupedDerivedIntent;
    this.responses = dedupedResponses;
  }

  updateConversation = (newTranscription: string, chunk: number) => {
    if (chunk === 1) {
      this.conversation = [...this.conversation, newTranscription];
    } else {
      this.conversation[this.conversation.length - 1] = newTranscription;
    }
    this.eventHandler({ type: 'new_transcription' });
  }

  eventHandler = async (event: { type: EventType }): Promise<string> => {
    return ''
  }

}

let conversation = new MindState([]);

app.get('/silence_detect', asyncHandler(async (req: any, res: any, next) => {
  console.log('hi');
}));

app.post('/conversation', upload.any(), asyncHandler(async (req: any, res: any, next) => {
  const { chunk } = req.query;
  const { files } = req;

  const chunkInt = parseInt(chunk);
  const buf = files[0];
  const transcriptionResponse = await postAudioData(buf);
  conversation.updateConversation(transcriptionResponse, chunkInt)

  const thots = await generateThoughts(conversation.conversation);
  conversation.updateThoughts(thots);

  const conversationState = {
    thoughts: conversation.thoughts,
    derived_intent: conversation.derived_intent,
    subject_is: conversation.subject_is,
    responses: conversation.responses,
  }
  res.json({ transcriptionResponse, conversationState});
}));

const port = 4200;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});