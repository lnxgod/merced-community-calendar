// Titles follow the public show feed. Keep the YouTube IDs in playback order.
export const playlist = 'PLd3kOWndCbRo';
export const films = [
  ['It’s the Most Wonderful Time of the Year', 'a-kl3qcdaRw'],
  ['I Want a Hippopotamus for Christmas', '7XOEThfC7ZY'],
  ['Polar Express Mashup', '4-Kq4tzWB78'],
  ['Feliz Navidad', 'i-c32cRjHUs'],
];

const key = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const byTitle = new Map(films.map(([title, id]) => [key(title), id]));
export function filmFor(title) {
  return typeof title === 'string' ? byTitle.get(key(title)) : undefined;
}
