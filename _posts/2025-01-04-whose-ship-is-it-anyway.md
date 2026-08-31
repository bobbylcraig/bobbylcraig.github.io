---
layout: post
title: "Whose Ship Is It Anyway?"
date: 2025-01-04
description: Your feature got carved into three microservices. At least one has a name from a two-hour naming meeting.
published: true
---

In college, I played a political simulation game where I was a stonemason in Ancient Greece named Lithicles of Scambonidae. I spent most of my time securing lucrative contracts to rebuild the walls of Athens, while also making "Build the Wall" jokes (🤦🏻‍♂️) and quietly plotting to overthrow the government. The Athenians tried to ostracize me and narrowly failed. Democracy crumbled soon after, replaced by a dictator who wasn't me. So much for civic resilience (I'm sure that kind of thing never actually happens).

I've been thinking about Lithicles recently because of the Ship of Theseus... the old thought experiment about whether a ship whose every plank has been replaced is still the same ship. Back in the simulation, I'd used it as rhetorical flair to justify rebuilding Athens' walls. A few years later, the metaphor hit differently. Not because I sat down one day and had some profound realization... more because I watched it happen in slow motion and only recently connected the dots.

[Intuit acquired Mailchimp for $12 billion](https://mailchimp.com/newsroom/intuit-completes-mailchimp-acquisition/) in 2021. I wasn't thinking about Greek thought experiments at the time. But as Intuit chipped away at bits and pieces of what Mailchimp was... replacing plank after plank... I started wondering how many you can swap out before the ship isn't the same ship anymore. And whether that even matters.

Mailchimp was, in a lot of ways, a genuinely weird company. Founded in 2001, bootstrapped the entire way, no board of directors (though there WAS a [board room](https://www.heraldtribune.com/story/business/briefs/2016/10/10/path-to-tech-success-far-from-silicon-valley/25233849007/)... walls covered floor-to-ceiling in vintage skateboards that Dan collected):

<blockquote class="twitter-tweet" data-dnt="true"><p lang="en" dir="ltr">Visiting <a href="https://twitter.com/Mailchimp?ref_src=twsrc%5Etfw">@Mailchimp</a> HQ and I found where they keep all the good boards <a href="https://t.co/mz5K9xgCpZ">pic.twitter.com/mz5K9xgCpZ</a></p>&mdash; Tony Hawk (@tonyhawk) <a href="https://twitter.com/tonyhawk/status/974708239911804928?ref_src=twsrc%5Etfw">March 16, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

No investors to please, so we could plan more than one quarter ahead. When I joined in 2017, the independence was tangible. People were heavily invested in the company, the brand, the customers. We weren't always great at serving large customers who'd outgrown us (I'm pretty sure Ben once just told a company that had outgrown Mandrill to go find another transactional email provider) but the people who built the product genuinely cared about the small businesses using it. Things were lax. The vibe was quirky. It was occasionally chaotic. But it was ours. We launched a marketing CRM, a website builder, and at one point we were [sending physical postcards](https://www.modernostrategies.com/blog/mailchimp-direct-mail-postcards-first-look/)... yes, actual paper postcards in the mail.

Then Intuit showed up. Suddenly we were part of a $150B company. Process after process changed. Then [Ben stepped down](https://mailchimp.com/newsroom/message-from-ben-chestnut-2022/). Then Intuit started talking about incorporating Mailchimp features into QuickBooks. Mailchimp's offbeat humor got tempered to fit a more "corporate" brand. Decisions that once took hours now required weeks of cross-departmental approvals, and my calendar quietly filled up with meetings that didn't exist six months prior. And then, of course, [the layoffs](https://www.intuit.com/blog/news-social/investing-in-our-future/). Teams expanded in some areas and evaporated in others.

Were these changes bad? Some of them, sure. But Intuit brought a more mature technical foundation and genuinely smart people to help out. It just didn't look like the thing I'd joined.

The weirdest part wasn't the logistics of the change. It was watching how people responded to it. Some colleagues were thrilled... more resources, bigger scope, a real career ladder. Some felt the thing they'd signed up for had quietly become something else, and left for scrappier places. A lot of us landed somewhere in the middle: nostalgic and curious at the same time, not sure whether we were watching an evolution or an ending. I think I'm still figuring that one out.

Those conversations always came back to values. Mailchimp's identity wasn't really about the tools or the tech stack. It was about serving small businesses and being a little odd about it. Intuit's slogan is "Powering prosperity around the world," which... sure. I guess accounting software is prosperity-adjacent. But the scale is obviously different. Where Mailchimp's founders could personally champion a vision, Intuit has to implement it across 17,000 employees. Same direction, maybe. Very different ship.

So what actually defines the ship? It's not the product. Klaviyo, Constant Contact, ActiveCampaign... they all do roughly similar things, but none of them are Mailchimp. You can't point at a feature list and say "ah yes, that's the identity." And it's not the code... though I suppose you could argue that as long as you're still running your in-house proprietary PHP MVC framework, it's definitely still the same ship. (Please don't think too hard about that one.)

Maybe it's the ownership. This thing was founded and bootstrapped by specific people who made specific bets. Then it was purchased. Then pieces of it got carved up and distributed across an org chart that didn't exist a year ago. When domain boundaries get redrawn by people who weren't there when the domains were invented, the question stops being "is this still the same ship" and starts being "whose ship is it, exactly?"

This isn't just an acquisition thing. In the early days at any growing tech company, you own a feature end-to-end. You designed the tables, wrote the API, wired up the frontend. It is *your* ship. But as the org scales, it gets broken up. The frontend goes to a UI team. The database gets a dedicated team. Your feature gets carved into three microservices only two of which are owned by your team.

At what point is it no longer the thing you built?

Ownership at scale is mostly janitorial. You write down the invariants nobody remembers. You notice the alert is still paging the team that set it up two years ago instead of the team that actually owns the service now, and you fix the routing. You find an internal API that three squads depend on but nobody lists in their on-call runbook, and you make someone claim it before it breaks at 2 AM on a Saturday. You delete the Slack channel where discussions are no longer had despite the very-important-sounding name. It's not glamorous. It's barely visible.

Your piece of the ship gets smaller as the crew gets bigger. That's fine. You helped build it.
