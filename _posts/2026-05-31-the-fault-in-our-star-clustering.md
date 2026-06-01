---
layout: post
title: "The Fault in Our Star Clustering"
description: In 2016 I tried to test whether constellations are "real" by clustering stars. The experiment was a little broken. Here's the honest re-run, with a sky you can poke at.
published: true
viz: true
---

<aside class="note" role="note">This started as a college project in 2016. I dug it back up, found the methodology had a couple of quiet problems, and rebuilt it from scratch. The original conclusion sort of survived... but only after I changed the question I was actually asking.</aside>

In college I took an astronomy class with Dr. Doty, a wildly entertaining professor known for his half-inch-thick glasses, boundless energy, and habit of explaining the universe through baseball metaphors (as one does). His final project was fantastically liberal arts: write your paper about astronomy, but through the lens of *your* major. A chemistry friend of mine did something with stellar spectra and emission lines. There was, I'm fairly sure, at least one person who turned in a literal book of poems. You get the idea. Sneakily hard, too... you can't hide behind a rubric, because everyone's rubric is different.

I was a CS major, one course shy of both a math minor and a classics minor. Small liberal-arts school. So that still left me with options. I had to pick which version of myself was writing the paper.

I picked the CS major. I was also taking an artificial intelligence class at the same time (mind you, this is pre-LLM AI... what most people now call "data science" for clarity instead) and I had just learned about clustering, and I was a tired college junior looking for an easy win before heading off abroad. I already had clustering code from the AI class, so re-using it with minor adjustments for the astronomy paper was "basically free". So my paper was going to be about clustering. Specifically: **if you wiped the slate clean and started over, would humanity draw the same constellations?**

It's a genuinely fun question. A constellation is a story people agreed to tell about some dots. The Greeks named their constellations, the Chinese named theirs independently, and the two systems carved up some of the *same* regions even though nobody compared notes. So are constellations discovered or invented? If they trace something real in the sky, an algorithm that knows nothing about Greek myth should rediscover them just from where the stars sit, right?

That was the idea. I ran k-means on the star data coordinates, compared its groups to the real constellations, wrote up my findings, and got my (okay) grade.

## What 2016 me got wrong

I dug the paper back up recently. Reading your own old work is... something. The programming was in MATLAB because we didn't really have a choice (I have made my peace with the one-based indexing... mostly). The core of the whole thing was maybe 20 lines: sweep through different values of *k*, run k-means a few times at each one, keep the best result.

Quick aside if k-means is unfamiliar: you tell the algorithm "I think there are *k* groups in this data," and it tries to find them. It picks *k* random center points, assigns every data point to its nearest center, scoots the centers to the middle of their new groups, and repeats until nothing moves. It's simple!

Anyway, the clustering loop itself was fine. The problem was never the loop. It was the two things I fed into it and the question I asked of what came out. Two real problems, and they're different *kinds* of wrong.

The first is that **I took an easy shortcut with the geometry.** Stars get located by two numbers: right ascension (like longitude, 0 to 24 hours, and it *wraps*, so 23.9h is right next to 0.1h) and declination (like latitude, -90° to +90°). I fed those two numbers straight into k-means as if they were x and y on graph paper. They are not x and y on graph paper. They're coordinates on a sphere. I knew this at the time but treating them as flat was easy, and I was on a deadline, and it mostly worked (lol). The problem showed up at the edges: constellations sitting on the right-ascension seam got torn in half by the flat coordinates, and my fix was (and I quote past me from my paper) to "eliminate any constellations that wrap around the ends." Just... set the wrapping ones aside and don't consider them at all. Which, look, the analysis I *did* run was honest about the stars it looked at. But the seam wasn't a property of those constellations; it was an artifact of pretending a sphere was a sheet of paper. I was patching symptoms instead of fixing the cause and, frankly, I didn't really care, lol.

<div class="cx cx-fig" data-fig="naive" data-src="/assets/data/2026-05-31-on-whether-the-stars-cluster/stars.json"></div>

