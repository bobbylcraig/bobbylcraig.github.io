---
layout: post
title: >
  On clever code
updated_at: Dec 29, 2024
author: Bobby Craig
published: true
---

In software engineering, there's a seductive trap that catches even the most seasoned developers: the allure of clever code. You know the kind... the byzantine one-liner that replaces a hundred lines of procedural code, the perfectly-crafted regex that parses your entire data format, or the finely-tuned algorithm that makes your benchmarks sing. These clever solutions feel like victories, tiny monuments to our mastery of the craft. But like all things that glitter, clever code extracts a price—usually one we can't afford to pay.

### The Economics of Code Maintenance

Every line of code is a long-term investment, often a liability that grows with its complexity. It's a widely accepted industry observation that developers spend a disproportionate amount of their time (far more than they spend writing new code) on reading, understanding, and navigating existing codebases. The more intricate or "clever" your code, the steeper this ongoing cost of comprehension becomes.

Consider a real-world example from the world of finance. In 1987, [a software bug in the Vancouver Stock Exchange's trading system triggered a market crash](https://www.cio.com/article/274523/it-organization-remembering-black-monday-when-computers-traded-too-many-stocks-and-wall-street-cras.html). The bug, a result of a "clever" but poorly tested optimization, caused the system to miscalculate stock prices, leading to a cascade of sell orders and ultimately shutting down trading.

### The Cognitive Load Problem

Clever code creates what [cognitive scientists call "extraneous cognitive load"](https://rpeszek.github.io/posts/2022-08-30-code-cognitiveload.html)—mental effort that doesn't contribute to understanding the underlying problem. When you write:

```python
result = {x['id']: x for x in data if any(k in x['tags'] for k in filters)}
```

Instead of:

```python
result = {}
for item in data:
    for tag in item['tags']:
        if tag in filters:
            result[item['id']] = item
            break
```

You're trading keystrokes for cognitive overhead. Complex code is like using an obscure word because it "fits more closely" to what you mean. Sure, "sesquipedalian" might perfectly describe someone prone to using long words, but if your audience has to stop and look it up, 1) you're going to look like a pretentious ass, and 2) you've lost more than you gained. In coding, as in language, clarity and approachability is often more valuable than "cleverness"".

### When Cleverness Is Warranted

There are legitimate cases for clever code. In performance-critical paths where every microsecond matters, or in core algorithms where mathematical elegance translates to provable correctness, cleverness might be the right tool. But these cases are rarer than we like to admit.

1. Implement the simple solution first, then...
2. The obvious optimization, and only then...
3. Consider clever alternatives—and only if you have metrics proving you need them

Kernighan's law applies here...

>Everyone knows that debugging is twice as hard as writing a program in the first place. So if you're as clever as you can be when you write it, how will you ever debug it?

### The Value Proposition of Simplicity

Simplicity scales in ways that cleverness cannot. Simple code:
- Reduces the time needed for code reviews
- Decreases defect density by making edge cases more visible
- Lowers the barrier to entry for new team members
- Is self-documenting
- Makes testing and verification more straightforward

### A Framework for Decision-Making

Before implementing a clever solution, ask yourself:

1. Can someone understand this code without understanding the clever trick it employs?
2. Will this code's behavior be predictable under stress?
3. Does this solution introduce hidden coupling or assumptions?
4. Would I be comfortable debugging this at 3 AM during an outage?

If you answer "no" to any of these, reconsider your approach.

### Conclusion

The best code isn't the cleverest... it's the code that disappears into the background, quietly and reliably doing its job. As Robert C. Martin puts it in "Clean Code":

>"Indeed, the ratio of time spent reading versus writing is well over 10 to 1. We are constantly reading old code as part of the effort to write new code. [Therefore,] making it easy to read makes it easier to write."

Save your brilliance for the problems that truly demand it. For everything else, embrace the understated elegance of simplicity. Your future self—and your teammates—will thank you.