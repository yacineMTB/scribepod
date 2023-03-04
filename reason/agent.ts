// This is just a quick spam code of some v2 version
// ignore this file

import { generateThoughts, Thots } from './localInference';

type StateType = 'listening' | 'responding' | 'done';

interface ConversationMindState {
  stateType: StateType;
  thoughts: string[];
  motive: string;
  world: string[];
  response: string;
}



const updateMindState = (
  oldState: ConversationMindState,
  { stateType, thoughts, motive, world, response }: {
    stateType?: StateType,
    thoughts?: string[],
    motive?: string,
    world?: string[],
    response?: string
  }
): ConversationMindState => {
  const newStateType = stateType || oldState.stateType;
  const newThoughts = [...new Set(thoughts || [...oldState.thoughts])];
  const newMotive = motive || oldState.motive;
  const newWorld = [...new Set(world || [...oldState.world])];
  const newResponse = response || oldState.response;

  return {
    stateType: newStateType,
    thoughts: newThoughts,
    motive: newMotive,
    world: newWorld,
    response: newResponse
  }
}

const processThoughts = (thots: Thots): string[] => {
  const thoughts: string[] = [];
  for (const key in thots) {
    if (thots[key] && key !== 'response') {
      thoughts.push(thots[key].trim());
    }
  }
  return thoughts;
}

const main = async () => {
  let state: ConversationMindState = {
    stateType: 'listening',
    thoughts: [],
    world: [],
    motive: 'Have a productive conversation.',
    response: ''
  }
  const world = [
    "Person: Let me explain how the water cycle works. When the sun heats up water on the earth's surface, the water turns into water vapor and rises into the air. This process is called evaporation.",
    "Person: The water vapor then cools and condenses into clouds. When the clouds become heavy with water droplets, they release the water in the form of precipitation, such as rain, snow, or hail.",
    "Person: The precipitation then falls to the ground, where it can either evaporate again or be absorbed into the ground, which can later contribute to the water supply of streams, lakes, and other bodies of water.",
    "Person: This continuous process of water evaporating, condensing, and precipitating is what we call the water cycle. Now, can you tell me what happens when water vapor cools and condenses into clouds? Why do clouds release water in the form of precipitation?",
    "Person: That's right! You have a good understanding of the water cycle. Do you have any questions or is there anything you would like me to explain further?"
  ]

  for (let i = 0; i < world.length; i++) {
    const sentences = world.slice(0, i + 1);
    state = updateMindState(state, { world: sentences });
    const thoughts = await generateThoughts(sentences);
    const thoughtsArray = processThoughts(thoughts);
    state = updateMindState(state, {
      thoughts: [...thoughtsArray, ...state.thoughts],
      response: thoughts.response.trim() 
    });
    console.log(`\n\n ${i}`)
    console.log(state);
  }
}
main();