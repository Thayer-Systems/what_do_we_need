// Daily rotating prompts shown in the "Ask Mr. Sprinkles" popover.
// One per day, cycling back to the start once the list is exhausted.
export const DAILY_PROMPTS = [
  "🍩 What's the hole story today?",
  "🍩 What can I help you sprinkle on?",
  "🍩 What's worth taking a bite out of today?",
  "🍩 Where should we start this delicious little adventure?",
  "🍩 What are we glazing over today?",
  "🍩 What's got you in a twist today?",
  "🍩 What can I make a little sweeter for you?",
  "🍩 What's your flavor of the day?",
  "🍩 Got something you'd like to roll with?",
  "🍩 What's the next big thing in your donut hole?",
  "🍩 What's your flavor today?",
  "🍩 What are we filling that hole with?",
  "🍩 What's got you feeling glazed and confused?",
  "🍩 What are you hungry for today?",
  "🍩 What can I sprinkle into your day?",
  "🍩 What are we dipping into today?",
  "🍩 Need a little help getting your dough together?",
  "🍩 What's got you craving something sweet?",
  "🍩 What should we get our hands into?",
  "🍩 Ready to get a little sticky?",
  "🍩 What kind of trouble are we getting into today?",
  "🍩 Want me to fill you in?",
  "🍩 What's the hole situation today?",
  "🍩 Got a craving I can satisfy?",
  "🍩 What are we stuffing into the schedule today?",
  "🍩 Feeling a little glazed over? I've got you.",
  "🍩 What's your guilty little craving today?",
  "🍩 Should we make this doughy or dangerous?",
  "🍩 What are you ready to bite into?",
  "🍩 Let's get this dough rolling. What's up?",
];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

export function promptOfDay(date = new Date()) {
  return DAILY_PROMPTS[dayOfYear(date) % DAILY_PROMPTS.length];
}
