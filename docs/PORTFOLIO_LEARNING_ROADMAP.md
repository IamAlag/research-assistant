# Your Portfolio Learning Roadmap

This is the big-picture guide for learning your two featured projects without trying to study everything at once.

## Start here

1. [Research Assistant beginner guide](START_HERE.md)
2. [Research Assistant interview notes](INTERVIEW_NOTES.md)
3. [Video Caption Agent beginner guide](https://github.com/IamAlag/video-caption-agent/blob/main/docs/START_HERE.md) — if you have the other repository checked out separately, open that repo and go to `docs/START_HERE.md`.
4. [Video Caption Agent interview notes](https://github.com/IamAlag/video-caption-agent/blob/main/docs/INTERVIEW_NOTES.md)
5. [Research Assistant architecture notes](architecture.md)

## The two projects in one table

| Topic | Research Assistant | Video Caption Agent |
|---|---|---|
| Main input | Documents and a question | Video URLs and requested styles |
| Main output | An answer with source references | Captions in different tones |
| Core idea | Retrieve evidence, then generate text | Describe a scene, then write captions |
| Main language | TypeScript | Python |
| AI pattern | Retrieval-augmented generation (RAG) | Two-pass vision-language generation |
| Key limitation | Retrieved evidence and answer may be wrong; current local vectors are basic | Sampled frames can miss events; model can invent details |
| Good next evaluation | Did retrieval find the expected passage? Does the citation support the answer? | Is the caption factually correct? Does it match the requested style? |

## Concepts that apply to both projects

### 1. API

An API is a defined way for one program to ask another program to do something. Your projects call external AI services through APIs. Requests can fail because of invalid credentials, network issues, rate limits, or provider outages.

### 2. Secrets and environment variables

API keys are credentials. Keep them outside source code, usually in local environment variables or a secret manager. Never commit real keys to GitHub. If you accidentally publish one, revoke it with the provider; deleting the text from a later commit does not make the leaked key safe again.

### 3. Errors and retries

A useful system expects failures. A retry is appropriate for some temporary problems, but not every error should be retried. Use a maximum retry count, clear logs, and a helpful final error. A retry cannot fix a model that consistently misunderstands a scene or a document.

### 4. Testing and evaluation are different

- **Syntax/type/lint checks** find some coding mistakes.
- **Unit tests** check a small function with known inputs and expected outputs.
- **Integration tests** check whether components work together.
- **Evaluation datasets** measure the quality of AI output against reviewed examples.
- **CI** automatically runs checks when code changes.

A green CI run is useful evidence that defined checks passed. It is not proof that an AI answer is accurate or that an app is secure.

### 5. Git and GitHub basics

| Word | Meaning |
|---|---|
| Repository (repo) | A project folder tracked by Git. |
| Commit | A saved snapshot of changes with a message. |
| Branch | A separate line of development so changes can be made without immediately changing the main branch. |
| Pull request (PR) | A proposed set of changes to review and merge. |
| Merge | Combining reviewed changes into a target branch. |
| Workflow | Automated steps run by GitHub Actions. |
| Issue | A place to track a bug, task, or question. |
| README | The front page of a repository; it should tell visitors what the project does and how to run it. |

A healthy workflow is: make a focused change → run checks → review the diff → commit → open a pull request → inspect CI → merge when checks pass.

## A simple 10-day plan

Keep each session to 30–60 minutes. Understanding one thing well beats skimming twenty files.

- [ ] **Day 1:** Open both READMEs and explain each project out loud in two sentences.
- [ ] **Day 2:** Follow the Research Assistant guide and run the app if you have API access.
- [ ] **Day 3:** Trace one Research Assistant question from the chat API into the orchestrator.
- [ ] **Day 4:** Learn chunking, embeddings, retrieval, and citations. Explain the local vector limitation honestly.
- [ ] **Day 5:** Run the Research Assistant lint, type-check, and build commands.
- [ ] **Day 6:** Read the Video Caption Agent input JSON and explain what one task means.
- [ ] **Day 7:** Trace one video through download, frame extraction, scene description, and caption generation.
- [ ] **Day 8:** Explain retries, timeouts, concurrency, and the limits of LLM-as-judge evaluation.
- [ ] **Day 9:** Practise both interview summaries without reading them; write down where you get stuck.
- [ ] **Day 10:** Make one small improvement, run the relevant checks, and document what you learned.

## How to study code when it feels overwhelming

For any file, answer only these four questions first:

1. **What goes in?** (arguments, request, file, or configuration)
2. **What happens?** (the main transformation or decision)
3. **What comes out?** (return value, response, file, or side effect)
4. **What can fail?** (missing key, invalid input, network issue, unexpected model output)

Then trace the next function it calls. You do not need to understand the entire repository at once.

## Interview rule

Never pretend you know something you have not verified. A strong answer sounds like:

"I chose this approach because ____. Its limitation is ____. I would test that by ____."

That demonstrates engineering judgement, not just vocabulary.