The second problem is more subtle, and it took me longer to see. **The question wasn't exactly scientific.** "Do the stars in a constellation cluster spatially?" Well... a constellation is a group of stars that look close together. What does "they group together" even mean without a threshold? Of course constellations cluster together *somewhat*. That's nearly the definition. I probably asked it because it was easy, and because I already knew it would give me something to write about. But the results were weirdly mediocre anyway, which should've been a clue that I was missing nuance. The more interesting question, the one I should've been asking, is whether an algorithm would (or could?) carve the sky into the *same* partition a human would: same boundaries, same number of groups, same membership. That version can actually be wrong, which is what makes it worth asking.

## Rebuilding it without the trapdoors

The fix for the geometry is to put these points on a sphere, not a flat space. Once the points are on a sphere, you can cluster from there. Luckily, Python makes this easier than MATLAB did... and it's a better solution:

```python
def sphere_vectors(stars):
    # RA is in hours (0-24); multiply by 15 to get degrees, then radians.
    ra = np.radians(np.array([s["ra"] for s in stars]) * 15.0)
    dec = np.radians(np.array([s["dec"] for s in stars]))
    # Each star becomes a unit-length (x, y, z) direction on the sphere.
    return np.column_stack([
        np.cos(dec) * np.cos(ra),
        np.cos(dec) * np.sin(ra),
        np.sin(dec),
    ])
```

No seam, no pole distortion, no excluding constellations because they're inconvenient. The modern [HYG catalog](https://www.astronexus.com/hyg) also just has a constellation column, so I no longer have to slice characters off a designation string to guess. And the data cleaning is brutal in a way worth seeing... almost the entire catalog is stars no unaided human eye has ever resolved:

<div class="cx cx-fig cx-clean" data-src="/assets/data/2026-05-31-on-whether-the-stars-cluster/stars.json"></div>

Keep every naked-eye star (apparent magnitude ≤ +6, Ptolemy's old visible limit) and you're left with **5,070 stars across all 88 constellations**. No strategic exclusions due to laziness. Cluster those on the sphere and the torn seam from the previous figure heals; same projection, now whole.

Hover over any star to light up just its group (its real constellation, or whatever the algorithm lumped it with) and see how that group wraps across the sky.

<div class="cx cx-fig" data-fig="sphere" data-src="/assets/data/2026-05-31-on-whether-the-stars-cluster/stars.json"></div>

Flip from the real constellations to the algorithm's groups and watch how little the two disagree. Then, under the algorithm's groups, swap between the 2016 way and sphere k-means (the fix). The 2016 mode isn't a strawman: it's the literal pipeline from my old paper, deletion and all — flat (RA, dec), the nine seam-wrapping constellations greyed out and dropped, and the score computed only on the stars that survived. Here's the anticlimax I did not see coming: **the geometry fix barely moved the needle.** That actual 2016 pipeline scores about 0.77 (0.7712) on Normalized Mutual Information (how much knowing a star's cluster tells you about its real constellation), on the 4,489 stars it kept. Doing it properly on the sphere, all 5,070 stars and all 88 constellations? Also about 0.77 (0.7651), actually slightly *lower*. Most constellations live far enough from the poles and the seam that the distortion just washes out — and throwing the seam-crossers away, the thing I agonized over, changed almost nothing.

That was deflating. I'd "fixed" the experiment and barely moved the score. Same mediocre answer, fancier math. The engineering equivalent of refactoring a service for two weeks and deploying it with identical behavior. If the story ended here it would be a pretty good cautionary tale about looking busy, and not much else.

## Changing the question

So I did the thing you're supposed to do when the data won't cooperate: I went back and looked at what the algorithm was actually getting wrong, instead of what I wanted it to get right.

k-means has one personality trait: it carves space into round, evenly-sized blobs, because that's what "nearest centroid" produces. But a real constellation can be a long thin chain (Eridanus, the river) or a fat sprawl (Hydra). Shapes k-means structurally cannot want. And when I looked at *which* constellations it mangled, they were almost all the big sprawling ones. The compact, bright ones (Crux, Lyra, Gemini) it nailed.

