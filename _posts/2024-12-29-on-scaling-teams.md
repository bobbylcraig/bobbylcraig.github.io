---
layout: post
title: >
  On scaling teams
author: Bobby Craig
published: true
---

When a project starts slipping behind, the instinct is to react fast. The team’s stretched thin, the clock’s ticking, and you’re looking for a quick fix. Enter the classic solution: adding more people. But if you've been in the trenches long enough, you might already know that this move often backfires. Fred Brooks, in The Mythical Man-Month, captured this paradox perfectly:

>"Adding manpower to a late software project makes it later."

It’s a tough pill to swallow, but one that’s rooted in the messy reality of collaboration, deadlines, and the complexities that arise when you try to scale up too quickly.

## Why Does Brooks’ Law Hold True?

At its core, Brooks’ Law is about the inherent complexity of collaboration. When you add new people to a project, you’re not just increasing the number of hands on deck; you’re increasing the number of communication channels, onboarding tasks, and potential misunderstandings. 

Consider this example: You’re hosting a dinner party for six people. Halfway through cooking, you realize you’re running out of time. So, you invite three more friends over to help. Suddenly, your kitchen is packed, everyone’s asking where the spatula is, and someone insists on making an artisanal salad instead of sticking to your plan. Instead of speeding things up, you’ve turned your cooking into a logistical nightmare.

In software development, the dynamics are similar. New team members need to be brought up to speed on the project, which takes time and pulls existing team members away from their work. A s[tudy by Dr. Laurie Williams and colleagues at North Carolina State University](https://archive.org/details/pairprogrammingi0000will) found that onboarding a new developer can take anywhere from two weeks to several months, depending on the complexity of the project.

There’s also the challenge of splitting tasks. Some work simply doesn’t parallelize well. You can’t have nine women produce a baby in one month, as Brooks famously quipped. Similarly, you can’t have nine developers write a single, cohesive feature without significant coordination.

## When Is Adding People Worth It?

To be fair, Brooks’ Law isn’t an ironclad rule. Adding people *can* work under certain conditions:

1. **Early in the Project:** When the team is still ramping up, there’s more time for new members to integrate and contribute meaningfully. A survey by VersionOne found that agile teams with early-stage scaling are more effective at integrating new members[^1].
   
2. **With Clear Divisions of Work:** If tasks can be cleanly separated and assigned, new members can contribute with minimal disruption.
   
3. **In Non-Critical Roles:** Bringing in support for documentation, testing, or other peripheral tasks can free up the core team to focus on critical work. [Data from Orange Lead Consulting](https://orangeleafconsulting.com/delegation-dilemma/) suggest that peripheral task delegation reduces core team burnout signicantly.

But if your project is already behind schedule and your tasks resemble a tangled plate of spaghetti code? Adding more people is like handing everyone another fork. Good luck with that.

## Lessons Learned (the Hard Way)

I’ll admit, I’ve fallen into the "just add more people" trap before. I was working on a high-stakes project that was slipping through our fingers. The team was stretched thin, and the pressure was mounting. Our solution? Bring in a few contractors.

What followed was two weeks of chaos. We spent more time explaining the project than working on it. The new developers—through no fault of their own—introduced bugs that, frankly, are still being discovered. And by the time they were fully ramped up, the deadline had passed and the main team just had to pull long hours to meet it (WHICH I DO NOT RECOMMEND).

The irony? Those new developers ended up being fantastic contributors—*after* the deadline and *after* building context in less high-stakes environments. Once the pressure was off, they had the space to learn, innovate, and improve the project. But in the heat of the moment, their addition only made things worse.

## The Takeaway

Brooks’ Law is a reminder that effort doesn’t scale linearly. In fact, sometimes less is more. Instead of throwing more people at a late project, consider other strategies: prioritizing ruthlessly, cutting scope, or improving processes. As counterintuitive as it may seem, slowing down to focus can often get you to the finish line faster than speeding up.

So, the next time someone suggests adding more people to a late project, remember Brooks’ Law. Then politely suggest they read *The Mythical Man-Month.* Or, if they’re more of a hands-on learner, invite them to your next chaotic dinner party.

---

### References:

[^1]: VersionOne. (2022). "State of Agile Report."