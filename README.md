## How I Built an AI Injury Prevention System on Amazon Nova to Democratize Sports Science

---

## What Inspired Me

I train alone. No coach, no spotter, no one to tell me my knees are caving in on my third set of squats when my legs are exhausted and my form is breaking down. Most people who lift weights are in the same position — personal trainers are expensive, gym coaches are busy, and the feedback loop between "am I moving safely?" and "I just hurt my lower back" is dangerously short.

Musculoskeletal injuries are the **second largest cause of disability worldwide**. The vast majority are preventable. They happen because people train under fatigue without knowing their form is degrading, because they don't know their posterior chain needs 72 more hours of recovery, because no one told them their knee valgus on a 1-rep max is categorically different from knee valgus on an air squat.

Elite athletes have sports scientists, physiotherapists, and strength coaches tracking every rep. Everyone else has YouTube.

I wanted to close that gap.

---

## What I Built

**Form & Feast** is an AI-powered preventive health system that combines three things that have never been connected in a single pipeline:

1. **Computer vision biomechanics analysis** — Amazon Nova Pro watches your lift and assesses joint angles, movement compensation patterns, and fatigue indicators in real time.
2. **Agentic nutritional science** — Amazon Nova Lite generates whole-food recovery meals scaled to your exact session volume, with carbon footprint scoring and sustainable ingredient swaps.
3. **Longitudinal RAG memory** — Every session is stored in DynamoDB. The system gets smarter about your body over time, detecting chronic injury patterns, calculating per-muscle recovery percentages, and auto-regulating today's training intensity based on your last three sessions.

---

## How I Built It

### The Stack

- **Amazon Nova Pro** via Amazon Bedrock — multimodal video analysis
- **Amazon Nova Lite** via Amazon Bedrock — meal generation, coaching, auto-regulation
- **Amazon S3** — video storage
- **Amazon DynamoDB** — two tables: `FormAndFeastSets` and `FormAndFeastSessions`
- **FastAPI** — backend
- **React** — frontend

### The Form Module

The user selects their exercise, logs reps and weight, and uploads a short video clip. The video is stored in S3 and passed directly to Nova Pro, which analyzes the biomechanics natively — no separate pose estimation pipeline, no third-party CV library. Nova Pro outputs form feedback, an intensity score, muscle activation percentages, and raw injury flags.

Those raw flags then pass through the injury hazard scorer.

### The Injury Hazard Scorer 

The first version of the scorer used pure multiplication:

$$
\text{risk} = \text{base} \times \text{set\_multiplier} \times \text{intensity\_factor} \times \text{history\_factor}
$$

It looked clean. Then I ran a worst-case scenario:

$$
0.70 \times 1.60 \times 1.30 \times 1.40 = 2.038
$$

**203.8% injury risk.** Mathematically broken.

The fix was to treat the multiplication output as a raw **hazard score** — not a probability — and pass it through a sigmoid function to map it cleanly into \\( (0, 1) \\):

$$
P(\text{injury}) = \frac{1}{1 + e^{-2.5(H - 1)}}
$$

Where \\( H \\) is the raw hazard score. The curve is calibrated so that:

- \\( H = 0.5 \\) → \\( \approx 18\% \\) — mild compensation, low intensity, no history
- \\( H = 1.0 \\) → \\( \approx 73\% \\) — moderate compensation, moderate intensity
- \\( H = 2.0 \\) → \\( \approx 95\% \\) — severe compensation, high intensity, chronic pattern
- \\( H \to \infty \to 99\% \\) asymptotically — **never 100%**

The four multipliers each represent a distinct clinical concept:

| Multiplier | Clinical Meaning | Range |
|---|---|---|
| Anatomic severity weight | How directly this pattern loads vulnerable structures | \\( 0.20 - 0.70 \\) |
| Load factor | Absolute load — valgus on air squats vs 1RM | \\( 0.70 - 1.30 \\) |
| Fatigue multiplier | Neuromuscular fatigue — form breaks exponentially under load | \\( 1.00 - 1.75 \\) |
| Overuse multiplier | Chronic micro-trauma from repeated sessions | \\( 1.00 - 1.35 \\) |

