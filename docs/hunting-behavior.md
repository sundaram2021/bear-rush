# Brown-bear hunt behavior used in Bear Rush

> **Evidence versus game tuning:** the sources below support ecological direction and limitations. The per-animal seconds, pursuit radii and capture windows are **game-balance settings**, not measurements of real-world chase durations.

## General brown-bear hunt loop

Brown bears are opportunistic omnivores, not pursuit specialists. A review of ungulate predation reports substantially more kills of newborn and yearling animals than adults. It describes scent-led searching, occasional chases, and bears as relatively poorly adapted to prolonged cursorial pursuit; field accounts include hunts much longer than a practical game encounter. [1] [2]

For the takedown, source accounts describe bites to the head/neck or back of the neck, and forepaw strikes that can injure the spine; bears then feed at the carcass rather than collecting prey through incidental contact. [1] [3]

The game therefore uses a readable, compressed loop: discover a track, approach quietly/upwind, trigger a flight response, stay close through a species-specific chase, then pounce only when prey is winded. A successful pounce plays a brief non-graphic forelimb/head-down capture reaction; a body collision or early/misaligned pounce does not catch. Encounter windows are tuned for playability, not presented as a literal biological simulation.

## Evidence and design choices by target

### Deer and fawn

Brown bears are opportunistic omnivores. In eastern Hokkaido, scat analysis across 1999–2008 found deer-fawn hair occurrence increased during a local deer-population irruption; samples were deliberately taken during the deer birthing season (late May–late July). This supports fawns as a more plausible bear-hunt target than treating adult deer as routine prey, but scat data do **not** measure chase style or capture time. [4]

A northeastern Minnesota white-tailed deer study documented summer fawn predation by wolves and **black bears**, not grizzlies. A Virginia camera-collar study likewise found black-bear deer meals were predominantly scavenged; its observed bear hunting events were on fawns. These studies support age/season caveats but are not direct grizzly behavior results. [5] [6]

**Game treatment:** deer and fawn have separate alertness, flight speed, pursuit endurance and pounce distance. Fawns use the shorter, more vulnerable chase. Adult-deer encounters remain a game abstraction; the hunts are not represented as the typical way a grizzly obtains deer meat.

### Moose

A North American review identifies grizzly/brown bears as important predators of neonatal moose calves, with vulnerability concentrated in the first days/weeks after birth. In one east-central Alaska calf study, 84% of observed mortality occurred within 21 days of birth. Across collared-bear studies, reported minimum kill rates differ greatly between calves and adults. Adult kills do occur, including cows during/after parturition, but are not a reasonable ordinary baseline. More recent Minnesota work concerns **black bears** and also describes a short period of heightened calf vulnerability. [2] [7]

**Game treatment:** moose are the longest, most demanding ungulate chase, with lower turning response. Treat the target as an exceptional encounter. The procedural antlered actor is not an age-specific biological model; it should not be read as evidence that adult moose are routine grizzly prey.

### Rabbit / snowshoe hare

The National Park Service describes snowshoe hares as active year-round, seasonally camouflaged, well-adapted to escape, and prone to freeze when they detect a predator. In a peer-reviewed experiment, hares fleeing a leashed dog moved faster and on straighter paths than foraging hares. The authors discuss tighter turns at very close predator distances as a plausible escape response, but their dog trial was a startle rather than a prolonged natural chase. That distinction matters: constant zig-zagging at every distance would overstate the evidence. [8] [9]

**Game treatment:** the hare pauses briefly at detection, then makes a quick, relatively straight burst at range; evasive steering strengthens only as the bear closes. The close-turn phase is a gameplay interpretation, not a claim that the cited study measured it during a bear pursuit.

### Coyote

Coyotes are not a conventional bear-prey species. Recent grizzly-recovery modeling identifies interference competition with coyotes and other large carnivores as a meaningful interaction and discusses intraguild killing; that paper models ecosystem effects rather than measuring a routine grizzly–coyote hunt rate. Separate western-U.S. carnivore field research found coyotes readily scavenged cougar kills while navigating predation risk from cougars; it is **not** evidence that bears commonly hunt coyotes. [10] [11]

**Game treatment:** honor the requested coyote encounter as an exceptional competitor challenge, not a routine diet item. Coyotes have longer alerting distance, high escape speed, a wide pursuit/escape envelope and the longest stamina requirement. The chase/capture scenario itself is an explicit game abstraction.

### Salmon and the river

At Mikfik Creek, Alaska, researchers watched 49 brown-bear fishing events; 38 had usable capture times. Bears waited for and pursued sockeye in shallow riffles and also chased, dived and waded in pools. Mean time spent fishing to capture a small adult fish was about **3 minutes** at that site, with high variability; it is not a universal time. A separate McNeil River study tracked 105 chum salmon and documented heavy predation below a seasonal migration barrier. Katmai National Park explains that fishing success depends on concentrated runs and site/run timing: a temporary barrier can make salmon catchable, while dispersed fish in broad water are harder to catch. [12] [13] [14]

