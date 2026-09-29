# Gap Finder

**Find the one math idea you missed, before the next lessons pile on top of it.**

Built for the CSC Back-to-School Hackathon.

## The problem

A student can understand 80% of a lesson, miss one core idea, and keep going. The next lessons build on that missing idea, so they get harder and harder. Most students cannot tell *where* their understanding broke. They just feel "I'm bad at math".

Practice apps and quiz apps tell you which questions you got wrong. They do not tell you which **earlier idea** is the real cause.

## What Gap Finder does

1. The student picks a topic that feels hard (for example, multi-step equations).
2. The app asks 2 short questions on that topic (a third only if the first two disagree, so one lucky guess or one careless slip does not decide the result).
3. If the student slips, the app checks the topics that topic is built on, one at a time.
4. It stops at the earliest idea the student missed (the "root cause").
5. It shows a map of the topics, the exact mistakes made (for example, "you added instead of subtracting"), a short mini-lesson for the root cause, and a 1-week review plan with dates.

Every wrong answer is linked to a specific misconception, so the feedback explains *why* that answer is tempting and *what* went wrong.

## How it works

- Topics are stored as a **prerequisite graph** of 16 topics. Example: Multi-step equations depend on Two-step equations, the Distributive rule, Like terms and Adding fractions. Two-step equations depend on One-step equations, which depend on Negative numbers.
- The map is drawn automatically: each topic goes in a column by how many steps of prerequisites sit below it.
- The diagnosis runs a depth-first search over the graph: a topic is only tested if a topic built on it was failed.
- A failed topic whose prerequisites were all passed is marked as a **root cause**.
- The result also lists every later topic that the root cause is holding back.
- The review plan uses spaced repetition (today, +1 day, +3 days, +7 days) and is saved in the browser with `localStorage`.
- No server, no account, no data collection. Everything runs in the browser.

## Run it

Open `index.html` in any browser. It is a single file with no dependencies.

Live version: see the link on the Devpost submission.

## Tools and technologies

- HTML, CSS and vanilla JavaScript (no libraries)
- SVG for the topic map
- GitHub and GitHub Pages for hosting

## AI-use disclosure

- I used **Claude (by Anthropic)** as a coding and brainstorming assistant. It helped me choose the idea, design the prerequisite-graph approach, write the first version of the code and the question bank, and draft this README.
- I chose the problem (from my own school experience), decided which topics and mistakes to include, tested the app, and reviewed what the code does.
- No AI model runs inside the app. The questions, feedback and diagnosis logic are fixed and written in advance, so the app works offline and gives the same result every time.

## Limits and next steps

- Right now it covers 16 middle-school math topics (negative numbers, fractions, decimals, percentages, ratios, exponents, order of operations, like terms, the distributive rule, plugging in values, one-step, two-step, multi-step and fraction equations, and inequalities) with 48 questions.
- Next: more topics and grade levels, more questions per topic, a teacher view that shows which idea a whole class is missing, and Arabic and other languages.
