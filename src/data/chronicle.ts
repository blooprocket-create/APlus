import { ChronicleChapter, ChronicleObjective, ChronicleRegion } from '../types/campaign';

export const REGION_NAMES: Record<ChronicleRegion, string> = {
  whispering_woods: 'The Remembering Wood', ember_coast: 'The Ember Coast', glass_desert: 'The Glass Expanse',
  frostmarch: 'The Winter Without End', crown_of_night: 'The Crown of Night', world_heart: 'The World Beneath the World',
};
const palettes = {
  whispering_woods: { ground: 0x253e35, stone: 0x647262, foliage: 0x456f57, glow: 0xc1d99c, sky: 0x101f20 },
  ember_coast: { ground: 0x44342f, stone: 0x826758, foliage: 0x94794c, glow: 0xffb365, sky: 0x281d24 },
  glass_desert: { ground: 0x5a4b3d, stone: 0x9c8c6b, foliage: 0x749294, glow: 0x99e6ee, sky: 0x2c2839 },
  frostmarch: { ground: 0x556a77, stone: 0x9daeb7, foliage: 0x6c8d9e, glow: 0xa2d5ff, sky: 0x142b3e },
  crown_of_night: { ground: 0x332e45, stone: 0x76637e, foliage: 0x6d5078, glow: 0xe6adca, sky: 0x1a152a },
  world_heart: { ground: 0x243539, stone: 0x6a7777, foliage: 0x607b73, glow: 0xffd995, sky: 0x0a1821 },
};

function objective(id: string, kind: ChronicleObjective['kind'], title: string, hint: string, speaker: string, text: string[], extra: Partial<ChronicleObjective> = {}): ChronicleObjective {
  return { id, kind, title, hint, speaker, text, ...extra };
}
const memory = (id: string, title: string, speaker: string, ...text: string[]) => objective(id, 'memory', title, 'Follow the compass to the memory stone. Press F to listen.', speaker, text);
const puzzle = (id: string, title: string, speaker: string, text: string[], clue: string, options: string[], answer: number) => objective(id, 'puzzle', title, 'Find the sealed mechanism. Its inscription contains the answer.', speaker, text, { clue, options, answer });
const battle = (id: string, name: string) => objective(id, 'battle', `Break ${name}'s oath`, 'Defeat the guardian at the far end of the region. Read its ground attacks and keep your flask close.', name, []);
const talk = (id: string, title: string, speaker: string, ...text: string[]) => objective(id, 'conversation', title, 'Meet your ally at the camp beyond the guardian.', speaker, text);
const choice = (id: string, title: string, speaker: string, text: string[], options: string[]) => objective(id, 'choice', title, 'Return to the camp. Someone is waiting for your answer.', speaker, text, { options });