The output is labeled **Estimated Stress Risk** — not "probability of ACL tear." Sports science measures injury risk in incidences per 1,000 hours, not per-rep probability. The framing matters.

Here's the core of the Python implementation:

```python
def _sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-2.5 * (x - 1)))

def score_injury_flags(current_flags, set_number, intensity_score, past_session_flags=None):
    for flag in current_flags:
        base_weight = SEVERITY_WEIGHT[matched_key] / 100
        fatigue_multiplier = min(1.0 + (set_number - 1) * 0.25, 1.75)
        load_multiplier = 0.7 + (intensity_score / 10) * 0.6
        overuse_multiplier = 1.35 if appeared_before else 1.0

        raw_hazard = base_weight * fatigue_multiplier * load_multiplier * overuse_multiplier
        risk_score = min(99, round(_sigmoid(raw_hazard) * 100))
```

### The RAG Layer

Every finished session is saved to DynamoDB with muscle activation percentages, intensity scores, injury flags, and a timestamp. The recovery dashboard calculates per-muscle recovery percentage using:

$$
\text{recovery\%} = \min\!\left(100,\ \frac{t_{\text{elapsed}}}{T_{\text{full}} / \lambda} \times 100\right)
$$

Where:
- \\( t_{\text{elapsed}} \\) = hours since last trained
- \\( T_{\text{full}} \\) = full recovery hours for that muscle (e.g. 72h for quadriceps)
- \\( \lambda = \frac{\text{intensity}}{10} \\) — a harder session requires proportionally longer recovery

Before each session, Nova Lite reads the last 3 sessions and current recovery status, then generates an auto-regulated training recommendation — which muscle groups to avoid, which to reduce, which are ready, and a maximum RPE cap for the day.

---

## The Challenges

**The >100% problem** was the biggest one. I initially framed the base scores as clinical probabilities, which they aren't. Sports medicine epidemiology doesn't work in per-rep probabilities — it works in population-level incidence rates. Renaming them _anatomic severity weights_ and running them through a sigmoid fixed both the math and the clinical framing.

**Exercise detection** was the second major challenge. Nova Pro is powerful, but short clips under 10 seconds don't provide enough frames for reliable auto-detection of specific exercise variants. The production-standard solution — used by Whoop, Tempo, and Apple Fitness+ — is user-provided exercise context. The user selects their exercise, and Nova uses that context to analyze the specific biomechanics rather than guessing.

**Session state** was architecturally complex. A workout isn't a single video — it's 6-7 exercises, 3-4 sets each, with fatigue accumulating across the whole session. Building the session schema in DynamoDB, tracking set-level data, and aggregating it correctly at session finish took significant iteration.

---

## Community Impact

Form & Feast is most valuable to the people who need it most — those who can't afford a personal trainer, train alone, or are returning from injury. The injury prevention layer has direct implications for public health: musculoskeletal injuries cost healthcare systems billions annually, and the majority are preventable with basic movement correction.

The carbon footprint scoring on meals is a deliberate alignment with **SDG 12 and 13** — the system doesn't just optimize for your recovery, it surfaces the environmental cost of your food choices and offers lower-emission alternatives that maintain the same macronutrient targets.

The next step is integration with wearables for sleep and heart rate variability data, which would make the recovery model significantly more accurate. Longer term, this is infrastructure for physical therapy clinics — a way to monitor rehabilitation patients between sessions with objective biomechanical data rather than self-reported pain scores.

---

## What I Learned

Amazon Nova Pro's native video understanding is genuinely impressive. Passing a raw video and receiving structured biomechanical analysis — joint angles, compensation patterns, fatigue indicators — without a separate CV pipeline is a step change in what's possible for solo developers building health applications.

The most important lesson was the difference between building a _feature_ and building a _system_. Individual components are straightforward. The hard part is the memory layer: making sure every interaction is tagged to a session, every session is summarized for future context, and the coach always has the right information to give advice that's actually personalized rather than generic.

That's what RAG enables. And that's what makes Form & Feast feel less like an app and more like a coach that actually knows you.

