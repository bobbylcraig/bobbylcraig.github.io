---
layout: post
title: "On Scaling Teams"
date: 2024-12-29
description: Brooks' Law remains undefeated. Throwing people at a late project just makes it later.
published: true
---

The fastest way to make a late project later is to invite six helpful strangers into the codebase on a Monday morning and call it ✨ acceleration ✨.

I've been the person doing the explaining. I know where some of the bodies are buried. I've also been the one who buried a few... unrealistic deadline, tight scope, "we'll come back and clean this up" (we did not come back).

Fred Brooks called it in [*The Mythical Man-Month*](https://en.wikipedia.org/wiki/The_Mythical_Man-Month) almost fifty years ago: "Adding manpower to a late software project makes it later." Yes, I'm citing Brooks' Law in a blog post about team scaling. It's a cliché. It's a cliché that everyone in software has heard and nobody in management seems to have internalized, which is maybe the definition of a cliché that still needs saying.

The ramp doesn't happen in a vacuum. It happens at the expense of the people who already know what's going on. All of that context transfer... every "don't touch that," every "oh, that's not actually how it works"... comes out of the existing team's bandwidth. It's exhausting.

Communication overhead is the part that's hardest to see from the outside. Two people have one communication channel. Three have three. Ten have forty-five. Brooks did this math in the '70s and it hasn't gotten better. A former Mailchimp-Oakland engineer I massively respect, Coda Hale, wrote a piece called [*Work Is Work*](https://codahale.com/work-is-work/) that I think about constantly: coherence costs grow quadratically as you add people, even though your work capacity grows linearly at best. Coda was at Mailchimp for a few years before Intuit acquired and shut down the Oakland office, and I'm fairly sure he wrote it as a reaction to the organizational dynamics most of the ICs (including me!) there were dealing with at the time. Worth reading in full if you want the math behind why your twelve-person standup accomplishes nothing.

And it's not like Slack helps. Forty-five communication channels turns into forty-five threads, twelve of which are in channels nobody monitors, three of which contain decisions that'll surprise someone in two weeks, and fifteen backchannel DMs you may or may not be part of because who needs open communication anyway.

We had a project to build an AI-powered automation template. Internally we call these PBJs 🍞 (pre-built journeys... and yes, the acronym _and emoji use_ is real). The mandate came down from leadership, fully formed, without much input from the people who'd actually be writing the code. This is how it goes... someone three or four levels up decides it's a priority and it lands on your sprint board and now it's your problem.

The issue wasn't headcount. We had enough engineers. The issue was that everyone needed to write code in the same small part of the codebase at the same time, and the deadline was yesterday. An absurd amount of work for the timeline and the codespace. That's an organizational failure, not an engineering one. When you put that kind of critical mass on a tight area of code with a short fuse, people stop building within abstractions. They stop reading the existing patterns. They (or their AI IDE) just start throwing spaghetti at the wall. Of course they do. Nobody gave them the time to do it right.

Merge conflicts everywhere. Conditionals nesting inside conditionals. Someone accidentally reverts a change from a PR that merged two hours ago because there's no time to review properly and nobody can keep track of what landed where. You open a PR and it's 400 lines of diff across files that three other open PRs also touch and you just... stare at it. I'm fairly certain all of this tech debt still exists too.

By the time things stabilized, the deadline had passed and everyone was quietly exhausted. The people who'd been pulled onto the project ended up being solid contributors... *after* the pressure dropped, *after* they'd had time to build context organically. The ramp worked. It just didn't work on the timeline that mattered.

There are situations where adding people can help. Early in a project, when tasks split cleanly, when you're adding capacity for peripheral work that frees the core team. But those are almost never the conditions under which someone decides to "add headcount." By the time you're adding headcount in a panic the project is already behind and the tasks are already tangled.

Sometimes the right move when a project is late is to cut scope and protect the people who can fix it from the people who want to help. That's a hard sell in a room full of people who believe effort is fungible... or when you truly don't have a say in the deadline or scope and you're just set up for failure. But Brooks was right in 1975 and he's right now. You can't have nine women produce a baby in one month (his metaphor, not mine... and no, it hasn't aged well), but the underlying math hasn't changed. You can throw more people at it. Their time will be spent on everything except the thing that matters. The PBJ will not ship faster.