**Game treatment:** salmon swim upstream in the river, then flee downstream when the bear comes close. The bear must wade, stalk to short range, face the fish and press Hunt at low speed. The instant strike compresses a multi-minute real event into a responsive game action; there is no biological claim that a bear normally catches every fish on one press. The procedural river has fish more continuously available than a real river; run abundance and seasonality are not yet simulated.

### Drifting wood

Moving logs are the requested river-only hazard. Their movement follows the modeled downstream direction; collision sweeps between frames so the bear cannot pass through a log at speed. The minimap shows nearby logs. Wood collision is a **game hazard design**, not a sourced claim about a standard bear injury rate.

## Encounter balance (game time, not wildlife data)

Prey stamina begins at 100% and drains only during a close, directed chase: the bear must be moving, within the species pursuit radius and facing toward the animal. Exhaustion triggers at 20%; effective times below are therefore **80% of the configured full-drain duration**. If the bear stops pursuing, misses, or loses the chase, the animal recovers or flees again. The short tired window forces the player to align a committed pounce rather than touch-catch a healthy animal.

- **Rabbit / hare:** up to **3.36 seconds** of continuous pursuit to exhaustion; **2.7 seconds** to pounce. The short flight and tight-range evasions make it easy to lose by oversteering.
- **Fawn:** **4.16 seconds** to exhaustion and **4.4 seconds** to pounce; the shortest ungulate chase.
- **Deer:** **6.72 seconds** to exhaustion and **4 seconds** to pounce; the player must keep a line on it.
- **Elk:** **8.16 seconds** to exhaustion and **3.6 seconds** to pounce; faster, with a narrower finish window.
- **Moose:** **9.76 seconds** to exhaustion and **3.7 seconds** to pounce; the long stamina challenge. Adult predation is exceptional in the cited ecology.
- **Coyote:** **10.56 seconds** to exhaustion and **3 seconds** to pounce; the highest-alert, high-speed fictional competitor challenge.

Salmon has a separate **2.55 m** strike radius and a **2.4 m/s** bear-speed limit; a slow wading strike replaces land-pounce mechanics. River logs flow at **1.8–2.8 m/s**, with five pooled visible logs and **22% health** damage on collision. Wading slows the bear and disables sprint-pouncing. On land the three original hazards remain poisonous forage, bear traps and trench falls; logs never damage the bear on dry ground.

## References

[1]: https://link.springer.com/article/10.1007/s13364-018-0396-7 "A meta-analysis of ungulate predation and prey selection by brown bears"
[2]: https://www.adfg.alaska.gov/static/home/library/pdfs/wildlife/research_pdfs/alces/760.pdf "Bear predation on moose: a review of recent North American studies and their management implications"
[3]: https://www.largecarnivores.fi/species/brown-bear/bears-diet-and-hunting-behaviour.html "Bear's diet and hunting behaviour"
[4]: https://doi.org/10.1007/s11284-012-0962-4 "Increased brown bear predation on sika deer fawns following a deer population irruption in eastern Hokkaido, Japan"
[5]: https://www.usgs.gov/publications/wolf-and-bear-predation-white-tailed-deer-fawns-northeastern-minnesota "Wolf and bear predation on white-tailed deer fawns in northeastern Minnesota"
[6]: https://dwr.virginia.gov/blog/the-virginia-appalachian-carnivore-study-black-bears-white-tailed-deer-in-the-appalachian-mountains-of-virginia/ "Virginia Appalachian Carnivore Study: Black Bears & White-tailed Deer"
[7]: https://doi.org/10.1002/jwmg.22618 "Spring black bear harvest and predation pressure on moose calves"
[8]: https://www.nps.gov/articles/snowshoe-hare.htm "Snowshoe Hare"
[9]: https://www.umt.edu/mills-lab/files/2015/10/contentserver.pdf "Avoiding and escaping predators: movement tortuosity of snowshoe hares in risky habitats"
[10]: https://research.fs.usda.gov/download/treesearch/80640.pdf "Predicting community interactions under grizzly bear rewilding and considerations for coexisting large carnivores"
[11]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8536332/ "Variable strategies to solve risk–reward tradeoffs in carnivore communities"
[12]: https://scholarsarchive.byu.edu/cgi/viewcontent.cgi?article=2695&context=wnan "Time required for brown bears to capture and consume Pacific salmon"
[13]: https://doi.org/10.2192/URSUS-D-12-00006.1 "Interactions between brown bears and chum salmon at McNeil River, Alaska"
[14]: https://www.nps.gov/katm/learn/photosmultimedia/brown-bear-frequently-asked-questions.htm "Brown Bear Frequently Asked Questions"