/** Authored campaign content. Chapters unlock through played objectives, never elapsed-time gates. */
export const CHRONICLE_CHAPTERS: ChronicleChapter[] = [
  {
    id: 'names_in_the_bark', act: 'ACT I · THE STOLEN MORNING', title: 'The Names in the Bark', region: 'whispering_woods',
    subtitle: 'Every tree remembers a person the kingdom has forgotten.', seed: 41021, palette: palettes.whispering_woods,
    guardian: { name: 'Avel, the Rootbound', epithet: 'KEEPER OF THE FIRST BELL', lastWords: 'I was not guarding the forest from you. I was keeping their names inside it.' },
    objectives: [
      memory('bark_witness', 'Listen to the tree that speaks your name', 'Celestia', 'This is not an ancient forest. These growth rings are younger than the war memorial in Aetherhaven. Someone planted a whole lifetime in a single night.', 'A child is speaking through the bark: “Mother said the bells would keep us safe. Why can nobody remember my face?” The voice knows your name, though you have never been here.'),
      memory('bark_register', 'Recover the census beneath the roots', 'Akatsuki', 'A royal census lies in a box of roots. Entire families have been struck from it with the same careful hand. Under “payment received,” each family has the seal of the Dawn Ministry.', 'The last page lists six places: the wood, the coast, the glass, the winter, the crown, the heart. Six bells. Six payments. A kingdom bought its sunrise with people.'),
      puzzle('first_bell', 'Open the first bell shrine', 'The Root Inscription', ['Three carved branches carry a cradle, a sword, and a crown. Only one still bears leaves.'], '“Before there was a throne, before there was a soldier, there was someone worth coming home to. Let the first remembered thing lead.”', ['Raise the crown', 'Raise the cradle', 'Raise the sword'], 1),
      battle('avel_oath', 'Avel, the Rootbound'),
      choice('bark_names', 'Decide where the lost names belong', 'Commander Vael', ['Avel was the first minister of the census. The roots were his punishment and his hiding place. The names you freed are now living embers in your hands.', 'Vael kneels beside a name he recognizes. “My brother. They told me he deserted. Give these to the families, or let me carry them until the roads are safe.”'], ['Return the names to their families', 'Entrust the names to Vael']),
    ],
    codex: { title: 'The Price of Dawn', text: 'Eighty-three years ago the kingdom of Elarion survived a night that should have ended it. The Dawn Ministry claimed six bells called the sun back. The missing-person registers tell a different story: the bells were paid for in memory, and the payments never stopped.' },
  },
  {
    id: 'the_hollow_procession', act: 'ACT I · THE STOLEN MORNING', title: 'The Hollow Procession', region: 'whispering_woods',
    subtitle: 'The dead are walking home. Their homes no longer know them.', seed: 41022, palette: palettes.whispering_woods,
    guardian: { name: 'Sister Thren, the Unheard', epithet: 'CANTOR OF THE HOLLOW CHOIR', lastWords: 'Tell them we were singing. We were never screaming.' },
    objectives: [
      memory('procession_steps', 'Follow the footprints that never fade', 'Brynhildr', 'Hundreds of footprints circle a collapsed chapel. None point away from it. The oldest are children’s shoes pressed into stone.', 'A soldier’s echo lifts an empty helmet. “I have marched home every evening for eighty years. Every evening the door belongs to someone else.” The Choir is made of the people the bells erased.'),
      puzzle('chapel_refrain', 'Complete the chapel’s unfinished refrain', 'Sister Thren’s Hymnal', ['The score has four measures: cradle, road, door, silence. Someone has scratched out the last measure and written a single word beneath it.'], '“A journey ends when another voice answers. Not silence. Not victory. What waits on the other side of a door?”', ['A command', 'A name spoken back', 'Another road'], 1),
      battle('thren_oath', 'Sister Thren, the Unheard'),
      talk('procession_confession', 'Hear Vael’s confession', 'Commander Vael', '“I signed transfer orders. Not the first ones. The later ones, when the Ministry said the payments were voluntary. People sent me letters, and I returned their wages to families who could no longer remember them.”', 'He puts his sword on the chapel floor. “I do not get to ask forgiveness. I can help you bring the others home.” The Triad takes the coastal road. A ferrymother has been hiding passengers from the Ministry.'),
    ],
    codex: { title: 'The Hollow Choir', text: 'The Choir are not invaders. They are the impressions left behind when a living person is consumed by a bell. They repeat the final task that mattered to them: a march home, a lullaby, a promise to return. Their violence comes when the world refuses to recognize them.' },
  },
  {
    id: 'embers_on_the_tide', act: 'ACT II · THE UNBURIED SEA', title: 'Embers on the Tide', region: 'ember_coast',
    subtitle: 'A harbor of lanterns. A sea that refuses to take its dead.', seed: 42031, palette: palettes.ember_coast,
    guardian: { name: 'Admiral Caern, the Ashen', epithet: 'WARDEN OF THE DROWNED FLEET', lastWords: 'The beacon is still burning. They can find the way home now.' },
    objectives: [
      memory('harbor_manifest', 'Read the manifest of the last ferry', 'Maera, Ferrymother', '“No coins,” the ferrymother tells you. “Payment is a story about the one you are looking for.” Her last ferry carried sixty people toward a lighthouse. Fifty-nine names remain on its manifest. The missing name is her daughter’s.', 'Offshore, lanterns float above ships burned to their waterlines. Nothing here has been allowed to sink. The coast’s bell keeps the fleet trapped at the instant of its destruction.'),
      puzzle('beacon_order', 'Relight the lighthouse lens', 'The Harbor Keeper', ['Three mirrors face sea, harbor, and sky. The lens will turn only when it remembers its purpose.'], '“The beacon is no crown for the stars. It is a hand held out to those still beyond the breakwater.”', ['Turn the light toward the sky', 'Turn the light toward the sea', 'Turn the light toward the harbor'], 1),
      battle('caern_oath', 'Admiral Caern, the Ashen'),
      choice('coastal_refuge', 'Choose who carries the beacon', 'Maera, Ferrymother', ['The sea begins to move. For the first time in living memory, the tide can reach the houses built on the old seabed. The fleet’s release will cost the harbor its lower streets.', 'Maera can ferry the families to safety. Lyra can send her smugglers to raise a seawall. Both ask you to trust people the Ministry called criminals.'], ['Evacuate the lower harbor with Maera', 'Build the seawall with Lyra’s crews']),
    ],
    codex: { title: 'The Ember Covenant', text: 'The coast supplied the Ministry with oil, ships, and “volunteers.” The admiral burned his own fleet rather than surrender a final transport of children. His bell preserved the ships and bound his guilt to them. Restoring time also restores consequences: tides, decay, and the debts of a harbor built on borrowed ground.' },
  },
  {
    id: 'the_ferrymothers_debt', act: 'ACT II · THE UNBURIED SEA', title: 'The Ferrymother’s Debt', region: 'ember_coast',
    subtitle: 'One passenger was never meant to arrive.', seed: 42032, palette: palettes.ember_coast,
    guardian: { name: 'Neris, the Lantern Child', epithet: 'THE PASSENGER BETWEEN TIDES', lastWords: 'Mama, you can put the lantern down. I can see you.' },
    objectives: [
      memory('lantern_child', 'Find the little lantern among the wrecks', 'Akatsuki', 'Inside a broken lifeboat, a lantern burns without oil. A girl’s reflection appears in its glass. She is older than Maera remembers her.', '“I kept growing,” the reflection says. “Even when the tide did not. I have been alone a very long time.” The Ministry did not take Neris. She took her mother’s place.'),
      puzzle('tide_gate', 'Unlock the gate between tides', 'Neris', ['The gate offers three keepsakes: a sailor’s medal, a child’s worn shoe, and an unopened royal letter.'], '“Mother never cared whether I was brave. She always asked whether I had got home with both feet dry.”', ['Offer the medal', 'Offer the royal letter', 'Offer the worn shoe'], 2),
      battle('neris_oath', 'Neris, the Lantern Child'),
      talk('maera_farewell', 'Give Maera the lantern', 'Maera, Ferrymother', 'Maera does not thank you. For a while she cannot speak. When she finally opens the lantern, a voice says, “I am not cold anymore.”', 'At dawn, a ferry leaves without collecting fares. Maera has drawn you a route through the Glass Expanse. A city there remembers an entire future that has not happened.'),
    ],
    codex: { title: 'Those Who Took Another’s Place', text: 'Not every offering was forced. Some stepped into the bells to keep a child, parent, or lover from being selected. Consent did not make the bargain honest. The Ministry promised a single season of service. Eighty-three years later, the service has not ended.' },
  },
  {
    id: 'a_city_of_tomorrows', act: 'ACT III · THE BROKEN HORIZON', title: 'A City of Tomorrows', region: 'glass_desert',
    subtitle: 'The ruins are not old. They are waiting to happen.', seed: 43051, palette: palettes.glass_desert,
    guardian: { name: 'The Cartographer of Ash', epithet: 'ARCHITECT OF THE UNLIVED CITY', lastWords: 'Leave one road unmeasured. Let them choose where it goes.' },
    objectives: [
      memory('glass_future', 'Read the map that includes your grave', 'Elyth, the Uncharted', 'The map changes when your hand touches it. One road ends at your grave. Another ends at Celestia’s. A third turns every settlement into the same immaculate, empty square.', '“They burned the desert to glass so no path could change,” Elyth says. She has crossed out every road she was told to take. There is a blank place in the map where a person should be.'),
      memory('glass_workshop', 'Search Sol’s abandoned workshop', 'Artificer Sol', 'Sol’s tools are here, though he swears he has never visited. A notebook in his handwriting describes the six-bell engine as a machine for pruning possible futures.', 'The final note reads: “Orin ordered another trial. Every time we save the capital, somebody further from it disappears.” Beneath it is a sketch of the Triad. The sketch is eighty-three years old.'),
      puzzle('uncharted_door', 'Find the door the map cannot predict', 'Elyth, the Uncharted', ['Three doorways are marked past, future, and an empty cartouche. All three cast the same shadow.'], '“If every drawn road ends in the same place, the only honest direction is the one they could not name.”', ['Enter the past', 'Enter the blank doorway', 'Enter the future'], 1),
      battle('cartographer_oath', 'The Cartographer of Ash'),
      talk('glass_revelation', 'Ask Celestia about the oldest sketch', 'Celestia', '“I recognize the theorem,” she says. “I wrote it in a dream when I was seven.” The Triad’s crests are not family heirlooms. They are three keys the engine makes whenever a cycle begins to fail.', 'For the first time, your companions ask whether your choices are your own. None of you has an answer. Elyth points north: the winter bell holds the engine’s first surviving witness.'),
    ],
    codex: { title: 'The Unlived City', text: 'Veyr was a research city built around a bell that could borrow tomorrow. Each successful prediction made another future impossible. Its streets became perfect, then empty. The Glass Expanse is not the remains of a catastrophe. It is the ground where too many possible worlds were burned away.' },
  },
  {
    id: 'the_road_we_choose', act: 'ACT III · THE BROKEN HORIZON', title: 'The Road We Choose', region: 'glass_desert',
    subtitle: 'A key is a thing made to obey. A person may refuse.', seed: 43052, palette: palettes.glass_desert,
    guardian: { name: 'The Third Reflection', epithet: 'THE TRIAD THAT OBEYED', lastWords: 'We thought obedience would save them. Please, be wrong where we were right.' },
    objectives: [
      memory('mirror_triad', 'Meet the reflection walking ahead of you', 'The Other Triad', 'Three figures wait beyond the glass. They wear your crests. Their armor is immaculate because they never had to fight the people who trusted them.', '“We used the keys,” your reflection says. “We saved the capital.” Behind it lies a world without villages, ferries, songs, or names. The capital stands alone in a morning that will never end.'),
      puzzle('broken_prediction', 'Break the reflected oath', 'The Mirror Inscription', ['The old oath reads: “Preserve the crown. Preserve the dawn. Preserve the engine.” A fourth line is left unfinished.'], '“An oath that cannot be questioned is a lock. Finish it with something that can still surprise you.”', ['Preserve the people who may disagree', 'Preserve the perfect future', 'Preserve the order of the bells'], 0),
      battle('reflection_oath', 'The Third Reflection'),
      choice('free_will', 'Choose the promise the Triad will keep', 'Your Companions', ['Brynhildr removes the crest from her armor. Celestia closes the grimoire. Akatsuki sets down her blades. For a moment you are four people without titles.', 'Nobody asks you to lead. They ask what you are willing to promise.'], ['We will return what the engine stole', 'We will protect those still living']),
    ],
    codex: { title: 'The Three Keys', text: 'The spear can break a binding. The grimoire can hold a memory without consuming it. The shadow can cross a boundary without being counted. These are the three functions the engine requires to restart itself. The Ministry calls their bearers chosen heroes. The bearers are beginning to suspect a different word: tools.' },
  },
  {
    id: 'winter_keeps_the_witness', act: 'ACT IV · THE LONGEST NIGHT', title: 'Winter Keeps the Witness', region: 'frostmarch',
    subtitle: 'Someone has been keeping the truth alive inside a frozen breath.', seed: 44071, palette: palettes.frostmarch,
    guardian: { name: 'Rook, the Last Warden', epithet: 'SENTINEL OF THE FROZEN BREATH', lastWords: 'I held the door. That was all I knew how to do.' },
    objectives: [
      memory('winter_camp', 'Search the camp with a single warm fire', 'Elyth, the Uncharted', 'A fire burns in a ring of frozen soldiers. Every soldier faces outward. In the middle sits a child reading the same page, one breath away from finishing it.', 'Elyth recognizes the insignia. “These were not the Ministry’s guards. They were its prisoners.” The camp was a rebellion. Winter was the only way to preserve its witness.'),
      puzzle('winter_fire', 'Wake the hearth without melting its witness', 'The Warden’s Instructions', ['The hearth has a vent, a bellows, and a shutter. An inscription warns that a great blaze will destroy what a little warmth may save.'], '“First give the fire a breath. Then feed that breath. Last, keep the wind outside.”', ['Bellows, shutter, vent', 'Shutter, vent, bellows', 'Vent, bellows, shutter'], 2),
      battle('rook_oath', 'Rook, the Last Warden'),
      talk('winter_witness', 'Let the child finish the page', 'Tamsin, Witness of the First Night', 'The child exhales. “It was not the sun that failed. We opened something under the palace. Orin said we could bring back the queen. The queen said no.”', 'She holds a page torn from the queen’s last letter: “Do not make the whole world wait for one person who is already gone.” The first bell was not built to save a kingdom. It was built to refuse a goodbye.'),
    ],
    codex: { title: 'The First Night', text: 'The official account says the stars turned against Elarion. The surviving witness remembers an experiment beneath the palace: an attempt to retrieve Queen Ilyra after her death. The six bells were constructed to contain what answered. Their builders discovered that containment could also be used to keep the kingdom from changing.' },
  },
  {
    id: 'letters_under_the_ice', act: 'ACT IV · THE LONGEST NIGHT', title: 'Letters Under the Ice', region: 'frostmarch',
    subtitle: 'A kingdom is also the things its people never got to say.', seed: 44072, palette: palettes.frostmarch,
    guardian: { name: 'The Courier of No Return', epithet: 'BEARER OF THE UNDELIVERED', lastWords: 'This one... is for you. I promised I would find you.' },
    objectives: [
      memory('winter_letters', 'Read the undelivered letter', 'Akatsuki', 'The courier’s bags contain letters addressed to people erased by the bells. The paper is worn where hands have opened the same envelopes for eighty winters.', 'One is addressed to Akatsuki’s grandmother. Akatsuki says she never had one. Her shadow reaches for the letter before she does.'),
      puzzle('postal_seal', 'Restore the courier’s final address', 'The Postal Register', ['The address has lost its place-name. Only a description survives: “Where the first bell learned a name, and the last name became a tree.”'], 'Trace the journey backward. Which place held the first stolen census?', ['The Ember Coast', 'The Remembering Wood', 'The palace beneath the crown'], 1),
      battle('courier_oath', 'The Courier of No Return'),
      talk('winter_thaw', 'Hear the letter Akatsuki kept', 'Akatsuki', '“They told us shadows had no families,” she says. “It was easier to train a weapon that believed nobody was waiting.” Her grandmother’s letter contains no prophecy. Just a recipe, a joke, and a request to write when she can.', 'Akatsuki folds it carefully. “We are going to need a world with postmen.” The thaw begins behind you. The road to the capital is no longer buried.'),
    ],
    codex: { title: 'The Shadow Registry', text: 'The Ministry’s boundary-crossers were trained from children whose families had been removed from public memory. A recruit without a remembered home was easier to move between worlds. The order’s surviving records call this freedom from attachment. Its letters call it theft.' },
  },
  {
    id: 'a_crown_without_a_king', act: 'ACT V · THE CITY THAT WAITED', title: 'A Crown Without a King', region: 'crown_of_night',
    subtitle: 'Every clock in the capital points to the same empty throne.', seed: 45091, palette: palettes.crown_of_night,
    guardian: { name: 'Ser Veylan, the Uncrowned', epithet: 'SWORD OF AN ABSENT SOVEREIGN', lastWords: 'There was never another order. I should have opened the gates.' },
    objectives: [
      memory('capital_square', 'Read the names beneath the victory monument', 'Lyra', 'The monument lists every Ministry victory. Beneath the base, maintenance workers scratched the names of the districts demolished to build it. Lyra finds her first warehouse, her mother’s street, and the school she was told had never existed.', '“We called it smuggling,” she says. “Half the cargo was food. The other half was proof that somebody had lived somewhere.”'),
      puzzle('crown_gate', 'Open the gate of succession', 'The Empty Throne', ['A crown, a sword, and a common house-key rest before the gate. The crown has no name engraved inside it.'], '“A city is not the person who rules it. What opens every home when the palace is gone?”', ['The crown', 'The sword', 'The house-key'], 2),
      battle('veylan_oath', 'Ser Veylan, the Uncrowned'),
      choice('city_truth', 'Decide how the capital will hear the truth', 'Lyra', ['The public bells can carry Tamsin’s testimony to every district. Vael asks for time to move the Ministry’s prisoners before its remaining officers panic. Lyra has already hidden copies in the markets.', 'There is no answer that cannot hurt somebody. Choose who acts first.'], ['Broadcast the witness now', 'Free the prisoners, then broadcast']),
    ],
    codex: { title: 'The Still Court', text: 'The king died forty-one years ago. The Ministry continued issuing commands in his name, using the bells to preserve the sound of his voice. The Still Court is a government built around a recording, maintained by officials afraid of what their city might become if it were allowed to mourn.' },
  },
  {
    id: 'the_man_who_kept_the_dawn', act: 'ACT V · THE CITY THAT WAITED', title: 'The Man Who Kept the Dawn', region: 'crown_of_night',
    subtitle: 'Orin has been waiting for you. Every version of you.', seed: 45092, palette: palettes.crown_of_night,
    guardian: { name: 'Orin, Keeper of the Borrowed Sun', epithet: 'FIRST ARCHITECT OF THE SIX BELLS', lastWords: 'I remember all of you. That was never the same as loving you.' },
    objectives: [
      memory('orin_chamber', 'Enter the room of discarded crests', 'High Sage Orin', 'The walls hold hundreds of spears, grimoires, and shadow-blades. Some are smaller than yours. Some are broken. Every set has three names written beneath it.', '“I remember them all,” Orin says. “Do you understand the kindness of being the only one who does?” Celestia answers, “You kept the record. You did not keep the promise.”'),
      puzzle('orin_counterseal', 'Undo the architect’s counterseal', 'Celestia', ['The engine asks for the three keys in the order they were made. Sol’s notebook lists their functions, not their weapons.'], '“First hold what must not be consumed. Then cross what must not remain closed. Last break what must not be renewed.”', ['Spear, grimoire, shadow', 'Grimoire, shadow, spear', 'Shadow, spear, grimoire'], 1),
      battle('orin_oath', 'Orin, Keeper of the Borrowed Sun'),
      talk('orin_last_key', 'Take the key Orin never used', 'High Sage Orin', 'Orin opens an unmarked drawer. Inside is an ordinary key to an ordinary room. “Her room. I kept thinking, if I could make the morning exact enough, she would be there.”', 'He gives it to you. “The engine does not know how to stop wanting. Neither did I.” Beneath the palace, the last bell answers in your own voice.'),
    ],
    codex: { title: 'The Architect’s Mercy', text: 'Orin remembered every erased person, believing remembrance excused the system that erased them. His private archive is the most complete record of Elarion ever assembled. It is also evidence that he knew exactly what every renewed morning cost.' },
  },
  {
    id: 'the_world_beneath_the_world', act: 'ACT VI · A MORNING OF OUR OWN', title: 'The World Beneath the World', region: 'world_heart',
    subtitle: 'There is no monster at the center. There is a promise that cannot end.', seed: 46111, palette: palettes.world_heart,
    guardian: { name: 'The First Promise', epithet: 'THE HEART THAT WOULD NOT LET GO', lastWords: 'If I let them go... will there still be somewhere for them to have been?' },
    objectives: [
      memory('heart_archive', 'Listen to the world before the bells', 'The Archive of Unbroken Days', 'You hear rain that never reached the coast. A wedding interrupted by a census. A postman practicing a name. A child inventing a song nobody else will know.', 'The engine has not destroyed these things. It has kept them. It believes that if it holds every unfinished moment tightly enough, nothing can ever be lost. The world has been suffocating inside an act of love.'),
      puzzle('heart_permission', 'Give the archive permission to change', 'The First Promise', ['The archive asks: “What is a memory for?” It has had eighty-three years to find an answer and has not found one it can live with.'], 'Think of the people you met: Maera’s lantern, Vael’s brother, Akatsuki’s letter. None asked to make the past happen again.', ['To make yesterday happen forever', 'To carry yesterday into a different tomorrow', 'To prove that nothing should change'], 1),
      battle('promise_oath', 'The First Promise'),
      talk('heart_companions', 'Ask your companions to stay', 'The Eclipse Triad', 'The engine withdraws its claim on the crests. Their light goes out. You expect your companions to fade with it. They do not.', 'Brynhildr laughs first. Celestia cries without trying to hide it. Akatsuki says she was never planning to leave. You were made for a function. You became people by choosing what to do with it.'),
    ],
    codex: { title: 'A Memory Is Not a Prison', text: 'The First Promise was an instruction: keep what matters from being lost. Without a boundary, it became an appetite. The bells kept every memory by preventing the world from moving beyond it. The Triad can break the instruction because they are its tools and the first tools to ask what the instruction means.' },
  },
  {
    id: 'a_morning_of_our_own', act: 'ACT VI · A MORNING OF OUR OWN', title: 'A Morning of Our Own', region: 'world_heart',
    subtitle: 'The world will not be perfect. It will be allowed to continue.', seed: 46112, palette: palettes.world_heart,
    guardian: { name: 'The Borrowed Sun', epithet: 'LAST LIGHT OF THE EIGHTY-THIRD YEAR', lastWords: 'Then go. There is still time to be late for something that matters.' },
    objectives: [
      memory('last_dawn', 'Look at the morning the engine offers', 'The Borrowed Sun', 'The final chamber opens onto Aetherhaven as it was before the first disappearance. Nobody is hungry. Nobody is afraid. The people waiting there have every face you hoped to see.', 'The sun offers you one perfect morning, renewed forever. Beyond it, through a narrow door, the real world is cold and wounded and uncertain. You can hear someone on the other side asking whether you are coming.'),
      puzzle('last_threshold', 'Name the thing a perfect world cannot give', 'The Threshold', ['The engine offers safety, certainty, and a place for every person. It asks what remains to want.'], '“A place chosen for you is not the same as a place you can choose to leave.”', ['A greater throne', 'A longer memory', 'A future we may choose differently'], 2),
      battle('sun_oath', 'The Borrowed Sun'),
      choice('ending', 'Choose what the new morning will carry', 'Your Companions', ['The bells are silent. Their gathered memories can be released into the lives that lost them, or kept as a freely visited archive where the living can meet the echoes without feeding it another life.', 'Returning everything means grief will arrive with love. Keeping the archive means tending it, without letting it become a kingdom’s excuse to stop living. This time, nobody will choose for the people who come after.'], ['Release the memories into the living world', 'Keep an open archive, without another sacrifice']),
      talk('epilogue_home', 'Go home together', 'The People of Elarion', 'In the wood, someone finishes carving a name. On the coast, a ferrymother takes a day off. In the glass, a road appears on no map. In the winter, a postman knocks on a door.', 'The capital’s clocks disagree. Lyra calls it a promising start. Vael walks home without a uniform. Sol builds a machine whose only purpose is to make tea.', 'Your companions argue about which road to take next. There is no prophecy. There is enough time to disagree. For the first time, the morning belongs to the people who must live in it.'),
    ],
    codex: { title: 'The Unwritten Road', text: 'The chronicles end at the first morning no engine has rehearsed. They do not say the world was healed in a day. They say the people who inherited it were finally allowed to try.' },
  },
];

