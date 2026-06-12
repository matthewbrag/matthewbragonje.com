---
title: "Good Models Aren't Enough"
pubDate: 'Jun 11 2026'
tags: ['Machine Learning']
description: "My experience taking a machine learning project from idea to production"
---

A few months ago, I became interested in applying machine learning (ML) at work. I expected the challenge to be technical: find a promising business problem, build an accurate model, present results, and watch the organization adopt it.

I was wrong.

The hardest problems turned out to be organizational: determining a useful project, minimizing risk, and earning trust. The process of going from “use ML for something cool” to “get an ML project deployed” was much more winding than I expected.

This is the story of how I started to understand what it takes to get real projects adopted.

## Looking for a New Challenge

I have spent the last four years working as a software engineer. Most of my work is backend systems, data pipelines, infrastructure, and internal tools. I enjoy the work and have learned an enormous amount from it, but I found myself drawn to problems that involved modeling, optimization, prediction, and uncertainty.

At the time, machine learning wasn't part of my role, so pursuing an ML project meant learning a new domain and building relationships outside my team.

More than anything, I missed being a beginner at something, and I wanted to work on something substantial.

In a meeting with the COO of the company, I mentioned that I had some ideas that I thought could really help the company. He encouraged me to collaborate with coworkers outside my development team: marketers, data analysts, and our senior data scientist, David. I pitched the general idea of using machine learning at lunch, but there was skepticism both about whether it could improve prediction and whether anyone would support turning it into a production system. Regardless, several people helped point me in the right direction of the company data warehouse, and helped me get started.

## Early Models and Early Mistakes

Without too much idea of how the business actually worked, I came up with what I thought would be an interesting thesis for a model: “Which parts of our inventory generated the highest conversion rate?” I pulled data, trained some tree models, and got some amazingly accurate performance metrics. I showed David my first results.

Already there were some problems. I used a few variables that were averages over time, but this let the model cheat since it could see diluted information from the future. David pointed me in the direction of using a time-based (temporal) split, and making sure there weren’t any leaky features. Ultimately after fixing all of the issues my demo model had, I had much poorer, but clean and seemingly interesting results. David and a product manager had the same reaction: “This is interesting, but how is it useful?” Understanding that this was nothing groundbreaking, I asked about what would be useful to model. They suggested trying to predict revenue per conversion.

I was able to quickly outperform the production baseline at the new modeling task. Learning and experimenting rapidly, I was even able to borrow a few ideas from a signal processing class I had taken in college, creating features that helped the model capture changing market behavior. In a loop of intellectual stimulation, I got addicted to making my models more and more accurate, but I was still without a clear goal and end use case.

## “How is this useful?”

Despite my models being a lot of fun to develop and initial interest in the direction, there weren’t really any immediate applications. It turns out that ad platforms already optimize and predict conversion value and conversion rate heavily. In many ways my conversion value project was redundant for modern advertising.

Now, this whole time, even when I had originally pitched machine learning to my coworkers, David had been pushing what he had identified as a strategic project. The company uses an alert system to monitor various things, but it is very noisy, and David had discovered that one department had spent a significant amount of time dismissing alerts that had no actionable outcome. He suggested that I train a model that would predict which alerts were noise and which were actionable.

After I shared some results more broadly with the company, we sat in my office. Again, he asked me “This is great, but how is this useful? How is the company going to use this to make money?” By this point my technical ML skills had improved, but so had my ambition. I immediately jumped to a larger idea “This is just a part of a bigger system - a bid optimizer, we can build out the rest of the components if we predict a few other variables and start to share predictions and metrics as useful indicators right now.” David responded “I agree that is a great end goal, but it is going to be a very difficult project and will require significant buy-in from management.”

I kept wanting to work on a bid optimizer, and I was skeptical of the alert project for a few reasons. An optimizer felt like a foundational and financially lucrative improvement while the alert project felt like a workaround. Why not just replace the downstream alert logic with something smarter? What about the noise? I would be trying to learn a pattern from human decisions that weren’t very consistent to begin with. I wanted to jump right into the ambitious project, but with much patience, David was eventually able to convince me to adjust my sights.

## Development Challenges

With a focal point set on the alert project, David and I coordinated with the necessary managers, presented a project outline, and set some target metrics for predicting alert actionability. He also integrated me into a data science committee so that I would have easy access to the people who would be interacting with the alert model.

With the project and scope well-defined, I finally set out to build my model. Again, it looked like a quick success, and the target metric was met in one try. Upon diving into the data though, I saw that the strategy “always predict no action” was working to reach the target metric because most alerts resulted in no action anyway. I identified several buggy days that had flooded the system with false alerts. Additionally, we learned late in the project that many of the alerts were visibility only. Adjusting for those factors brought the metrics down, but kept them honest.

It turned out that one of my initial concerns was correct as well, some teams had nearly unpredictable structure, while others were highly predictable. This led into a deep rabbit hole of 1 on 1 meetings with team members and trying to squeeze out performance from the model.

One class of feature was discovered that helped us reach our goals: recent historical action. This added significant performance to the model, which I immediately approached with skepticism. If the model just repeats what the last action was, that is not useful, but it is a simple strategy that gets decent metrics. I had to dive into this failure mode and write an analysis to determine whether the model was relying on this shortcut. Fortunately the investigation gave me enough confidence that the model was learning genuinely useful patterns.

## Shipping a Smaller Version

Jumping back to the start of the project, when I had met with the head of the marketing department, I had pitched it as a matter of fact that we would be dismissing alerts. At the achieved performance we would have been able to auto-close half of all alerts. However, the alert system, even if noisy, has been long used by the company not just to identify operational issues, but also to provide broad visibility into the health of the business. In this view, there is value in the noise.

Given this value, we had to scope back the original vision. Rather than jumping straight into closing alerts, we decided to show a probability score in the UI of the alert system. I met with the company software architect and the team responsible for the alert system. This was the company's first production ML model, which meant there wasn't an established pattern for deployment or ownership.

Now the work has been done, the first version of the model is out, and it has been running for several weeks. Anecdotally I have heard from my coworkers that the estimates seem to be accurate and they do use them to triage alerts and save time.

In a few weeks I will meet again with users and developers of the alert system. We will make sure we aren’t encountering any obvious failures or feedback issues. Perhaps the next small step will be something like the ability to allow specific user-defined alerts to auto-close. Earlier I wanted to optimize everything in huge steps. Now I want to automate one small piece, validate it, and continue from there.

## Conclusion

I set out to see if ML models could help the company, and I am glad that with much help along the way, I was able to contribute an actual deployed product. Looking back, getting the model itself to work was only half the battle. The harder problems were figuring out what was immediately useful (not just theoretically), earning trust from people, and introducing change at a slower pace. Several times throughout this project, I found models that appeared successful but failed under scrutiny, and projects that were too risky proportional to their value.

A few months ago I was frustrated by this process. I wanted to jump directly to large foundational projects and optimize entire systems. Now I find myself thinking differently. Mature organizations absorb risk gradually, not all at once. The most successful projects are often not the most ambitious ones, but the ones that create enough value and confidence to justify the next step.