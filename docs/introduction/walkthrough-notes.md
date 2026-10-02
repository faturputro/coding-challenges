# Walkthrough: Additional Notes

A few points I didn't cover in the walkthrough video ([walkthrough.mov](https://drive.google.com/drive/folders/1rDTGB-ZqXk9pfeOlgxgdiC2Fp78HkYR5?usp=sharing)).

## Observability & monitoring

For observability, this project uses **[OpenObserve](https://openobserve.ai/)**. The server sends traces, metrics and logs to it through OpenTelemetry, and the browser sends real-user monitoring (RUM). Setup details are in [Observability](../README.md#4-observability). OpenObserve is a great fit for a company that wants to keep costs down and isn't ready to invest in a tool like Datadog or New Relic yet.

For monitoring, I'd set up basic alerting on:

- **P99 latency** for API endpoints and for SQL queries
- **5xx error rate**
- **CPU utilization**
- **Memory usage**

These alerts would go to a Discord channel. This part isn't set up against a live OpenObserve instance yet; see [Not yet implemented](../README.md).

## AI usage

I use **Claude** and **Codex**. Each is better than the other at different things, but Claude is the one I use daily. I combine them with three tools that help me save tokens:

- **[Graphify](https://pypi.org/project/graphifyy/):** a knowledge graph of the codebase, so the assistant reads only the relevant code instead of whole files (measured about 9× fewer tokens per question on this repo).
- **[Caveman](https://github.com/JuliusBrussee/caveman):** keeps the assistant's replies short.
- **[Ponytail](https://github.com/DietrichGebert/ponytail):** keeps the code it writes minimal.

More detail is in [Token-efficient AI development](../README.md#5-token-efficient-ai-development).

## How AI helps me

AI accelerates my development. Right now I'm working in a new team at my current company, which means new codebases: large ones, spread across multiple repositories, sometimes with legacy features. AI helps me understand how those projects relate to each other, so I can make changes confidently without breaking or affecting other features.

I carefully review every change AI makes. AI doesn't know everything about the real environment. For example, it doesn't know how a database table is actually structured in production, such as its indexes, because I don't give it full access to my device or systems. So I treat its output as a strong draft that I verify, not a final answer.
