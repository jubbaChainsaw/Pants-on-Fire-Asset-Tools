export const BANNED_WORD_BANK = {
  'prompt::sports::0': ['bat', 'pitcher', 'stadium', 'scoreboard', 'coach'],
  'prompt::sports::1': ['referee', 'supporters', 'captain', 'season', 'training'],
  'prompt::sports::2': ['tournament', 'singles', 'doubles', 'umpire', 'grip'],
  'prompt::sports::3': ['champion', 'fitness', 'crowd', 'aggressive', 'professional'],
  'prompt::food::0': ['crispy', 'restaurant', 'delivery', 'toppings', 'stuffed'],
  'prompt::food::1': ['mustard', 'barbecue', 'greasy', 'handheld', 'snack'],
  'prompt::food::2': ['breakfast', 'steaming', 'sugar', 'morning', 'cafe'],
  'prompt::food::3': ['bakery', 'frosting', 'gooey', 'treat', 'party'],
  'prompt::movies::0': ['franchise', 'merchandise', 'funny', 'family', 'adventure'],
  'prompt::movies::1': ['blockbuster', 'director', 'soundtrack', 'suspense', 'iconic'],
  'prompt::movies::2': ['relationship', 'dramatic', 'emotional', 'chemistry', 'memorable'],
  'prompt::movies::3': ['cinematography', 'director', 'ambitious', 'complex', 'masterpiece'],
  'prompt::music::0': ['frontman', 'album', 'touring', 'anthem', 'fans'],
  'prompt::music::1': ['teenage', 'chorus', 'gigs', 'melody', 'mosh'],
  'prompt::music::2': ['intense', 'stage', 'headline', 'riffs', 'chaotic'],
  'prompt::music::3': ['virtuoso', 'concert', 'legendary', 'solo', 'discography'],
};