That's the clue. **Humans didn't draw constellations from the faint stars. We drew them from the bright ones.** Nobody selected the saddest, faintest, unnamed star for Orion... they connected Betelgeuse and Rigel and the three bright stars of the belt. The faint stars are noise we *added* to the catalog later with telescopes. While the idea of including all stars visible to the human eye was good in theory, it added way too much noise to produce a good signal for constellations.

So I changed two things. First, restrict to brighter and brighter stars and watch what happens. Second, swap k-means for average-linkage agglomerative clustering, which grows groups by *chaining* nearby stars together instead of forcing round blobs like k-means. Luckily, scikit-learn makes it pretty easy-peasy:

```python
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

X = sphere_vectors(stars)  # 3D unit-sphere directions

# The 2016 way: k-means on raw flat (RA, dec).
naive = KMeans(k, n_init=10).fit_predict(flat_features(stars))

# k-means, done right: same algorithm, but on the sphere.
sphere = KMeans(k, n_init=10).fit_predict(X)

# Chain-following: grows long, thin groups instead of round blobs.
linkage = AgglomerativeClustering(k, linkage="average").fit_predict(X)

nmi = normalized_mutual_info_score(true_constellations, linkage)
ari = adjusted_rand_score(true_constellations, linkage)
```

You can *see* the difference in temperament. Where naive k-means draws round territories, linkage threads the bright stars together like beads. Much closer to how a person traces a figure. This is the figure to actually play with: drag the slider toward the bright end and watch the reproducibility score climb as the faint noise falls away, or search for a constellation you know to see how intact it came back.

<div class="cx cx-fig" data-fig="chain" data-src="/assets/data/2026-05-31-on-whether-the-stars-cluster/stars.json"></div>

Push the slider all the way to the bright end and the score jumps. Here's that same climb for all three methods at once, as one picture:

<div class="cx">
  <div id="cx-chart" data-src="/assets/data/2026-05-31-on-whether-the-stars-cluster/stars.json"></div>
</div>

Three lines, all climbing as you keep only the brighter stars. The chain-following method (orange) pulls ahead once the shapes start to matter. Down at the brightest cut, naked-eye-prominent stars only, reproducibility hits **NMI ≈ 0.92**, and the harder pairwise metric (Adjusted Rand Index, which asks whether pairs of stars that are together in real life land together in the clustering) climbs from a middling 0.4 to **0.65**. That's not the question answering itself. Hand the algorithm only the stars a human would actually have looked at, and it draws something close to the human map.

My original hypothesis ("the stars cluster into constellations") was too vague to be either true or false. The *true* hypothesis (**the *bright* stars cluster into constellations, and you need a method that follows chains to see it**) is the one the data actually supports. I didn't find the answer in 2016 because I wasn't asking a question that *had* one. And, frankly, I wasn't all that concerned about whether it did.

## So, are constellations real?

The numbers tell a consistent story, and I think it's a good one. Among the bright anchor stars, the clustering recovers the human map surprisingly well. The constellations aren't arbitrary scribbles, they trace real clumps of bright stars, which is why distant cultures kept landing on overlapping regions. But the exact borders aren't inevitable. Search for **Eridanus** in the chain-following figure above (recovered about 25% intact) versus **Crux** or **Lyra** (basically perfect): the compact, bright figures are reproducible; the sprawling chains a culture chose to *narrate* as one thing are not.

Which is the most human answer possible. The raw material is real, if imperfect. Orion's bright stars really do huddle together up there. But the hunter, the belt, the sword, the dog at his heel? We brought those. Some future stargazer with no Greek in their education would look at the same bright knot and see something else entirely, and they wouldn't be wrong.

The bright stars *do* cluster. The stories we drew around them don't quite match. I think that's better than a clean yes. And it's a much better answer than the one I turned in to Dr. Doty.

---

<aside class="note" role="note">The re-analysis is a few hundred lines of Python (scikit-learn this time, instead of MATLAB-by-directive). Every clustering runs offline and gets baked into one JSON file; the browser just swaps precomputed labelings, so the figures are instant.</aside>

<script src="/assets/js/constellation-names.js"></script>
<script src="/assets/js/constellation-figures.js" defer></script>
<script src="/assets/js/constellation-chart.js" defer></script>
