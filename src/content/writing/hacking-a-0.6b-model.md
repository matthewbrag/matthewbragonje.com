---
title: "Hacking better answers out of a 0.6B model"
pubDate: 'Jun 11 2026'
tags: ['Machine Learning']
description: "Exploration of a novel method of improving the performance of an 0.6B model without retraining"
---

I'm Very interested in how we can make models smarter, and since I don't have thousands or millions of dollars in compute to throw at experiments, I have to try to get resourceful. This is a documentation of an interesting experiment I ran to see if I could squeeze better performance out of a 0.6B model, something that was pretty practical for me to play with on my own hardware. 

I started by trying to get the model to fail, which didn't take too long. I asked it a classic. "In a race you pass the person in 2nd place, what place are you in?" It said "first." Rookie mistake! How could I sway the model to be right? I could give it a rule "If you pass someone in a race, you take their old position." That works, but what about scaling? Would I have to give it rules for every new problem I wanted to solve? That's pretty impractical. 

Thats where I had a weird idea. What if we prepend some noise to the model, (in it's vector space) and then use gradients to optimize that noise so that it pushes the model in the right direction? 

[should put some cool looking math here lol??]

And right away it worked, obviously. I was able to give the model 8 "tokens" of information, and it swayed it to get the right answer. That makes sense, you can figure out a set of inputs that change a neural net output. I later learned that this is called a "soft prompt", basically a learned prompt, that doesn't have a real exact token meaning. What was more exciting was I did see some signs of generalization! I prepended the soft prompt I just learned, and then it was able to solve the same passing problem for any race position (up to 23rd place).

With that early success I wanted to see if I could learn the shortcomings of a given problem type, learn a soft prompt, and then generalize to new problems. Even narrow generalization would be interesting, since you can derive the soft prompt from the answer. I figured that the GSM8K dataset would be good, it's several thousand elementary school level math problems. The model seems to have the underlying math capability, but it gets messed up on interpreting the problem, much like a real elemetary schooler.

I started learning the soft prompts for each problem in the train set, about 5 thousand total. I also trained a router, a model that would pick which soft prompt to use to solve a given problem. Here are the results of this run against the test set:

[table of results. Baseline, router]

Pretty terrible, but im getting ahead of myself, the router is a separate problem. I want to see if it's even possible to train soft prompts that make a model better at a given domain. So we can actually use an "oracle" basically, for a given problem do any of the learned soft prompts get us the correct answer? Here are those results: 

[baseline, router, oracle]

Nice! Significant improvement, and there's an obvious flaw. We are giving the model soft prompts, which are sort of randomly jiggling the output of the model, then selecting for the correct problem. Now I do think this is a valid strategy in theory, if you could identify a few soft prompts and verify the work against them or otherwise pick the best one. Fun quick tangent, that's potentially how human reasoning works, the brain generates canidate hypotheses and picks the best one [could remove this]. When we are talking thousands though, we need to account for "monkeys on keyboards", basically randomness introduced to an LLM can happen to point it in the right direction sometimes. I generated a random set of untrained soft prompts and used this as a more realistic baseline:

[baseline, random baseline, oracle]

This is an interesting result, the monkeys on keyboards effect is very strong, but the trained soft prompts still outperform it by a decent margin, about 13%. 

