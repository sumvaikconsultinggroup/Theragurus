/** Public posts from @thera_gurus, imported November 2026. */
export const instagramReels = [
  { id: "De-s6O2I2cd", title: "Your symptoms deserve to be heard.", duration: "2:14" },
  { id: "DexQHX5IS0K", title: "Support through pregnancy.", duration: "1:17" },
  { id: "Der-TAaI8Cf", title: "Real stories. Personal care.", duration: "0:20" },
  { id: "Demn6njIzQe", title: "Let’s talk about bladder leaks.", duration: "1:01" },
  { id: "Dej9vucoe0f", title: "Your pelvic health matters.", duration: "1:42" },
  { id: "Dd4MrkJIS_Q", title: "Listen to what your body is telling you.", duration: "0:57" },
].map((reel) => ({
  ...reel,
  poster: `/reels/${reel.id}.jpg`,
  video: `/reels/${reel.id}.mp4`,
  url: `https://www.instagram.com/thera_gurus/reel/${reel.id}/`,
}));
