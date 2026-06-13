---
layout: post
title: "Weinbergisms"
author: Bobby Craig
published: true
description: A text analysis of 59 of President Adam Weinberg's published writings — the phrases he reaches for again and again, and the thinkers behind them.
viz: true
---

<aside class="note" role="note">⚠️ This post was originally published on <a href="https://onetwentyseven.blog/2017/12/01/weinbergisms/">OneTwentySeven</a>, my university's data blog. The figures below are rebuilt as live charts from the original analysis.</aside>

A figure of stability, wisdom, and optimism on our campus, President Weinberg has now been at Denison for five years. In this time, Denison has broken ground on the Eisner Center, admissions and ratings have steadily improved, and a promise to the liberal arts has been renewed and never felt so strong. Weinberg's presence is felt very strongly on this campus, his impact on student participation and involvement has been noticed, and his words and phrases––Weinbergisms––about "silos" and "relationships run[ning] deep at Denison" have become iconic in the eyes of students. However, several questions must be asked. How rooted in passion and sincerity are these phrases? Are they a formulaic, calculated way to appeal to current and prospective students…or is this repetition simply a rhetorical tool to emphasize a point that Weinberg is deeply passionate about? To unpack this, I want to talk about three things.

**First**, I want to be very clear––I don't have data from any of Weinberg's speeches. Instead, I collected 59 writings from Weinberg during his tenure as president of Denison.[^1] Therefore, it must be acknowledged that this information is far from comprehensive. When writing you have the luxury of careful word choice and organization. In speaking, it's common to fall back on familiar phrases, so it could be assumed that the thoughts are a bit more organic and originally structured.

**Second**, in these published speeches we'll be looking at _collocations_ of words – words that appear close to each other (warning, slightly technical information…skip to next paragraph if you don't care how things are calculated). However, there are oftentimes words that appear close to each other that also appear close to other words. For example, "the man that" and "the man was" are probably equally likely to appear. Conversely, if I say "baby got", it's highly likely that the word following will be "back". This is, in essence, pointwise mutual information (PMI), the way we'll be sorting our collocations.[^2] If there's a high PMI, the combination of words almost uniquely appears and each word occurs in few other combinations in the text. Read more about it if you're interested!

**Third** (yes, I just wanted to use three points because Weinberg often does this), let's get to the data.

<div class="cx cx-fig" data-chart="collocations" data-src="/assets/data/2017-12-01-weinbergisms/weinberg.json"></div>

A cursory look at Figure 1 reveals some very familiar phrases. It's no wonder that "discerning moral agents" and "close mentoring relationships" show up in this list of Weinberg's most common phrases. It probably doesn't surprise you that topics such as the Austin E. Knowlton Center, Gallup-Purdue Index, and Columbus metropolitan region are among Weinberg's most discussed––they're great recruiting topics and/or strategic agenda items that Weinberg has taken on. But why might he mention something like "lost almost 300 games"?

> _I've missed more than 9,000 shots in my career. I've lost almost 300 games. Twenty six times I've been trusted to take the game winning shot and missed. I've failed over and over and over again in my life. And that is why I succeed._
>
> — Michael Jordan

Weinberg loves this quote…and rightly so. College is a great time to learn about failure and with these few words Michael Jordan destigmatizes the subject. This is where the number one phrase comes from. Weinberg uses this quote in four different articles, each giving students advice and urging them to embrace failure as a natural part of growth. This quote isn't the only one that he loves. Denison's president repeatedly uses quotes from Dan Chambliss, Christopher Takacs, William Cronon, Harry Boyte, and Alexis de Tocqueville (see Figure 2). This tells us a lot about his philosophy. These authors all write about relationships and/or the liberal arts in some way, and they're likely the driving force behind Weinberg's decisions on campus. Wanna predict Weinberg's next moves? Reading some of these authors' works might give you a leg up.

<div class="cx cx-fig" data-chart="crew" data-src="/assets/data/2017-12-01-weinbergisms/weinberg.json"></div>

Another phrase in the top 20 that surprised me was the appearance of "executive order". The phrase can only be found in one article, but is used heavily in that article. Not all of Weinberg's articles can be cheery PR-fodder for Denison; he also needs to address issues which have a great deal of impact on students. For example, look at how Weinberg responded to President Trump's DACA executive order which looked to deport many innocent, unassuming people from the country. Many saw this as antithetical to Denison's values, and Weinberg responded to let students know that they had Denison's support.

**Let me end** (heh, another Weinbergism) by acknowledging Weinberg's ability to turn a phrase. "Weave disparate ideas into new ways of thinking," he says in one article. "Tap into your sense of wonder and your creativity," in another. However, those sentences along with many other pithy phrases are repeated in a number of articles. It's undeniable that Weinberg recycles bits and pieces of articles. This repetition suggests that Weinberg's message – a love for relationships, the liberal arts, and everything Denison – is either a calculated way to appeal to as many people as possible or the repetitive musings of an idealistic academic. While I can't comment on which I believe it to be (mostly because I'm not sure which I believe to be true), I find it comforting that he regularly tackles issues that students are concerned with and not all articles seem like Denison PR-fodder.

It's fascinating what data can tell us about people's tendencies. And hey, Weinberg's not the only one! I'm sure even _this very article_ has bits of repetition. We can use this knowledge to analyze the past and more accurately predict the future. Next time Weinberg publishes an article, take the phrases in Figure 1 and highlight all instances in the article. Count them and reflect. You may be surprised by how predictable phrases are.

---

[^1]: All data were pulled on October 30th, 2017. No data from after this period are reflected in this analysis.
[^2]: To compare n-grams (phrases) of different length, PMIs were divided by the length of the n-gram to result in the PMI score shown in the table. Only bigrams, trigrams, and quadgrams were included in the table. Further, all mentions of names (typically in reference to authors) were removed from the table to produce more topic-based results.

<script src="/assets/js/weinberg-charts.js" defer></script>
