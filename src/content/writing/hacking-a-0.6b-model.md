---
title: "Hacking better answers out of a 0.6B model"
pubDate: 'October 19 2026'
tags: ['Machine Learning', 'AI Research']
description: "Exploration of a novel method of improving the performance of an 0.6B model without touching weights"
---

I'm very interested in how we can make models smarter, and since I don't have thousands or millions of dollars in compute to throw at experiments, I have to try to get resourceful. This is a documentation of an interesting experiment I ran to see if I could squeeze better performance out of a 0.6B model, something that was pretty practical for me to play with on my own hardware. 

I started by trying to get the model to fail, which didn't take too long. I asked it a classic. "In a race you pass the person in 2nd place, what place are you in?" It said "first." Rookie mistake! How could I sway the model to be right? I could give it a rule "If you pass someone in a race, you take their old position." That works, but what about scaling? Would I have to give it rules for every new problem I wanted to solve? That's pretty impractical. 

Thats where I had a weird idea. What if we prepend some noise to the model, (in its vector space) and then use gradients to optimize that noise so that it pushes the model in the right direction? 

![Diagram: 8 learned trainable vectors plus fixed problem tokens feed into a frozen 0.6B language model, which produces a predicted answer that's compared against the training loss. Gradients update only the eight learned vectors, not the model's weights.](/soft-prompt-diagram.svg)

And right away it worked, obviously. I was able to give the model 8 "tokens" of information, and it swayed it to get the right answer. That makes sense, you can figure out a set of inputs that change a neural net output. I later learned that this is called a "soft prompt", basically a learned prompt, that doesn't have a real exact token meaning. What was more exciting was I did see some signs of generalization! I prepended the soft prompt I just learned, and then it was able to solve the same passing problem for any race position (tested up to 23rd place).

With that early success I wanted to see if I could learn the shortcomings of a given problem type, learn a soft prompt, and then generalize to new problems. Even narrow generalization would be interesting, since you can derive the soft prompt from the answer. I figured that the GSM8K dataset would be good, it's several thousand elementary school level math problems. The model seems to have the underlying math capability, but it gets messed up on interpreting the problem, much like a real elementary schooler.

I started learning the soft prompts for each problem in the train set, 5,858 total. I also trained a router, a model that would pick which soft prompt to use to solve a given problem. Here are the results of this run against the test set:

| Method   | Accuracy |
|----------|----------|
| Baseline | 20.9%    |
| Router   | 19.0%    |

Pretty terrible, but im getting ahead of myself, the router is a separate problem. I want to see if it's even possible to train soft prompts that make a model better at a given domain. So we can actually use an "oracle" basically, for a given problem do any of the learned soft prompts get us the correct answer? Here are those results: 

| Method   | Accuracy |
|----------|----------|
| Baseline | 20.9%    |
| Router   | 19.0%    |
| Oracle   | 88%      |

Nice! Significant improvement, and there's an obvious flaw. We are giving the model soft prompts, which are sort of randomly jiggling the output of the model, then selecting for the correct problem. Now I do think this is a valid strategy in theory, if you could identify a few soft prompts and verify the work against them or otherwise pick the best one. When we are talking thousands though, we need to account for "monkeys on keyboards", basically randomness introduced to an LLM can happen to point it in the right direction sometimes. I generated a random set of untrained soft prompts and used this as a more realistic baseline:

| Method         | Accuracy |
|----------------|----------|
| Baseline       | 20.9%    |
| Random (null)  | 75%      |
| Oracle (train) | 88%      |

This is an interesting result, the monkeys on keyboards effect is very strong, but the trained soft prompts still outperform it by a decent margin, 13 percentage points. 

The next attempt was to train a smaller number of soft prompts, 100 to be exact. I randomly divided 2,000 training problems into groups of 20, then independently trained an eight-token soft prompt on each group. I wanted to see whether learning from multiple problems would encourage generalization to unseen ones, even without explicitly grouping similar problems together. These are the results:

| Method                  | Accuracy |
|-------------------------|----------|
| Baseline                | 20.9%    |
| Random (100 latents)    | 25.7%    |
| Oracle (100 specialists)| 33.6%    |

Not terrible, almost 8% improvement above random sampling, performance did decrease however, and I didn't hit any generalization I had wished for. 

I suspect the absolute numbers are hiding something more interesting: if we think about the "efficiency" of each prompt, roughly how many percentage points of accuracy each additional prompt buys you, the picture looks something like this:

| Run          | m prompts (trained) | Δ accuracy vs. random (pp) | Efficiency (pp / prompt) |
|--------------|----------------------|------------------------------|-----------------------------|
| 100-prompt   | 100                  | 7.9                          | 0.079                       |
| 5,858-prompt | 5,858                | 13.0                         | 0.0022                      |

Per prompt, the 100-prompt run was about 36x more efficient than the 5,858-prompt run, even though it was worse in absolute terms. This suggests there might be diminishing returns as we add more prompts, although two experiments aren't enough to establish that. It does make me wonder whether we could be smarter about which problems each new prompt learns to solve.

A few things I'd like to try are trying to train a proper router, more explicit grouping and learning soft prompts among groups, and another interesting one, take advantage of the efficency structure to (maybe) learn the prompts quickly or with more structure. I'm thinking, solve the most promts with a soft prompt, eliminate the solved ones, repeat. Then the harder ones should in theory get more dedication, and training on an unsolved type should speed up as you eliminate solved problems. 

I had to stop myself from going further on this so I could pivot in a new direction, this seems to have spawned a million new ones, but I wouldn't say that learning soft prompts is a total dead end for improving model performance. I tested the model a bit, it has the raw math capability and some ability to interpret text, so it's interesting to see how much of that we could unlock without retraining. Of course today this is far from practically improving the performance of this 0.6B model. 
