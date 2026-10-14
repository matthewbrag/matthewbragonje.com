---
title: "Hacking better answers out of a 0.6B model"
pubDate: 'Jun 11 2026'
tags: ['Machine Learning']
description: "Exploration of a novel method of improving the performance of an 0.6B model without retraining"
---

I'm Very interested in how we can make models smarter, and since I don't have thousands or millions of dollars in compute to throw at experiments, I have to try to get resourceful. This is a documentation of an interesting experiment I ran to see if I could squeeze better performance out of a 0.6B model, something that was pretty practical for me to play with on my own hardware. 

I started by trying to get the model to fail, which didn't take too long. I asked it a classic. "In a race you pass the person in 2nd place, what place are you in?" It said "first." Rookie mistake! How could I sway the model to be right? I could give it a rule "If you pass someone in a race, you take their old position." That works, but what about scaling? Would I have to give it rules for every new problem I wanted to solve? That's pretty impractical. 

Thats where I had a weird idea. What if we prepend some noise to the model, (in it's vector space) and then use gradients to optimize that noise so that it pushes the model in the right direction? 

[should put some math here lol??]

And right away it worked, obviously. I was able to give the model 8 "tokens" of information, and it swayed it to get the right answer. That makes sense, you can figure out a set of inputs that change a neural net output. I later learned that this is called a "soft prompt" What was more exciting was I did see some signs of generalization! I prepended the soft prompt I just learned, and then it was able to solve it for any race position, even 23rd place!

