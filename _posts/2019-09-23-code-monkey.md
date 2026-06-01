---
layout: post
title: "Code Monkey"
date: 2019-09-23
description: You can invert a binary tree on a whiteboard. Great. Can you talk to a product manager?
published: true
---

I work at Mailchimp (we're hiring 😉) and I get the "code monkey" thing from developer friends at bigger companies. Always lighthearted, never malicious, but it sticks in a weird way. Like... I know you're joking, but also I spent last Tuesday trying to explain to a product manager why the "simple" thing she wants requires touching three services and a table that predates my employment. Not exactly bananas-and-keyboard-mashing territory.

I have implemented breadth-first search and depth-first search so many times for LeetCode that I could probably write them on a whiteboard while blindfolded. And yet, in my actual day job... where I work on automation infrastructure that runs DAG-based workflows... I have written a graph traversal from scratch exactly once. It became a helper function. We haven't touched it since.

We spend months grinding through dynamic programming puzzles and reversing linked lists (seriously, when was the last time you used a linked list in production?) just to prove we're not those code monkeys. Meanwhile, most of my actual week is stuff LeetCode will never touch: figuring out why unrelated tests are failing, helping a newer engineer think through a design they're stuck on, negotiating scope with product when the ask doesn't match the timeline, or trying to explain to someone why "just add a toggle" touches more surfaces than anyone expects. The stuff that makes you question your career choices at 4pm on a Thursday.

The interviews test whether you can solve a puzzle under time pressure while someone who clearly doesn't want to be interviewing you stares blankly from across the table (ugh). The job tests whether you can sit in a room with a product manager, a designer, and a skeptical director and explain... in human words... why the thing they want will take longer than they think, why the shortcut will bite us in three months, and no, we can't "just cache it." Those are different skills. The Venn diagram overlap is not huge.

The "code monkey" stereotype gets the causality backwards, too. The bad engineers I've worked with weren't bad because they couldn't code. They were bad because they couldn't communicate: couldn't explain a tradeoff without retreating into jargon, couldn't push back on a bad requirement without making it personal, couldn't sit through a cross-team meeting without making everyone else in the room feel stupid. The industry loves to mythologize the eccentric genius who's "difficult but brilliant"... the supposed 10x engineer. In my experience, that person is a net negative. They write code nobody else can touch, they make junior engineers afraid to ask questions, and they treat collaboration like it's beneath them. The team gets slower, not faster. That's not 10x. That's negative-3x with a PR count that looks impressive on paper.

I have a coworker who recently shipped a feature that worked perfectly in isolation and then knocked over a downstream service because he'd never talked to the team that owned it. Didn't check the contract, didn't ask about rate limits, didn't read the runbook. The fix took a week. The conversation that would've prevented it would've taken twenty minutes. That gap... between "can solve the problem" and "can figure out which problem to solve, who else it affects, and whether it should even exist"... is where most of the actual work lives.

Nobody interviews you on the stuff that fills your calendar: should this job exist, who owns it when it fails, what happens if we run it twice, and which undocumented table is it quietly depending on. Your LeetCode score has no opinion on any of this.

The best engineers I work with... at Mailchimp and before... are rarely the ones who can solve a hard problem fastest. They're the ones who can figure out which problem matters, explain why without putting everyone to sleep, and then write code boring enough that the next person can maintain it without a Rosetta Stone. That's not a code monkey. That's the whole job. We just interview for the wrong parts of it.
