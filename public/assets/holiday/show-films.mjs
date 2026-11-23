// Titles follow the public show feed. Keep the YouTube IDs in playback order.
export const playlist = 'PLTJJSNcxZlKE';
export const films = [
  ['It’s the Most Wonderful Time of the Year', 'cLFQ1-5O2zQ'],
  ['I Want a Hippopotamus for Christmas', 'yGWIm1crzp8'],
  ['Polar Express Mashup', '8M8PNzHmevs'],
  ['Feliz Navidad', 'BGcNpmQErn0'],
  ['Wizards in Winter', 'oxaNGmr3TjA'],
  ['You’re a Mean One, Mr. Grinch', 'qelUCUs7r0M'],
  ['Frosty the Snowman', 'fmQfwe4f3zM'],
  ['Crystallize', '8l7GqvFvkhI'],
  ['Carol of the Bells', 'naQOi4ujxno'],
  ['Grandma Got Run Over by a Reindeer', 'B_M5gec8Tbc'],
  ['Queen of the Winter Night', '0RkiGJxtMto'],
  ['Linus and Lucy', 'NlRTC0m3qWw'],
  ['Run Rudolph Run', 'V2-bCkU-qxI'],
  ['Dance of the Sugar Plum Fairy - Astra Build', 'w-xhbnykjMI'],
  ['Twelve Days of Christmas', 'jsW4f46WWo4'],
  ["The Chipmunk Song (Christmas Don't Be Late)", 'npapHq_ZDBU'],
  ['What It Sounds Like - Christmas Honmoon', 'XfY2m6yzZpA'],
  ['PAW Patrol Christmas - Chase and Rubble', 'Z9Q1DJ-gEBU'],
];

const key = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const byTitle = new Map(films.map(([title, id]) => [key(title), id]));
byTitle.set(key('Crystalize'), byTitle.get(key('Crystallize')));
export function filmFor(title) {
  return typeof title === 'string' ? byTitle.get(key(title)) : undefined;
}