export const CHAPTER_ECHOES: Record<string, Array<{ title: string; text: string }>> = {
  names_in_the_bark: [
    { title: 'A meal left warm', text: 'A bowl waits on a ruined doorstep. Scratched beneath it: “If the patrol takes your name, come anyway. I will know you by the way you knock.” The bowl has been replaced every winter. Someone has kept believing.' },
    { title: 'The census keeper’s daughter', text: 'A girl practiced writing her father’s name on every fallen leaf. The Ministry could erase a book, she reasoned, but it could not collect an entire autumn. The ground is covered in his name.' },
    { title: 'A borrowed hatchet', text: 'The hatchet’s handle bears seventeen owners’ marks. Each promised to return it after clearing a garden. A note tied to it says the eighteenth owner should stop apologizing and plant something worth coming back for.' },
  ],
  the_hollow_procession: [
    { title: 'The drummer without a regiment', text: 'The drummer repeats a rhythm too slow for marching. His orders say he must not leave anyone behind. At the back of the procession, an old woman with a walking stick is keeping up.' },
    { title: 'Chapel shoes', text: 'A shoemaker left pairs of unfinished shoes beneath the chapel. He could not remember the children’s sizes, but he remembered that there had been children. He made every size and waited for someone to complain about the fit.' },
    { title: 'A hymn in the wrong key', text: 'Sister Thren’s first teacher wrote: “She is always a little flat. Nobody else makes the frightened children sing.” The Ministry’s approved recording corrected every note. The children never joined in again.' },
  ],
  embers_on_the_tide: [
    { title: 'The harbor’s oldest debt', text: 'The harbormaster’s ledger records a debt of one pear. It has survived four accounting purges because somebody has classified it as a navigational hazard. In the margin: “He said he would bring it when he came back.”' },
    { title: 'A ship named Enough', text: 'Every ship in the fleet was named for a victory except one. Its captain had already survived three wars. His final requisition asked for a fishing net, a smaller sail, and permission to stop being useful to an admiral.' },
    { title: 'A map of high water', text: 'The poorest houses mark old flood levels on their doors. The newest council plan marks the same doors as unoccupied. A child has corrected the map with the names of everyone still sleeping there.' },
  ],
  the_ferrymothers_debt: [
    { title: 'Neris’s fare', text: 'A shell lies in the ferry’s coin box. Maera’s daughter paid with it on her first trip alone. The box contains gold, silver, and a royal seal. Only the shell has been polished by somebody’s thumb.' },
    { title: 'The fourth passenger', text: 'Three fishermen remember taking four people off a sinking boat. Each has built a different story to explain the fourth seat. All three still leave it empty when they go out, just in case the story is wrong.' },
    { title: 'Directions to a safe house', text: 'The note says to follow the laundry, never the lanterns. The Ministry can command a lighthouse. It has never persuaded a harbor full of mothers to hang their sheets in the wrong order.' },
  ],
  a_city_of_tomorrows: [
    { title: 'The baker’s prediction', text: 'The city engine predicted precisely how many loaves would be needed each morning. The baker kept making one extra. His punishment record calls it waste. His notebook calls it the chance that somebody new might arrive.' },
    { title: 'An unapproved constellation', text: 'A child drew an extra star between the approved constellations. Under it: “This one is mine. You cannot count it if I do not tell you where it is.” The engine’s chart leaves the same patch of sky blank.' },
    { title: 'Elyth’s first wrong turn', text: 'A map is covered in careful corrections. One wrong turn is circled instead of erased. Elyth met her closest friend there. Beneath the circle she wrote: “The error was not the part where I got lost.”' },
  ],
  the_road_we_choose: [
    { title: 'The unmade wedding dress', text: 'The engine predicted that the marriage would fail. The seamstress made the dress anyway and left the hem unfinished so the bride could decide its length. There are some choices a kind future should refuse to make for you.' },
    { title: 'Sol’s smallest invention', text: 'Among the engine diagrams lies a drawing of a kettle with an unnecessarily cheerful whistle. Sol annotated it: “A machine that tells you something is ready, then lets you decide whether to get up.” Nobody approved its funding.' },
    { title: 'The discarded key', text: 'An earlier Triad scratched a message under a stone: “If you find this, do not believe that being remembered by him is the same as having lived.” Beside it are three names, written large enough to outlast the scratches.' },
  ],
  winter_keeps_the_witness: [
    { title: 'A guard’s last request', text: 'The guards at the frozen camp left their weapons pointing outward and their boots beside the hearth. Rook’s orders read: “When she wakes, do not let the first thing she sees be a soldier.”' },
    { title: 'The snowman register', text: 'Children built a snowman for every missing neighbor. The Ministry called it a disturbance and ordered them removed. The next morning there were snowmen for the officers too. The orders stopped arriving.' },
    { title: 'A winter orchard', text: 'An orchard keeper wrapped each tree before the first frost and never stopped. His wife’s note says the trees cannot thank him. Under it, in another hand: “That does not seem a reason to let them die.”' },
  ],
  letters_under_the_ice: [
    { title: 'The postman’s rule', text: 'The courier handbook has one handwritten amendment: “When a name is missing from the census, knock anyway.” The Ministry stamped it invalid. Every later copy includes the amendment and the stamp, as if both were required.' },
    { title: 'A recipe for six', text: 'The recipe makes enough soup for six people. Every surviving household record lists five. Nobody has changed the recipe. The sixth bowl is always put away clean, though no one can explain why it was brought out.' },
    { title: 'A shadow’s birthday', text: 'The shadow order does not record birthdays. Someone kept doing it privately, drawing a little candle beside every recruit’s number. Akatsuki’s candle has seventeen marks. The last is in a different hand, added by another recruit.' },
  ],
  a_crown_without_a_king: [
    { title: 'The stonemason’s correction', text: 'Every statue on this road has a grand title. One has a second inscription, added later in a smaller hand: “He liked pears. He was frightened of dogs. He was more than this.” The correction has survived seven attempts to remove it.' },
    { title: 'The woman who wound the clocks', text: 'The palace clockkeeper was dismissed for letting a public clock run eleven minutes fast. Her defense says the baker used it to finish early enough to take his daughter to the river. The clock is still fast.' },
    { title: 'Cargo marked fragile', text: 'Lyra’s oldest manifest lists four crates of porcelain. The crates contained census records, witness letters, and a sleeping child. She charged the Ministry for the broken plates. It paid promptly and never inspected the shipment.' },
  ],
  the_man_who_kept_the_dawn: [
    { title: 'The queen’s ordinary room', text: 'There are no jewels in Ilyra’s room. There is a chipped cup, an unfinished book, and a note asking Orin to repair the window latch. The only surviving portrait shows the latch faithfully, as if the painter understood what history would leave out.' },
    { title: 'A correction never published', text: 'Orin drafted a public apology every year for eighty years. Each draft explains the necessity of continuing the engine before it mentions the people it consumed. The final draft contains only their names and has no signature.' },
    { title: 'The last audience', text: 'The dead king’s preserved voice thanks the same gardener every morning. The gardener retired thirty years ago. A young apprentice still answers, because leaving someone’s gratitude unanswered feels cruel, even when the palace has made a prison of it.' },
  ],
  the_world_beneath_the_world: [
    { title: 'A rain that never fell', text: 'A memory of rain hangs above a farmer’s field. The engine preserved the water because it would spoil a royal procession. Far below the palace, the field has waited eighty-three years to be allowed a bad afternoon.' },
    { title: 'The first unfinished song', text: 'The archive’s oldest song has no final line. Its singer stopped to answer a child calling from another room. The engine has spent decades searching for the missing words. The interruption was the ending. Someone was needed elsewhere.' },
    { title: 'A broken toy, repaired badly', text: 'The archive offers thousands of perfect copies of a wooden bird. The child’s real toy has one crooked wing, repaired by a father with more patience than skill. Every echo reaches for that one.' },
  ],
  a_morning_of_our_own: [
    { title: 'Permission to be late', text: 'A clock at the last threshold has no hands. Under it: “You do not owe the morning a perfect account of how you spent it.” Someone has drawn a little kettle where the numbers should be.' },
    { title: 'A map with room left over', text: 'Elyth left a new map beside the road. Half of it is blank. On the back: “For the places we will discover after we stop needing to be chosen.” It is the first map you have found that does not promise to know the way.' },
    { title: 'The invitation', text: 'A table is being set in a world beyond the final door. The invitation contains no titles, seals, or instructions. It says: “Come when you can. Bring whoever you have become. We will make room.”' },
  ],
};
