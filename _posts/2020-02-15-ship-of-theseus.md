---
layout: post
title: On the Ship of Theseus
subtitle: Is it the same ship?
medium: Blog
---

During my middle school years, I hung out at my local airport. I considered myself lucky to wax small planes for some spare cash, weed wack around tie downs for flight lessons, or "learn through osmosis" by hanging around some old-school pilots while they recounted their air adventures and mishaps. This particular airport happened to be the former test site for all [Taylorcraft](https://en.wikipedia.org/wiki/Taylorcraft_Aircraft) airplanes in the 40s, so naturally there were several planes around from this era... and they were still flying! I often wondered how these planes stayed airworthy after such a long time. The answer? Many annual inspections where engines were overhauled or faulty parts were fixed or replaced. Therefore, after 80 or so annual inspections (and likely many other day-to-day fixes), these planes had their parts replaced one-by-one. In fact, these planes had had so many parts replaced that often the only original part that remained was the identification/data plate assigned at manufacture.

I recently learned that this phenomenon has a name and has been pondered since the dawn of Western philosophy&mdash;it's called the [Ship of Theseus](https://en.wikipedia.org/wiki/Ship_of_Theseus) thought experiment. The general question is this:

> If a ship has each of its parts replaced one-by-one, after _every_ part has been replaced, is it the same ship?

Surely you can think of many examples of this sort of idea. While I could try to discuss the different philosophical view points of this thought experiment, I'm not a philosopher and that probably wouldn't go very well. Instead, I'm interested in how this shifted viewpoint of "identity" relates to several things in the lives of developers.

### A Ship of Theseus Codebase

A Ship of Theseus codebase is the first thing that came to mind. Our premise here would be:

> If a codebase is entirely rewritten, is it the same codebase?

As it turns out, I found an example! [Here's Graydon Hoare mentioning](https://graydon2.dreamwidth.org/195706.html) that only about 2,167 LOC of the original ~344k LOC of the Rust codebase remain the same. From the outside looking in, Rust doesn't appear _that_ different, but it _has_ changed so much.

Certainly, there are lots of questions I'd have here.
- Does the purpose of the codebase remain?
- Do all/any features remain?...is there a point where so many features are dropped it "crosses-over" into a new codebase?
- Is it a code swap preparing for a language version update (I suppose this is extreme since I can't think of a language update that requires shifts in _entire_ codebases because there's little-to-no backwards compatibility)?
- What if every line is rewritten with just syntax changes, not any functional changes?

A trope I've often noticed in tech companies interested in "re-inventing" themselves is a concept of "building a car while driving it" (or more outlandish yet, [building the plane while flying it](https://www.csmonitor.com/The-Culture/The-Home-Forum/2016/0324/Build-the-plane-while-you-re-flying-it) &nbsp;👀)

### A Ship of Theseus Team or Company

Here are some more thoughts.

- Compare it to a band that has to replace members (Queen vs Guns N Roses vs Beach Boys[Mike love?]...still can play classics, but his new stuff doesn't seem to be doing too well...)
    - How have these changes impacted their ability to function?
    - How have these changes impacted the music they make or the audience they appeal to?
    - Are these changes net positives? Why not just start a new band? What linger impacts of the "old" roster have stuck around that the group might benefit if they had a new "big bang"?
- It's less desirable to go see Hamilton without Lin Manuel Miranda, but people still go to see it!
    - Something about a star player?
- Or is a company more like a sports team?
    - Sure, there're names that are synonymous with certain franchises, but all careers must come to an end.

### When is it better to scrap it and start anew?

### Why does this matter?

Lol, it doesn't. I'm simply writing this to entertain myself.
