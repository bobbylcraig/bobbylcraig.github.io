---
layout: post
title: "On Clever Code"
date: 2022-12-19
description: Code is a liability. Clever code is a tax you levy on your future self.
published: true
---

<aside class="note" role="note">⚠️ I realize this has been re-hashed time and time again. Please bear with past me.</aside>

I wrote a class once that handled bulk database upserts with optimistic locking. Inserts and updates in one query, concurrency control via MySQL session variables, column signature grouping so it could dynamically build different SQL shapes depending on which fields you were touching. I looked back on it a few months later and... while it was working... it was horrifically over-engineered and, to put it mildly, "a lot." The kind of code where every line is load-bearing and you feel briefly brilliant for having written it, right up until you need to change something and realize you've built a trap for yourself.

We needed to change the locking behavior, and I opened the file and could not follow my own logic. I'd used a MySQL session variable to count successful updates inside the `ON DUPLICATE KEY UPDATE` clause... because MySQL doesn't have `RETURNING`, so you can't just ask "hey, which rows did you actually touch?" like a normal database. You have to hack around it with session state. (Postgres people, I know. I KNOW.) The insert path and the update path were fused together in a way that made each one impossible to reason about without understanding the other. I had to trace through the whole thing end-to-end just to figure out where to add an `if` statement. The class was 500 lines, most of them doing real work, and I couldn't safely touch any of them.

It took... I want to say two follow-up PRs to untangle it, but that's generous. There was also an intermediate PR where I tried to make it smarter instead of simpler, adding a variance-based routing layer that decided whether to use direct SQL or the session-variable path depending on how similar the update patterns were. Which, yes, means I responded to "this is too complex" by adding a decision tree. There was an incident. I learned. Eventually someone (me, humbled) split inserts and updates into separate paths... `INSERT IGNORE` for new rows, plain `UPDATE` for existing ones. Boring. Obvious. The kind of code you'd write if you weren't trying to impress anyone. A later PR optimized the update path properly, once we had metrics showing it was actually slow, rather than pre-optimizing based on vibes. The end result was faster, easier to test, and significantly less clever. Everyone who touched it afterward could actually modify it without re-deriving the whole thing from scratch.

That original class wasn't wrong, exactly. It worked. The tests passed. But it was written at the limit of my own cleverness, which meant that debugging it required being *smarter* than the person who wrote it. And the person who had to debug it was also me, just dumber and with less context. Not a great setup.

Here's the thing. When you see something like this:

```javascript
const result = data.reduce((acc, { id, tags, ...rest }) =>
  (tags ?? []).some(t => filters.has(t))
    ? { ...acc, [id]: { id, tags, ...rest } }
    : acc,
  {}
);
```

And compare it to:

```javascript
const result = {};
for (const item of data) {
  if (!item.tags) continue;
  for (const tag of item.tags) {
    if (filters.has(tag)) {
      result[item.id] = item;
      break;
    }
  }
}
```

The first version isn't better. It's denser. And it's doing something subtly different with the spread that you might not catch on a first read (or a second one, honestly). You're saving keystrokes and spending cognitive overhead. It's like using the word "sesquipedalian" because it technically fits... yes, it means exactly what you want it to mean, and also nobody is going to thank you for using it. You're writing for the next reader, and the next reader is probably tired.

There's a whole conversation about [cognitive load in programming](https://rpeszek.github.io/posts/2022-08-30-code-cognitiveload.html) that gets into this more formally, but the short version is: every clever trick you embed in a line of code is a tax on every future reader of that line. Most of a developer's week... the actual time-on-task... goes to reading, searching, and re-learning existing code. Not writing new stuff. There was a [study out of Zhejiang University](https://dl.acm.org/doi/10.1145/3180155.3182538) that tracked professional developers and found they spend roughly 58% of their time just on program comprehension. Fifty-eight percent. Reading, not writing. So when you optimize for writing speed at the expense of reading speed, you're making the majority of the work harder. Great job, you.

Brian Kernighan put it bluntly in *The Elements of Programming Style*:

> Everyone knows that debugging is twice as hard as writing a program in the first place. So if you're as clever as you can be when you write it, how will you ever debug it?

That quote is from 1978. We still ignore it, because clever code feels *sexy*. It makes us feel smart. It's not engineering, it's ego. The goal isn't to write code that impresses the next reader... it's to write code that the next reader doesn't have to think about. But boring code feels like giving up, so we keep building little monuments to our own cleverness and calling it architecture.

Sandi Metz has a line I think about a lot: ["duplication is far cheaper than the wrong abstraction."](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) This one is interesting because it cuts against stuff we treat as gospel. DRY, KISS, YAGNI... we learn these as laws, engrave them on our laptops, and then never stop to notice that they contradict each other all the time. DRY says don't repeat yourself, but Metz says the wrong abstraction (which you built *because* of DRY) is worse than the duplication it replaced. KISS says keep it simple, but "simple" is subjective and the person who wrote the clever version almost always thinks it's simpler. These aren't laws. They're heuristics, and heuristics conflict. The clever abstraction isn't just hard to read... it's hard to escape. Once it exists, people build on top of it, pass parameters into it, add conditionals to handle cases it was never designed for. My upsert class was exactly this. It started as one clean idea and calcified into a thing that nobody could modify without understanding the whole thing. The fix was to inline it back into boring, duplicated paths and let the simplicity do the work.

Every line of code is a future liability. The person who has to maintain your code (which is usually just you, six months older and significantly more tired) doesn't care about your elegance. They care about whether they can find the broken line without reading the whole file. They care about whether the error message actually tells them what went wrong or just says `Undefined index` and leaves them to reconstruct the state machine from context clues.

Now... are there cases where cleverness is warranted? Sure. Performance-critical hot paths. The inner loop of something that runs a million times a second. But those cases are rarer than we want to admit, and even then, the clever code should come *after* the simple version works, *after* you have metrics proving you need the optimization, and with comments explaining what the clever version does and why. My bulk upsert class would've been fine as two simple queries from day one. I made it one query because I could, not because I had to.

Dan McKinley, who I was lucky enough to work with at Mailchimp, has a [talk called "Choose Boring Technology"](https://boringtechnology.club/) that I've internalized more than I probably realize. His point is about technology choices at the organizational level... don't adopt Cassandra because it's exciting, use Postgres because you already know how it fails... but the principle scales down to individual lines of code. Boring is well-understood. Boring has known failure modes. Boring is what lets you focus on the actual problem instead of re-learning your own infrastructure every time something breaks.

The next person to touch your code doesn't need your abstraction to be elegant. They need to find the line that's wrong, understand why it's wrong, and fix it without breaking something else. That's it.

Write boring code.
