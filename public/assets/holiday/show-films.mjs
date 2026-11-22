// Titles follow the public show feed. Keep the YouTube IDs in playback order.
export const playlist = 'PLd3kOWndCbRo';
export const films = [
  ['It’s the Most Wonderful Time of the Year', 'a-kl3qcdaRw'],
  ['I Want a Hippopotamus for Christmas', '7XOEThfC7ZY'],
  ['Polar Express Mashup', '4-Kq4tzWB78'],
  ['Feliz Navidad', 'i-c32cRjHUs'],
  ['Wizards in Winter', 'f-VLsQHJVPs'],
  ['You’re a Mean One, Mr. Grinch', 'lDLMFHTpyHg'],
  ['Frosty the Snowman', 'UPOqyJYtHK4'],
  ['Crystallize', '4XNxyIQ66Nc'],
  ['Carol of the Bells', 'meKaEy04wYE'],
  ['Grandma Got Run Over by a Reindeer', 'G8fQyv83hio'],
  ['Queen of the Winter Night', 'mfzNaZ3ED7I'],
  ['Linus and Lucy', '7pqh1AUh56o'],
  ['Run Rudolph Run', 'yEQ8ozV8l9I'],
  ['Dance of the Sugar Plum Fairy - Astra Build', '9JsP-3ZF2yE'],
  ['Twelve Days of Christmas', 'DCocXJHmL9I'],
  ["The Chipmunk Song (Christmas Don't Be Late)", 'sSjj0BGhyJA'],
  ['What It Sounds Like - Christmas Honmoon', 'AVzQpbXE-Yo'],
];

const key = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const byTitle = new Map(films.map(([title, id]) => [key(title), id]));
byTitle.set(key('Crystalize'), byTitle.get(key('Crystallize')));
export function filmFor(title) {
  return typeof title === 'string' ? byTitle.get(key(title)) : undefined;
}
