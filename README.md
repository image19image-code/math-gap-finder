# Gap Finder

**Find the Concept Behind the Mistake.** A browser-based math diagnostic that traces a student's difficulty back through prerequisite concepts to the likely root gap, then turns that diagnosis into a lesson, a review plan, and a re-check.

## The Problem

Most practice follows one pattern: **wrong answer → correct answer → move on.** It never asks *why*.

Math is cumulative. A student struggling with **Like Terms** may actually be missing **Negative Numbers**. Practicing the visible topic again does not repair a concept that sits underneath it.

## What Gap Finder Does

The student picks a topic that feels difficult and answers a short diagnostic. Gap Finder follows the results through a prerequisite graph to the earliest concept that appears to be failing.

**CHOOSE → DIAGNOSE → TRACE BACK → FIND ROOT GAP → REPAIR → RECHECK**

The result page shows a **Gap Found** diagnosis instead of a test score: a score says how a student performed, a root gap says what to work on next.

## A Real Diagnostic Example

| Step | What happens |
|---|---|
| **Student chooses** | Like Terms |
| **Diagnostic question** | "Can you simplify expressions by combining like terms with negative coefficients?" |
| **Answer choices** | A) Fully fluent with negative coefficient combination · B) Minor sign errors with subtraction · C) Cannot combine across subtraction/negatives · D) Complete guess / unknown |
| **Student response** | C — Cannot combine across subtraction/negatives |
| **Diagnostic interpretation** | Indicates a sign-distribution misconception |
| **Misconception detected** | Sign distribution breakdown over subtraction when combining variable terms with negative coefficients |
| **Prerequisite investigated** | Negative Numbers |
| **Prerequisite check** | "Evaluate expressions involving subtraction and negative integer arithmetic." |
| **Result** | Failed |
| **Root gap** | Negative Numbers (integer subtraction and sign rules) |
| **Repair** | Focused mini-lesson: adding and subtracting negative numbers, parentheses distribution, sign consolidation |
| **Review** | Today → +1 day → +3 days → +7 days → Re-check |

## How It Works

1. **Prerequisite graph:** each topic is linked to the earlier concepts it depends on.
2. **Diagnostic evidence:** the student's responses to the topic's questions show whether a misconception is present.
3. **Recursive traversal:** when a check fails, the diagnosis tests the prerequisite topics, and keeps descending the dependency tree each time a check fails.
4. **Root gap:** traversal stops at a foundational concept with no unmet prerequisite beneath it. That concept is reported as the root gap.
5. **Repair and review:** the diagnosis is tied to the student's actual mistakes, a focused mini-lesson, a one-week review schedule, and a direct re-check.

The diagnosis is **deterministic and rule-based**. It depends only on the question data, the student's responses, the prerequisite relationships, and fixed diagnostic rules.

## What Was Built

- **16 mathematics topics** and **48 diagnostic questions** (exactly 3 per topic), connected by prerequisite relationships
- Root-gap detection with misconception-specific feedback
- Prerequisite visualization
- Focused mini-lessons
- One-week review scheduling and a direct re-check
- Returning-user progress saved in the browser with `localStorage`
- Responsive layouts for phones and desktops

## Engineering Challenges

- **Recursive prerequisite traversal.** Deciding which earlier concept to test next, continuing when a check fails, and knowing when to stop, while keeping every result traceable to specific answers and rules.
- **Evidence vs. student effort.** More questions do not automatically mean a better diagnosis. Each topic has three questions, with tie-breaker behavior for unclear evidence, so the diagnostic stays short.
- **Reliability in real use.** Review dates originally followed the browser locale, so an English interface could show Arabic dates on an Arabic-configured device. Dates now use deterministic English formatting. Keyboard auto-repeat, refresh persistence, and duplicate interactions were also fixed and retested.

## Testing

Tested areas:

- Responsive layouts across approximately **360px–1440px**: touch targets, overflow, equation readability
- Keyboard behavior
- Persistence across page refresh
- Locale and date handling
- Duplicate interactions

## AI Use

**AI helped build Gap Finder. It does not make the diagnosis.**

- **Development:** ChatGPT, Google Gemini, Bolt, Replit, and Lovable were used for brainstorming, implementation assistance, debugging, code review, testing support, and refinement. AI-assisted changes were reviewed and tested.
- **Runtime:** No AI model is called.
- **Diagnosis:** Deterministic, rule-based, and explainable.

## Run It

The core student experience runs **client-side in the browser** and needs no account, database, or API key.

A small Node.js server (`server.js`) is included for local static serving and testing. It does not perform diagnostic logic or provide business-logic API endpoints, and it is not required for the core experience.

```bash
node server.js
```

Then open the local address the server prints.

## Technologies

- Client-side web application running in the browser
- `localStorage` for progress persistence
- Node.js (local static serving and testing only)

## Limitations and Next Steps

**Current scope:** 16 topics and 48 questions. The prerequisite model and diagnostic rules are my own design.

**Not yet proven:**

- Whether repairing the identified root gap measurably improves performance on the original topic
- Whether the prerequisite model generalizes to a much larger population of students

**Next validation question:** when Gap Finder identifies a root gap, does repairing that concept measurably improve performance on the original topic?

## Core Idea

**Find the gap. Understand it. Repair it. Recheck it.**