export function sanitizeBannedWords(categoryName, hint, main, imposter, words) {
  const forbidden = new Set(
    `${categoryName} ${hint} ${main} ${imposter}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
  return (words || []).filter((word) => {
    const parts = word.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    return parts.length && !parts.some((part) => forbidden.has(part));
  }).slice(0, 5);
}

export const DEFAULT_CATEGORIES = [
  { id: 'sports', name: 'Sports', emoji: '🏀', prompts: [
    { hint: 'Ball Sport', main: 'Basketball', imposter: 'Baseball' },
    { hint: 'Contact Team Sport', main: 'Football', imposter: 'Rugby' },
    { hint: 'Racket Sport', main: 'Tennis', imposter: 'Badminton' },
    { hint: 'Combat Sport', main: 'Boxing', imposter: 'MMA' },
    { hint: 'Winter Sport', main: 'Ice Hockey', imposter: 'Lacrosse' },
    { hint: 'Precision Sport', main: 'Archery', imposter: 'Darts' },
    { hint: 'Motorsport', main: 'Formula 1', imposter: 'NASCAR' },
    { hint: 'Board Sport', main: 'Skateboarding', imposter: 'Snowboarding' },
    { hint: 'Post-match Vibe (18+)', main: 'Kissing your date in the car park', imposter: 'Arguing in the taxi queue', adultOnly: true },
  ]},
  { id: 'food', name: 'Food', emoji: '🍕', prompts: [
    { hint: 'Italian-ish Comfort Food', main: 'Pizza', imposter: 'Calzone' },
    { hint: 'Fast Food', main: 'Burger', imposter: 'Hot Dog' },
    { hint: 'Hot Drink', main: 'Tea', imposter: 'Coffee' },
    { hint: 'Dessert', main: 'Cake', imposter: 'Brownie' },
    { hint: 'Noodle Dish', main: 'Ramen', imposter: 'Udon' },
    { hint: 'Street Food', main: 'Tacos', imposter: 'Burrito' },
    { hint: 'Breakfast', main: 'Pancakes', imposter: 'Waffles' },
    { hint: 'Sweet Snack', main: 'Donut', imposter: 'Bagel' },
    { hint: 'After-party Snack (18+)', main: 'Cold pizza at 3AM', imposter: 'Regret kebab at 3AM', adultOnly: true },
  ]},
  { id: 'movies', name: 'Movies', emoji: '🎬', prompts: [
    { hint: 'Animated Film', main: 'Shrek', imposter: 'Toy Story' },
    { hint: 'Blockbuster Thriller', main: 'Jaws', imposter: 'Jurassic Park' },
    { hint: 'Romantic Drama', main: 'Titanic', imposter: 'The Notebook' },
    { hint: 'Mind-bending Sci-Fi', main: 'Inception', imposter: 'Interstellar' },
    { hint: 'Superhero Film', main: 'Iron Man', imposter: 'Batman Begins' },
    { hint: 'Fantasy Epic', main: 'The Lord of the Rings', imposter: 'Harry Potter' },
    { hint: 'Action Franchise', main: 'Mission Impossible', imposter: 'Jason Bourne' },
    { hint: 'Comedy Classic', main: 'Mean Girls', imposter: 'Clueless' },
  ]},
  { id: 'music', name: 'Music', emoji: '🎧', prompts: [
    { hint: 'Rock Band', main: 'Nirvana', imposter: 'Foo Fighters' },
    { hint: 'Pop Punk Band', main: 'Green Day', imposter: 'Blink-182' },
    { hint: 'Nu Metal Band', main: 'Slipknot', imposter: 'Korn' },
    { hint: 'Metal Band', main: 'Metallica', imposter: 'Megadeth' },
    { hint: 'Pop Star', main: 'Dua Lipa', imposter: 'Rita Ora' },
    { hint: 'Rap Artist', main: 'Drake', imposter: 'Kendrick Lamar' },
    { hint: 'EDM Artist', main: 'Calvin Harris', imposter: 'David Guetta' },
    { hint: 'Indie Band', main: 'Arctic Monkeys', imposter: 'The 1975' },
  ]},
  { id: 'places', name: 'Places', emoji: '🗺️', prompts: [
    { hint: 'UK City', main: 'London', imposter: 'Manchester' },
    { hint: 'Entertainment Venue', main: 'Cinema', imposter: 'Theatre' },
    { hint: 'Water Day Out', main: 'Beach', imposter: 'Swimming Pool' },
    { hint: 'Animal Attraction', main: 'Zoo', imposter: 'Aquarium' },
    { hint: 'European Capital', main: 'Paris', imposter: 'Rome' },
    { hint: 'Holiday Type', main: 'Camping', imposter: 'Glamping' },
    { hint: 'Transport Hub', main: 'Airport', imposter: 'Train Station' },
    { hint: 'Nature Spot', main: 'Forest', imposter: 'Jungle' },
  ]},
  { id: 'games', name: 'Video Games', emoji: '🕹️', prompts: [
    { hint: 'Sandbox Game', main: 'Minecraft', imposter: 'Roblox' },
    { hint: 'Mascot Platformer', main: 'Mario', imposter: 'Sonic' },
    { hint: 'Battle Royale', main: 'Fortnite', imposter: 'Apex Legends' },
    { hint: 'Shooter Series', main: 'Call of Duty', imposter: 'Battlefield' },
    { hint: 'Soulslike', main: 'Elden Ring', imposter: 'Dark Souls' },
    { hint: 'Party Game', main: 'Mario Party', imposter: 'Fall Guys' },
    { hint: 'Racing Game', main: 'Mario Kart', imposter: 'Crash Team Racing' },
    { hint: 'Horror Game', main: 'Resident Evil', imposter: 'Silent Hill' },
  ]},
  { id: 'animals', name: 'Animals', emoji: '🦁', prompts: [
    { hint: 'Big Cat', main: 'Cheetah', imposter: 'Leopard' },
    { hint: 'Marine Mammal', main: 'Narwhal', imposter: 'Beluga Whale' },
    { hint: 'Odd Little Creature', main: 'Capybara', imposter: 'Patagonian Mara' },
    { hint: 'Large Lizard', main: 'Komodo Dragon', imposter: 'Monitor Lizard' },
    { hint: 'Bird of Prey', main: 'Eagle', imposter: 'Hawk' },
    { hint: 'Farm Animal', main: 'Goat', imposter: 'Sheep' },
    { hint: 'Ocean Predator', main: 'Great White Shark', imposter: 'Tiger Shark' },
    { hint: 'Pet Rodent', main: 'Hamster', imposter: 'Guinea Pig' },
  ]},
  { id: 'weird', name: 'Weird & Wacky', emoji: '🤪', prompts: [
    { hint: 'Cryptid', main: 'Mothman', imposter: 'Thunderbird' },
    { hint: 'Weird Weather', main: 'Ball Lightning', imposter: "St. Elmo's Fire" },
    { hint: 'Phobia', main: 'Trypophobia', imposter: 'Misophonia' },
    { hint: 'Urban Legend Creature', main: 'Jersey Devil', imposter: 'Chupacabra' },
    { hint: 'Conspiracy Vibe', main: 'Area 51', imposter: 'Bermuda Triangle' },
    { hint: 'Creepy Doll', main: 'Annabelle', imposter: 'Chucky' },
    { hint: 'Odd Record', main: 'Most Spoons Balanced', imposter: 'Most Marshmallows Caught' },
    { hint: 'Mythical Object', main: 'Philosopher’s Stone', imposter: 'Holy Grail' },
  ]},
  { id: 'jobs', name: 'Jobs', emoji: '💼', prompts: [
    { hint: 'Emergency Role', main: 'Firefighter', imposter: 'Paramedic' },
    { hint: 'Creative Role', main: 'Graphic Designer', imposter: 'Illustrator' },
    { hint: 'Tech Role', main: 'Programmer', imposter: 'Data Analyst' },
    { hint: 'Public Role', main: 'Teacher', imposter: 'Lecturer' },
    { hint: 'Law Role', main: 'Solicitor', imposter: 'Barrister' },
    { hint: 'Hospitality', main: 'Chef', imposter: 'Line Cook' },
    { hint: 'Media Role', main: 'Journalist', imposter: 'Copywriter' },
    { hint: 'Construction Role', main: 'Architect', imposter: 'Civil Engineer' },
  ]},
  { id: 'celebrities', name: 'Celebrities', emoji: '🌟', prompts: [
    { hint: 'Pop Icon', main: 'Taylor Swift', imposter: 'Lady Gaga' },
    { hint: 'Action Star', main: 'Arnold Schwarzenegger', imposter: 'Sylvester Stallone' },
    { hint: 'TV Chef', main: 'Gordon Ramsay', imposter: 'Jamie Oliver' },
    { hint: 'Wrestling Legend', main: 'The Rock', imposter: 'John Cena' },
    { hint: 'Comedian', main: 'Kevin Hart', imposter: 'Chris Rock' },
    { hint: 'Footballer', main: 'Lionel Messi', imposter: 'Cristiano Ronaldo' },
    { hint: 'Actor', main: 'Ryan Reynolds', imposter: 'Chris Pratt' },
    { hint: 'YouTube Star', main: 'MrBeast', imposter: 'KSI' },
    { hint: 'Messy Reality TV (18+)', main: 'Love triangle scandal', imposter: 'Cheating scandal', adultOnly: true },
  ]},
  { id: 'tech', name: 'Tech & Internet', emoji: '💻', prompts: [
    { hint: 'Operating System', main: 'Windows', imposter: 'Linux' },
    { hint: 'Messaging App', main: 'WhatsApp', imposter: 'Telegram' },
    { hint: 'Streaming Platform', main: 'Netflix', imposter: 'Disney+' },
    { hint: 'Browser', main: 'Chrome', imposter: 'Firefox' },
    { hint: 'AI Tool', main: 'ChatGPT', imposter: 'Claude' },
    { hint: 'Console Brand', main: 'PlayStation', imposter: 'Xbox' },
    { hint: 'Cloud Storage', main: 'Google Drive', imposter: 'Dropbox' },
    { hint: 'Short Video App', main: 'TikTok', imposter: 'Instagram Reels' },
  ]},
  { id: 'tv', name: 'TV & Series', emoji: '📺', prompts: [
    { hint: 'Fantasy Show', main: 'Game of Thrones', imposter: 'The Witcher' },
    { hint: 'Sitcom', main: 'Friends', imposter: 'How I Met Your Mother' },
    { hint: 'Crime Drama', main: 'Breaking Bad', imposter: 'Better Call Saul' },
    { hint: 'Sci-Fi Show', main: 'Stranger Things', imposter: 'Dark' },
    { hint: 'Reality Show', main: 'Love Island', imposter: 'Too Hot to Handle' },
    { hint: 'Mystery Series', main: 'Sherlock', imposter: 'Lupin' },
    { hint: 'Animated Series', main: 'The Simpsons', imposter: 'Family Guy' },
    { hint: 'Workplace Comedy', main: 'The Office', imposter: 'Parks and Recreation' },
  ]},
  { id: 'hobbies', name: 'Hobbies', emoji: '🎨', prompts: [
    { hint: 'Creative Hobby', main: 'Painting', imposter: 'Sketching' },
    { hint: 'Active Hobby', main: 'Cycling', imposter: 'Running' },
    { hint: 'Music Hobby', main: 'Playing Guitar', imposter: 'Playing Bass' },
    { hint: 'Collecting Hobby', main: 'Collecting Sneakers', imposter: 'Collecting Vinyl' },
    { hint: 'Mind Hobby', main: 'Chess', imposter: 'Sudoku' },
    { hint: 'DIY Hobby', main: 'Woodworking', imposter: '3D Printing' },
    { hint: 'Outdoor Hobby', main: 'Fishing', imposter: 'Kayaking' },
    { hint: 'Food Hobby', main: 'Baking', imposter: 'Cooking' },
  ]},
  { id: 'brands', name: 'Brands', emoji: '🛍️', prompts: [
    { hint: 'Sportswear Brand', main: 'Nike', imposter: 'Adidas' },
    { hint: 'Fast Food Brand', main: 'McDonald’s', imposter: 'Burger King' },
    { hint: 'Coffee Chain', main: 'Starbucks', imposter: 'Costa Coffee' },
    { hint: 'Phone Brand', main: 'Apple', imposter: 'Samsung' },
    { hint: 'Luxury Brand', main: 'Gucci', imposter: 'Prada' },
    { hint: 'Car Brand', main: 'BMW', imposter: 'Mercedes' },
    { hint: 'E-commerce Brand', main: 'Amazon', imposter: 'eBay' },
    { hint: 'Soda Brand', main: 'Coca-Cola', imposter: 'Pepsi' },
  ]},
  { id: 'science', name: 'Science', emoji: '🧪', prompts: [
    { hint: 'Space Object', main: 'Planet', imposter: 'Moon' },
    { hint: 'Tiny Particle', main: 'Atom', imposter: 'Molecule' },
    { hint: 'Energy Type', main: 'Solar Power', imposter: 'Wind Power' },
    { hint: 'Natural Science', main: 'Biology', imposter: 'Chemistry' },
    { hint: 'Body System', main: 'Nervous System', imposter: 'Circulatory System' },
    { hint: 'Weather Event', main: 'Tornado', imposter: 'Hurricane' },
    { hint: 'Lab Tool', main: 'Microscope', imposter: 'Telescope' },
    { hint: 'Dinosaur', main: 'T-Rex', imposter: 'Spinosaurus' },
  ]},
  { id: 'party', name: 'Party Stuff', emoji: '🎉', prompts: [
    { hint: 'Party Game', main: 'Charades', imposter: 'Pictionary' },
    { hint: 'Board Game', main: 'Monopoly', imposter: 'The Game of Life' },
    { hint: 'Card Game', main: 'UNO', imposter: 'Exploding Kittens' },
    { hint: 'Celebration Item', main: 'Confetti', imposter: 'Streamers' },
    { hint: 'Birthday Food', main: 'Cupcakes', imposter: 'Cookies' },
    { hint: 'Music Moment', main: 'Karaoke', imposter: 'Lip Sync Battle' },
    { hint: 'Drinking Game', main: 'Beer Pong', imposter: 'Flip Cup' },
    { hint: 'Celebration Type', main: 'House Party', imposter: 'Garden Party' },
  ]},
];

const BULK_PROMPTS_PER_CATEGORY = 50;

const CATEGORY_EXPANSION_CONFIG = {
  sports: {
    hintBase: 'Sports Showdown',
    regularMain: ['Basketball', 'Football', 'Tennis', 'Boxing', 'Cricket', 'Volleyball', 'Rugby', 'Ice Hockey', 'Formula 1', 'Surfing'],
    regularImposter: ['Baseball', 'American Football', 'Badminton', 'MMA', 'Baseball', 'Handball', 'AFL', 'Lacrosse', 'Rally Racing', 'Skateboarding'],
    adultMain: ['Locker room brag', 'After-party kiss', 'Victory lap flirt', 'VIP table flex', 'Cheeky post-match selfie', 'Shirt-off celebration'],
    adultImposter: ['Walk-of-shame ride home', 'Awkward rebound date', 'Messy ex text at midnight', 'Jealous sideline drama', 'Cringe drunk voicemail', 'Taxi queue argument'],
  },
  food: {
    hintBase: 'Food Face-Off',
    regularMain: ['Pizza', 'Burger', 'Tacos', 'Ramen', 'Sushi', 'Waffles', 'Pancakes', 'Curry', 'Lasagna', 'Dumplings'],
    regularImposter: ['Calzone', 'Hot Dog', 'Burrito', 'Udon', 'Poke Bowl', 'French Toast', 'Crepes', 'Stew', 'Baked Ziti', 'Gyoza'],
    adultMain: ['Late-night pizza hookup', 'Brunch with your situationship', 'Tequila taco run', 'Kitchen dance date', 'Flirty cooking class', 'Midnight fridge raid together'],
    adultImposter: ['Regret kebab at 3AM', 'Silent breakfast after chaos', 'Jealous dinner with ex', 'Disaster first-date picnic', 'Drunk microwave gourmet', 'Awkward room-service order'],
  },
  movies: {
    hintBase: 'Movie Clash',
    regularMain: ['Inception', 'Interstellar', 'Titanic', 'The Matrix', 'Joker', 'Shrek', 'Gladiator', 'Avatar', 'The Dark Knight', 'Jaws'],
    regularImposter: ['Memento', 'Gravity', 'The Notebook', 'Blade Runner', 'The Batman', 'Toy Story', 'Troy', 'Dune', 'Batman Begins', 'Jurassic Park'],
    adultMain: ['Steamy thriller scene', 'Forbidden romance arc', 'Messy reunion montage', 'After-dark cinema date', 'Seductive villain speech', 'Risky hotel plot twist'],
    adultImposter: ['Cringe rom-com kiss', 'Friend-zoned ending', 'Jealous partner subplot', 'Walk-of-shame sequel', 'Chaotic bachelor-party movie', 'Awkward morning-after credits'],
  },
  music: {
    hintBase: 'Music Battle',
    regularMain: ['Nirvana', 'Metallica', 'Drake', 'Dua Lipa', 'Arctic Monkeys', 'Taylor Swift', 'Eminem', 'Calvin Harris', 'The Weeknd', 'Adele'],
    regularImposter: ['Foo Fighters', 'Megadeth', 'Kendrick Lamar', 'Rita Ora', 'The 1975', 'Olivia Rodrigo', '50 Cent', 'David Guetta', 'Bruno Mars', 'Sam Smith'],
    adultMain: ['Sultry after-hours playlist', 'Bedroom R&B vibe', 'Flirty club anthem', 'Late-night slow dance', 'Kiss-at-midnight chorus', 'Messy karaoke confession'],
    adultImposter: ['Cringe ex-dedication song', 'Jealous DJ meltdown', 'Breakup anthem spam', 'Awkward party request', 'Drunk voice-note freestyle', 'Walk-home heartbreak playlist'],
  },
  places: {
    hintBase: 'Place Swap',
    regularMain: ['London', 'Paris', 'Rome', 'Tokyo', 'Airport', 'Cinema', 'Beach', 'Forest', 'Museum', 'Stadium'],
    regularImposter: ['Manchester', 'Berlin', 'Madrid', 'Seoul', 'Train Station', 'Theatre', 'Waterpark', 'Jungle', 'Gallery', 'Arena'],
    adultMain: ['Rooftop date spot', 'Secret cocktail bar', 'Romantic hotel balcony', 'After-party apartment', 'Midnight city stroll', 'Beach kiss at sunset'],
    adultImposter: ['Awkward ex meetup spot', 'Walk-of-shame bus stop', 'Cringe office party venue', 'Taxi queue drama zone', 'Messy festival campsite', 'One-night stand district'],
  },
  games: {
    hintBase: 'Game Night Duel',
    regularMain: ['Minecraft', 'Fortnite', 'Mario Kart', 'Elden Ring', 'Call of Duty', 'The Sims', 'FIFA', 'Valorant', 'Zelda', 'Animal Crossing'],
    regularImposter: ['Roblox', 'Apex Legends', 'Crash Team Racing', 'Dark Souls', 'Battlefield', 'SimCity', 'eFootball', 'Counter-Strike', 'Genshin Impact', 'Stardew Valley'],
    adultMain: ['Couples co-op all-nighter', 'Flirty voice chat lobby', 'Winner picks the dare', 'Bedroom Mario Kart grudge', 'Chaotic drinking game stream', 'After-dark party queue'],
    adultImposter: ['Rage quit plus jealousy', 'Muted mic drama', 'Awkward cosplay flirt', 'Ex joins the lobby', 'Messy Discord confession', 'Toxic flirt-bait gameplay'],
  },
  animals: {
    hintBase: 'Animal Showdown',
    regularMain: ['Lion', 'Tiger', 'Cheetah', 'Eagle', 'Shark', 'Wolf', 'Dolphin', 'Panda', 'Fox', 'Otter'],
    regularImposter: ['Leopard', 'Jaguar', 'Hyena', 'Hawk', 'Orca', 'Coyote', 'Seal', 'Koala', 'Jackal', 'Beaver'],
    adultMain: ['Predator at the club', 'Peacocking at the bar', 'Wild party animal mode', 'Pack leader flirting', 'Alpha energy date', 'Late-night jungle vibe'],
    adultImposter: ['Clingy puppy behavior', 'Messy drunk monkey act', 'Snake-in-the-DMs move', 'Awkward peacock flex', 'Creepy owl stare', 'Hangover sloth morning'],
  },
  weird: {
    hintBase: 'Weird World Matchup',
    regularMain: ['Mothman', 'Area 51', 'Bermuda Triangle', 'Haunted Doll', 'Loch Ness', 'Bigfoot', 'UFO Sighting', 'Time Loop', 'Alien Abduction', 'Shadow Figure'],
    regularImposter: ['Jersey Devil', 'Roswell', 'Black Hole Zone', 'Cursed Puppet', 'Kraken', 'Yeti', 'Ghost Light', 'Parallel Universe', 'Crop Circle Hoax', 'Sleep Paralysis'],
    adultMain: ['Paranormal hookup story', 'Haunted hotel rendezvous', 'Alien speed dating', 'Midnight ritual flirting', 'Witchy afterparty', 'Seductive vampire rumor'],
    adultImposter: ['Cursed ex return', 'Ouija board disaster date', 'Ghosted after one-night stand', 'Messy love potion fail', 'Awkward seance confession', 'Demon-in-the-DMs moment'],
  },
  jobs: {
    hintBase: 'Career Throwdown',
    regularMain: ['Teacher', 'Programmer', 'Firefighter', 'Doctor', 'Lawyer', 'Chef', 'Architect', 'Journalist', 'Pilot', 'Photographer'],
    regularImposter: ['Lecturer', 'Data Analyst', 'Paramedic', 'Nurse', 'Barrister', 'Line Cook', 'Civil Engineer', 'Copywriter', 'Flight Attendant', 'Videographer'],
    adultMain: ['Office romance rumor', 'After-hours networking flirt', 'Boss-level charm', 'Conference afterparty chaos', 'Work-wife storyline', 'Secret crush at reception'],
    adultImposter: ['HR nightmare text', 'Awkward office hookup', 'Jealous coworker meltdown', 'Breakroom gossip spiral', 'LinkedIn thirst trap', 'Drunk Christmas party scandal'],
  },
  celebrities: {
    hintBase: 'Celebrity Face-Off',
    regularMain: ['Taylor Swift', 'The Rock', 'Ryan Reynolds', 'Lionel Messi', 'Gordon Ramsay', 'Zendaya', 'Rihanna', 'Keanu Reeves', 'Beyonce', 'Tom Holland'],
    regularImposter: ['Lady Gaga', 'John Cena', 'Chris Pratt', 'Cristiano Ronaldo', 'Jamie Oliver', 'Sydney Sweeney', 'Dua Lipa', 'Robert Pattinson', 'Ariana Grande', 'Timothee Chalamet'],
    adultMain: ['Scandalous red carpet rumor', 'Steamy tabloid headline', 'Secret celebrity date', 'VIP afterparty hookup', 'Messy breakup interview', 'Flirty paparazzi moment'],
    adultImposter: ['PR cleanup apology', 'Cheating scandal spin', 'Awkward reunion photo-op', 'Leaked DMs drama', 'Late-night gossip meltdown', 'Cringe podcast confession'],
  },
  tech: {
    hintBase: 'Tech Takedown',
    regularMain: ['Windows', 'iPhone', 'PlayStation', 'ChatGPT', 'Netflix', 'Chrome', 'Discord', 'Spotify', 'TikTok', 'Google Drive'],
    regularImposter: ['Linux', 'Android', 'Xbox', 'Claude', 'Disney+', 'Firefox', 'Slack', 'Apple Music', 'Instagram Reels', 'Dropbox'],
    adultMain: ['Late-night risky DM', 'Flirty voice-note app', 'Private vault app drama', 'After-dark livestream vibe', 'Secret burner account', 'Midnight text marathon'],
    adultImposter: ['Accidental message to ex', 'Screenshot betrayal arc', 'Drunk typo disaster', 'Leaked group chat scandal', 'Embarrassing search history', 'Awkward dating app bio'],
  },
  tv: {
    hintBase: 'Series Smackdown',
    regularMain: ['Game of Thrones', 'Friends', 'Breaking Bad', 'Stranger Things', 'The Office', 'Sherlock', 'The Simpsons', 'Black Mirror', 'The Boys', 'Loki'],
    regularImposter: ['The Witcher', 'How I Met Your Mother', 'Better Call Saul', 'Dark', 'Parks and Recreation', 'Lupin', 'Family Guy', 'Love Death + Robots', 'Invincible', 'Moon Knight'],
    adultMain: ['Messy dating reality show', 'Steamy drama binge', 'After-dark true crime obsession', 'Flirty reunion episode', 'Bedroom binge marathon', 'Spicy confession cam'],
    adultImposter: ['Cringe reality TV meltdown', 'Cheating island twist', 'Awkward reunion special', 'Jealous watch-party fight', 'One-night stand cliffhanger', 'Toxic fan-ship war'],
  },
  hobbies: {
    hintBase: 'Hobby Showdown',
    regularMain: ['Painting', 'Cycling', 'Chess', 'Baking', 'Fishing', 'Running', 'Photography', 'Gardening', 'Woodworking', 'Guitar'],
    regularImposter: ['Sketching', 'Mountain Biking', 'Sudoku', 'Cooking', 'Kayaking', 'Hiking', 'Videography', 'Houseplants', '3D Printing', 'Bass Guitar'],
    adultMain: ['Wine-and-paint flirt night', 'Couples dance class', 'Steamy pottery session', 'After-hours karaoke hobby', 'Late-night cocktail crafting', 'Flirty gym challenge'],
    adultImposter: ['Awkward partner-swapping lesson', 'Messy date hobby fail', 'Jealous dance-floor drama', 'Cringe love poem workshop', 'Drunk DIY disaster', 'Ex crashes the class'],
  },
  brands: {
    hintBase: 'Brand Battle',
    regularMain: ['Nike', 'Apple', 'Coca-Cola', 'BMW', 'Amazon', 'Starbucks', 'Adidas', 'Samsung', 'Pepsi', 'IKEA'],
    regularImposter: ['Adidas', 'Samsung', 'Pepsi', 'Mercedes', 'eBay', 'Costa Coffee', 'Puma', 'Google Pixel', 'Dr Pepper', 'Wayfair'],
    adultMain: ['Luxury date flex brand', 'VIP bottle-service label', 'Afterparty fashion pick', 'Seductive perfume campaign', 'Club-night sneaker drop', 'Hotel-bar watch flex'],
    adultImposter: ['Fake designer panic', 'Ex bought knockoff gift', 'Cringe influencer ad', 'Messy sponsor scandal', 'Awkward sugar-daddy branding', 'Regret impulse luxury spend'],
  },
  science: {
    hintBase: 'Science Split',
    regularMain: ['Planet', 'Atom', 'Volcano', 'Tornado', 'DNA', 'Microscope', 'Neuron', 'Gravity', 'Galaxy', 'Comet'],
    regularImposter: ['Moon', 'Molecule', 'Earthquake', 'Hurricane', 'RNA', 'Telescope', 'Synapse', 'Magnetism', 'Nebula', 'Asteroid'],
    adultMain: ['Chemistry between two people', 'Magnetic attraction at a party', 'Explosive first-date reaction', 'Late-night lab partner flirting', 'Bedroom physics joke', 'Wild dopamine rush'],
    adultImposter: ['No chemistry disaster date', 'Cold reaction in the DMs', 'Awkward rebound experiment', 'Jealousy chain reaction', 'Messy emotional meltdown', 'Hangover brain fog hypothesis'],
  },
  party: {
    hintBase: 'Party Clash',
    regularMain: ['Charades', 'UNO', 'Beer Pong', 'Karaoke', 'House Party', 'Dance Battle', 'Trivia Night', 'Costume Party', 'Board Game Night', 'Garden Party'],
    regularImposter: ['Pictionary', 'Exploding Kittens', 'Flip Cup', 'Lip Sync Battle', 'Pool Party', 'Rap Battle', 'Pub Quiz', 'Theme Party', 'Poker Night', 'Rooftop Party'],
    adultMain: ['Kiss-or-dare challenge', 'After-hours dance floor grind', 'Chaotic cocktail flirting', 'Midnight party hookup rumor', 'VIP room tension', 'Drunk confession circle'],
    adultImposter: ['Jealous ex plus-one drama', 'Awkward truth-or-dare fail', 'Messy drunken argument', 'Walk-of-shame sunrise', 'Cringe kiss rejection', 'Hangover apology tour'],
  },
};

function toPromptEntry(hintBase, main, imposter, index, adultOnly = false) {
  const tone = adultOnly ? '18+' : 'Classic';
  return {
    hint: `${hintBase} ${index + 1} (${tone})`,
    main,
    imposter,
    ...(adultOnly ? { adultOnly: true } : {}),
  };
}

function buildPromptBatch(config, adultOnly = false, count = BULK_PROMPTS_PER_CATEGORY) {
  const mainPool = adultOnly ? config.adultMain : config.regularMain;
  const imposterPool = adultOnly ? config.adultImposter : config.regularImposter;
  return Array.from({ length: count }, (_, index) => {
    const main = mainPool[index % mainPool.length];
    const imposter = imposterPool[(index + 1) % imposterPool.length];
    return toPromptEntry(config.hintBase, main, imposter, index, adultOnly);
  });
}

for (const category of DEFAULT_CATEGORIES) {
  const expansionConfig = CATEGORY_EXPANSION_CONFIG[category.id];
  if (!expansionConfig) continue;
  category.prompts.push(
    ...buildPromptBatch(expansionConfig, false),
    ...buildPromptBatch(expansionConfig, true)
  );
}

export const OPINION_ROUNDS = [
  { hint: 'Controversial Take', main: 'Pineapple absolutely belongs on pizza.', imposter: 'Pineapple absolutely does not belong on pizza.' },
  { hint: 'Hot Take', main: 'Cinema is better than watching films at home.', imposter: 'Watching films at home is better than the cinema.' },
  { hint: 'Debate Night', main: 'Summer is the best season.', imposter: 'Winter is the best season.' },
  { hint: 'Spicy Opinion', main: 'Tea is better than coffee.', imposter: 'Coffee is better than tea.' },
  { hint: 'Questionable Belief', main: 'Dogs are better pets than cats.', imposter: 'Cats are better pets than dogs.' },
  { hint: 'Argument Starter', main: 'Physical buttons are better than touchscreens.', imposter: 'Touchscreens are better than physical buttons.' },
  { hint: 'Gaming Debate', main: 'Single-player games are better than multiplayer.', imposter: 'Multiplayer games are better than single-player.' },
  { hint: 'Music Debate', main: 'Lyrics matter more than melody.', imposter: 'Melody matters more than lyrics.' },
  { hint: 'Travel Debate', main: 'City breaks beat beach holidays.', imposter: 'Beach holidays beat city breaks.' },
  { hint: 'Food Debate', main: 'Breakfast is the best meal of the day.', imposter: 'Dinner is the best meal of the day.' },
  { hint: 'Phone Debate', main: 'Small phones are better than big phones.', imposter: 'Big phones are better than small phones.' },
  { hint: 'Social Debate', main: 'Group holidays are better than solo travel.', imposter: 'Solo travel is better than group holidays.' },
  { hint: 'Work Debate', main: 'Working from home is better than office work.', imposter: 'Office work is better than working from home.' },
  { hint: 'Fashion Debate', main: 'Comfort beats style every time.', imposter: 'Style beats comfort every time.' },
  { hint: 'TV Debate', main: 'Binge-watching ruins good shows.', imposter: 'Binge-watching improves good shows.' },
  { hint: 'Life Debate', main: 'Being early is respectful.', imposter: 'Being exactly on time is enough.' },
  { hint: 'After-dark Debate (18+)', main: 'A chaotic first date is more fun than a perfect one.', imposter: 'A perfect first date is better than chaos.', adultOnly: true },
  { hint: 'Messy Texting (18+)', main: 'Double-texting is totally fine.', imposter: 'Double-texting is desperate.', adultOnly: true },
  { hint: 'Party Chaos (18+)', main: 'Drunk karaoke is always a good idea.', imposter: 'Drunk karaoke is always a bad idea.', adultOnly: true },
  { hint: 'Relationship Debate (18+)', main: 'Sharing phone passwords is healthy.', imposter: 'Sharing phone passwords is unhealthy.', adultOnly: true },
  { hint: 'Non-PC Hot Take (18+)', main: 'Brutal honesty is kinder than polite lying.', imposter: 'Polite lying is kinder than brutal honesty.', adultOnly: true },
  { hint: 'Workplace Chaos (18+)', main: 'Hookups at office parties are never worth it.', imposter: 'Hookups at office parties are worth the chaos.', adultOnly: true },
];

const OPINION_EXPANSION = {
  regularHints: ['Opinion Clash', 'Debate Duel', 'Spicy Take', 'Hot Mic Debate', 'Crowd Argument'],
  regularMain: [
    'Road trips are better than city breaks.',
    'Live concerts are better than festivals.',
    'Books are better than podcasts.',
    'Voice notes are better than text messages.',
    'Night owls are more productive than early birds.',
    'Plan-ahead people are more fun than spontaneous people.',
    'Board games beat video games for parties.',
    'Cooking at home beats takeaway every time.',
    'Window seats are better than aisle seats.',
    'Short hair is easier to style than long hair',
  ],
  regularImposter: [
    'City breaks are better than road trips.',
    'Festivals are better than live concerts.',
    'Podcasts are better than books.',
    'Text messages are better than voice notes.',
    'Early birds are more productive than night owls.',
    'Spontaneous people are more fun than plan-ahead people.',
    'Video games beat board games for parties.',
    'Takeaway beats cooking at home every time.',
    'Aisle seats are better than window seats.',
    'Long hair is easier to style than short hair.',
  ],
  adultHints: ['After Dark Debate (18+)', 'Messy Opinion (18+)', 'Risky Take (18+)', 'Non-PC Debate (18+)', 'Late Night Argument (18+)'],
  adultMain: [
    'First dates should include a risky dare.',
    'Flirting by voice note is hotter than texting.',
    'Holiday flings are better than serious relationships.',
    'Kissing in public is more romantic than private dates.',
    'Jealousy is sometimes healthy in relationships.',
    'Hookups with coworkers are never worth it.',
    'Sleeping at your date’s place on night one is fine.',
    'Posting thirst traps while single is harmless.',
    'Honest red flags should be shared on date one.',
    'Drunk confessions are the purest kind of honesty.',
  ],
  adultImposter: [
    'First dates should stay safe and low key.',
    'Texting is hotter than voice-note flirting.',
    'Serious relationships are better than holiday flings.',
    'Private dates are more romantic than public kissing.',
    'Jealousy is never healthy in relationships.',
    'Hookups with coworkers can be worth it.',
    'Going home separately on night one is better.',
    'Posting thirst traps while single is messy.',
    'Red flags should not be shared on date one.',
    'Drunk confessions are just chaotic oversharing.',
  ],
};

function buildOpinionBatch(adultOnly = false, count = 50) {
  const hints = adultOnly ? OPINION_EXPANSION.adultHints : OPINION_EXPANSION.regularHints;
  const mains = adultOnly ? OPINION_EXPANSION.adultMain : OPINION_EXPANSION.regularMain;
  const imposters = adultOnly ? OPINION_EXPANSION.adultImposter : OPINION_EXPANSION.regularImposter;
  return Array.from({ length: count }, (_, index) => ({
    hint: `${hints[index % hints.length]} ${index + 1}`,
    main: mains[index % mains.length],
    imposter: imposters[index % imposters.length],
    ...(adultOnly ? { adultOnly: true } : {}),
  }));
}

OPINION_ROUNDS.push(
  ...buildOpinionBatch(false, 50),
  ...buildOpinionBatch(true, 50)
);

export const MEDIA_ROUNDS = {
  picture: [
    { hint: 'Picture Clue', main: 'retro-arcade-cabinet', imposter: 'pinball-machine', previewLabel: 'Picture round placeholder' },
    { hint: 'Picture Clue', main: 'hedgehog-in-sunglasses', imposter: 'guinea-pig-in-sunglasses', previewLabel: 'Picture round placeholder' },
    { hint: 'Picture Clue', main: 'neon-skatepark', imposter: 'roller-disco-rink', previewLabel: 'Picture round placeholder' },
    { hint: 'Picture Clue', main: 'pirate-ship-deck', imposter: 'viking-longboat', previewLabel: 'Picture round placeholder' },
    { hint: 'Picture Clue', main: 'zombie-prom-night', imposter: 'vampire-ballroom', previewLabel: 'Picture round placeholder' },
    { hint: 'Picture Clue', main: 'robot-chef-kitchen', imposter: 'android-barista-cafe', previewLabel: 'Picture round placeholder' },
  ],
  sound: [
    { hint: 'Sound Clue', main: 'arcade-coin-drop', imposter: 'slot-machine-jingle', previewLabel: 'Audio round placeholder' },
    { hint: 'Sound Clue', main: 'lion-roar', imposter: 'tiger-growl', previewLabel: 'Audio round placeholder' },
    { hint: 'Sound Clue', main: 'thunder-crack', imposter: 'firework-bang', previewLabel: 'Audio round placeholder' },
    { hint: 'Sound Clue', main: 'crowd-chanting', imposter: 'stadium-booing', previewLabel: 'Audio round placeholder' },
  ],
  video: [
    { hint: 'Video Clip', main: 'crowd-cheering-goal', imposter: 'crowd-cheering-knockout', previewLabel: 'Video round placeholder' },
    { hint: 'Video Clip', main: 'wave-crashing-beach', imposter: 'stormy-harbour', previewLabel: 'Video round placeholder' },
    { hint: 'Video Clip', main: 'city-time-lapse-night', imposter: 'city-time-lapse-rain', previewLabel: 'Video round placeholder' },
    { hint: 'Video Clip', main: 'dog-catching-frisbee', imposter: 'dog-chasing-bubble', previewLabel: 'Video round placeholder' },
  ],
};

const MEDIA_EXPANSION = {
  picture: {
    hint: 'Picture Clue',
    regularMain: ['street-food-market', 'retro-neon-diner', 'volcano-lava-flow', 'skater-halfpipe-trick', 'rainy-city-crosswalk'],
    regularImposter: ['night-market-lanterns', 'classic-50s-diner', 'geysir-eruption', 'bmx-dirt-jump', 'foggy-city-crosswalk'],
    adultMain: ['afterparty-rooftop-neon', 'hotel-room-service-tray', 'romantic-city-sunset', 'champagne-bucket-vip', 'slow-dance-club-corner'],
    adultImposter: ['awkward-afterparty-lobby', 'messy-takeaway-bedside', 'stormy-city-night', 'spilled-drinks-vip', 'jealous-club-dancefloor'],
  },
  sound: {
    hint: 'Sound Clue',
    regularMain: ['crowd-goal-cheer', 'engine-rev-quick', 'rain-on-window', 'crow-caw-echo', 'train-brake-screech'],
    regularImposter: ['crowd-knockout-cheer', 'motorbike-rev', 'hail-on-window', 'raven-call-echo', 'tram-brake-screech'],
    adultMain: ['club-bass-drop', 'glasses-clink-toast', 'heels-on-tile-floor', 'door-lock-click', 'kiss-pop-sfx'],
    adultImposter: ['bar-last-orders-bell', 'bottle-smash-far', 'awkward-chair-scrape', 'door-chain-rattle', 'nervous-throat-clear'],
  },
  video: {
    hint: 'Video Clip',
    regularMain: ['skatepark-trick-landing', 'concert-crowd-wave', 'storm-over-sea', 'dog-splashing-lake', 'arcade-speedrun-closeup'],
    regularImposter: ['skatepark-trick-fall', 'concert-crowd-mosh', 'calm-sea-sunrise', 'dog-running-meadow', 'arcade-fightinggame-closeup'],
    adultMain: ['rooftop-party-dancing', 'neon-city-date-night', 'hotel-lobby-checkin', 'slow-motion-champagne-pop', 'vip-booth-laughing'],
    adultImposter: ['afterparty-walk-of-shame', 'neon-city-alone-night', 'hotel-lobby-argument', 'spill-drink-disaster', 'vip-booth-awkward-silence'],
  },
};

function buildMediaBatch(type, adultOnly = false, count = 50) {
  const config = MEDIA_EXPANSION[type];
  const mains = adultOnly ? config.adultMain : config.regularMain;
  const imposters = adultOnly ? config.adultImposter : config.regularImposter;
  return Array.from({ length: count }, (_, index) => ({
    hint: `${config.hint} ${index + 1}`,
    main: mains[index % mains.length],
    imposter: imposters[(index + 1) % imposters.length],
    previewLabel: `${type[0].toUpperCase()}${type.slice(1)} round placeholder`,
    ...(adultOnly ? { adultOnly: true } : {}),
  }));
}

MEDIA_ROUNDS.picture.push(...buildMediaBatch('picture', false, 50), ...buildMediaBatch('picture', true, 50));
MEDIA_ROUNDS.sound.push(...buildMediaBatch('sound', false, 50), ...buildMediaBatch('sound', true, 50));
MEDIA_ROUNDS.video.push(...buildMediaBatch('video', false, 50), ...buildMediaBatch('video', true, 50));

export const GRILL_EM_ROUNDS = [
  {
    hint: "AI Mystery Topic",
    main: 'Retro arcade game cabinet',
    imposter: 'Retro arcade game cabinet',
    aiPrompt: 'You are describing a retro arcade game cabinet. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Cheese pizza',
    imposter: 'Cheese pizza',
    aiPrompt: 'You are describing cheese pizza. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'House cat',
    imposter: 'House cat',
    aiPrompt: 'You are describing a house cat. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Electric guitar',
    imposter: 'Electric guitar',
    aiPrompt: 'You are describing an electric guitar. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Theme park rollercoaster',
    imposter: 'Theme park rollercoaster',
    aiPrompt: 'You are describing a theme park rollercoaster. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Laptop computer',
    imposter: 'Laptop computer',
    aiPrompt: 'You are describing a laptop computer. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Football stadium',
    imposter: 'Football stadium',
    aiPrompt: 'You are describing a football stadium. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Banana smoothie',
    imposter: 'Banana smoothie',
    aiPrompt: 'You are describing a banana smoothie. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Rainy day',
    imposter: 'Rainy day',
    aiPrompt: 'You are describing a rainy day. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Zombie movie',
    imposter: 'Zombie movie',
    aiPrompt: 'You are describing a zombie movie. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Haunted house',
    imposter: 'Haunted house',
    aiPrompt: 'You are describing a haunted house. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Theme song',
    imposter: 'Theme song',
    aiPrompt: 'You are describing a TV theme song. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Board game night',
    imposter: 'Board game night',
    aiPrompt: 'You are describing board game night. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic",
    main: 'Alien planet',
    imposter: 'Alien planet',
    aiPrompt: 'You are describing an alien planet. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
  },
  {
    hint: "AI Mystery Topic (18+)",
    main: 'Walk of shame',
    imposter: 'Walk of shame',
    aiPrompt: 'You are describing a walk of shame after a wild night out. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
    adultOnly: true,
  },
  {
    hint: "AI Mystery Topic (18+)",
    main: 'Very awkward first date',
    imposter: 'Very awkward first date',
    aiPrompt: 'You are describing a very awkward first date. Keep answers brief and vague.',
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
    adultOnly: true,
  },
];

const GRILL_EXPANSION = {
  regularTopics: [
    'Snowy mountain cabin', 'Giant ferris wheel', 'Vintage motorcycle', 'Bowling alley', 'Sushi conveyor belt',
    'Space rocket launch', 'Haunted carnival', 'City marathon', 'Comic convention', 'Roller disco rink',
  ],
  adultTopics: [
    'Awkward speed dating', 'Messy house party', 'Walk home at sunrise', 'VIP nightclub booth', 'Hotel minibar raid',
    'After-dark karaoke battle', 'Flirty rooftop drinks', 'Embarrassing ex reunion', 'Wild bachelor party', 'Late-night taxi confession',
  ],
};

function toGrillRound(topic, index, adultOnly = false) {
  return {
    hint: adultOnly ? `AI Mystery Topic (18+) ${index + 1}` : `AI Mystery Topic ${index + 1}`,
    main: topic,
    imposter: topic,
    aiPrompt: `You are describing ${topic.toLowerCase()}. Keep answers brief, playful, and vague.`,
    previewLabel: 'Players interrogate the AI: yes, no, kind of, not really applicable, or possibly.',
    ...(adultOnly ? { adultOnly: true } : {}),
  };
}

function buildGrillBatch(adultOnly = false, count = 50) {
  const pool = adultOnly ? GRILL_EXPANSION.adultTopics : GRILL_EXPANSION.regularTopics;
  return Array.from({ length: count }, (_, index) => toGrillRound(pool[index % pool.length], index, adultOnly));
}

GRILL_EM_ROUNDS.push(
  ...buildGrillBatch(false, 50),
  ...buildGrillBatch(true, 50)
);

const BANNED_WORD_STOPLIST = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that', 'are', 'was', 'were', 'they',
  'them', 'their', 'have', 'has', 'had', 'not', 'too', 'you', 'our', 'its', 'but', 'than', 'then',
  'after', 'before', 'night', 'round', 'clue', 'global', 'prompt', 'topic', 'debate', 'picture', 'video',
  'sound', 'classic', 'chaos', 'mode', 'take',
]);

function tokenizeForBannedWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length >= 3 && !BANNED_WORD_STOPLIST.has(token));
}

function autoBannedWords(entry, fallbackWords = []) {
  const tokens = [
    ...tokenizeForBannedWords(entry?.hint),
    ...tokenizeForBannedWords(entry?.main),
    ...tokenizeForBannedWords(entry?.imposter),
    ...tokenizeForBannedWords(entry?.aiPrompt),
  ];
  const unique = [...new Set(tokens)];
  const selected = unique.slice(0, 5);
  if (selected.length >= 5) return selected;
  const filler = ['bluff', 'sus', 'vibe', 'chaos', 'nervous', ...fallbackWords];
  for (const word of filler) {
    if (!selected.includes(word) && selected.length < 5) selected.push(word);
  }
  return selected.slice(0, 5);
}

function ensureBannedWordCoverage() {
  DEFAULT_CATEGORIES.forEach((category) => {
    category.prompts.forEach((prompt, index) => {
      const key = `prompt::${category.id}::${index}`;
      BANNED_WORD_BANK[key] = autoBannedWords(prompt, BANNED_WORD_BANK[key] || []);
    });
  });
  OPINION_ROUNDS.forEach((prompt, index) => {
    const key = `opinion::global::${index}`;
    BANNED_WORD_BANK[key] = autoBannedWords(prompt, BANNED_WORD_BANK[key] || []);
  });
  GRILL_EM_ROUNDS.forEach((prompt, index) => {
    const key = `grill::global::${index}`;
    BANNED_WORD_BANK[key] = autoBannedWords(prompt, BANNED_WORD_BANK[key] || []);
  });
  Object.keys(MEDIA_ROUNDS).forEach((type) => {
    MEDIA_ROUNDS[type].forEach((prompt, index) => {
      const key = `${type}::global::${index}`;
      BANNED_WORD_BANK[key] = autoBannedWords(prompt, BANNED_WORD_BANK[key] || []);
    });
  });
}

ensureBannedWordCoverage();
