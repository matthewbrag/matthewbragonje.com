---
title: "Qwen 3.8 27B on 2 and 3 RTX 3090s"
pubDate: 'Aug 16 2026'
tags: ['Machine Learning', 'Hardware']
description: "I benchmarked a local language model across two and three GPUs to understand what actually limits performance. Testing different PCIe paths revealed that a third GPU connected through an NVMe adapter could outperform a card in a motherboard slot."
---

I have three RTX 3090s in a single machine. On paper that is 72 GB of VRAM and a lot of compute, more than enough to run a 27-billion-parameter model comfortably, and it's pretty straightforward to run it quickly, so I thought I would share my results. I'm very impressed and excited for the future of local AI.


## Splitting the model and hardware considerations

Layer splitting is great, but tensor parallelism is way better, and I was super excited a few months ago when `-sm tensor` got added to llama.cpp. I was a little worried about allreduce latency because I have a sub-optimal setup: a consumer AM5 board with 16x/4x/2x PCIe, no fancy 8x/8x splits, NVLink, or P2P. Not only that, I have a pretty low end motherboard, and so the third GPU is hacked in with an NVMe to Oculink to PCIe adapter chain. All that considered, computation and GPU bandwidth seem to still dominate and I was able to get some exciting results.


## The thing that actually made it fast: MTP

Raw tensor parallelism got me to about 50 tokens/second. The bigger win came from **speculative decoding**.

The great news is this new Qwen model ships with a small prediction head baked directly into the file, trained on the model's own internal state. Because it shares the exact same weights and tokenizer as the model it is drafting for, its guesses are actually very good — I saw around **65–70% acceptance**. No separate draft model, no compatibility guessing, just one flag: `--spec-type draft-mtp`.

Incredibly, that speedup comes from a head with only 52 million parameters!

## Benchmarks

All numbers below are single-stream, greedy decoding of the same ~26 GB Q6 model, measured through llama.cpp's server. "Decode" is generation speed; "prefill" is prompt-processing speed.

| Configuration | Prefill (tok/s) | Decode (tok/s) | MTP accept | VRAM / card |
|---|---|---|---|---|
| 2 GPU (both CPU-attached), tensor | 623 | 45.9 | — | ~13 GB |
| **2 GPU (both CPU-attached), tensor + MTP** | 508 | **81.6** | 65% | ~13 GB |
| 3 GPU, tensor | 494 | 50.8 | — | 8.9 GB |
| **3 GPU, tensor + MTP** | 400 | **80.4** | 67% | 9.4 GB |
| 2 GPU (one card on the x2 chipset slot), tensor + MTP | 397 | 72.3 | 65% | ~13 GB |

A few things stand out:

- **MTP is the single biggest lever** — it lifted decoding by roughly 78% on two cards (45.9 → 81.6) and 58% on three (50.8 → 80.4), for the cost of one flag.
- **Two well-connected cards beat three.** The fastest config is the *two CPU-attached* GPUs at 81.6 tok/s, which actually edges out all three (80.4), because the third card here is stuck on a x2 chipset slot and drags the whole reduction down. Placement matters as much as count: swap the chipset card into the pair and decode falls to 72.3 (last row). The third GPU that's hacked in and literally sitting on a desk beat the second motherboard PCIe slot.
- **The third card's real payoff is VRAM, not speed** — at three cards each GPU holds under 10 GB, leaving tons of room for context. I comfortably ran a 150k-token context with headroom to spare.
- **Prefill dips slightly with MTP** because of the draft overhead, but for interactive chat and coding, generation speed is what you feel.

For real workloads that stop naturally on predictable text (like generating code), acceptance rises and I saw closer to 85+ tok/s. The table above forces a fixed length for a fair, reproducible comparison, so treat it as a conservative floor.

## Settings

Both setups use the same recipe — flash attention on, all layers on GPU, tensor split, and MTP:

```bash
# Three GPUs (most context headroom)
llama-server -m Qwen3-27B-Q6_K.gguf -sm tensor -fa on -ngl 999 \
  -c 131072 --spec-type draft-mtp --spec-draft-n-max 3

# Two GPUs (the more common setup) — pick the two CPU-attached cards,
# not whichever card is stuck on a chipset/x2 slot (check with --list-devices)
llama-server -m Qwen3-27B-Q6_K.gguf -sm tensor -fa on -ngl 999 \
  -dev CUDA0,CUDA2 -c 131072 --spec-type draft-mtp --spec-draft-n-max 3
```

Speculative draft tokens were chosen via a simple sweep. I tested with a moderate context, and I could fit a lot more context or slots if needed. Make sure that you have NCCL updated, that was giving me issues at first.

## Model Impressions

I haven't had the chance to play around with it too much, but so far Qwen3.8 27B seems to be quite good. I'm experimenting with an agentic coding harness at work and it was able to complete a few work items essentially flawlessly and refuse a few that it deemed too complex. It was basically matching what Opus did with the same instructions.

Conversationally it seems pretty good too, when I first fired it up I asked it about a business problem I was working on, and its suggestions and ideas seemed to mostly match the latest GPT model.

I'm running at Q6 but with my setup I would be curious to see if a higher quant or full precision setup can do better on tasks the Q6 model fails at.

## Takeaways and Thoughts

This was a super interesting hardware optimization project. For one, it seems clear to me that even adding a new card on a 2x slot, even behind the chipset can have real improvements. It's certainly a good way to get some more VRAM, and I'd bet that for a larger model where latency and transfer time between cards are less dominant, 3 cards would outperform clearly. Even though in this case 2 cards wins, I would be curious to see how a x16/x4/x4 or x8/x8/x4 setup works.

I find it super fascinating that a model this small can perform so well! I see everyone on X commenting about how "We have a local Opus now." That seems a little far-fetched to me, but this model seems to be pretty great at coding and terminal use. Hard to quantify but the scaling is interesting, maybe 70-90% of the performance with something literally around 1-5% the size. I'll have to try daily driving and compare it with my Claude Code subscription.

One thing I would like to try is throwing it at a machine learning task with the right harness. I wonder if a proper and purpose-built harness can help it perform well. Even recent-ish Opus models on Claude code made dozens of mistakes on a complicated machine learning task. I wonder if a harness with a skeptic node or something along those lines could help it perform well.

I'm hoping that we get some more open source models. My setup is probably pretty niche, but a modern smart 70-100B dense model might be ideal for a setup like mine. 27B is probably underutilizing my compute. It would be interesting to see if performance can scale at all without a whole order of magnitude jump in parameter count.
