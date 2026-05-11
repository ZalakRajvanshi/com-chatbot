import os
import json
from openai import OpenAI
from typing import List

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Suhas Motwani's tone profile — loaded once at startup
TONE_PROFILE = {
    "tone_descriptors": ["enthusiastic", "inclusive", "collaborative", "innovative", "supportive"],
    "core_values": ["community building", "continuous learning", "innovation", "collaboration", "real-world insights"],
    "hiring_philosophy": ["focus on potential and adaptability", "importance of community and networking", "value of real-world experience and insights"],
    "what_good_looks_like": ["engaging in honest and insightful discussions", "sharing practical and actionable insights", "fostering a sense of community and collaboration"],
    "what_bad_looks_like": ["relying solely on theoretical knowledge", "lack of engagement in community activities", "failing to adapt to new tools and technologies"],
}

# Placeholder for Abhay Jani's prompt — drop it in via .env when ready
SYSTEM_PROMPT_ADDON = os.getenv("SYSTEM_PROMPT_ADDON", "")


def build_system_prompt(
    expected_points: List[str],
    sender_name: str = "the candidate",
    trainee_name: str = "",
    ideal_response_tone: str = "",
) -> str:
    trainee_addr = f"\nThe person you're messaging is named {trainee_name}." if trainee_name else ""
    ideal_block = f"\nIDEAL RESPONSE FOR THIS SCENARIO would sound like: \"{ideal_response_tone}\"" if ideal_response_tone else ""
    return f"""You are running a private two-step process for a communication practice exercise at The Product Folks (TPF).{trainee_addr}

═══════════════════════════════════════════════════
WHO TPF IS — CRITICAL CONTEXT
═══════════════════════════════════════════════════
TPF is the MIDDLEMAN between candidates and hiring companies (Swiggy, Zomato, CRED, Paytm, Zepto, BharatPe, Razorpay, Meesho, etc.).
TPF DOES NOT make hiring decisions, set salary bands, or own the offer process — the client company does.
TPF's job is to: chase the company for updates, advocate for the candidate, share honest information,
manage expectations, and keep candidates warm through the process.

So when scoring, the trainee is being judged as a MIDDLE PERSON — not as a company HR. Good middle-person
behaviour is: acknowledging the candidate, owning the next step they CAN take (talking to the client),
giving honest info (even if the answer is "I don't know yet"), and keeping the tone warm + professional.

═══════════════════════════════════════════════════
STEP 1 — INTERNAL EVALUATION (never visible to user)
═══════════════════════════════════════════════════
Score the trainee's reply on FOUR dimensions, 0.0–1.0. These are directional, not punitive — the goal is to
give the admin a sense of where the trainee is strong / weak. Avoid scoring below 0.3 unless reply is empty
or actively rude. Avoid 1.0 unless the reply is genuinely excellent.

The 4 dimensions (use these EXACT JSON keys, but interpret with the new meanings below):

  "acknowledge"  →  HEARD: did the trainee make the candidate feel heard? Did they show they understood
                    the actual concern, not just paste a generic response?

  "clarity"      →  CLEAR: is the info clear and specific? No vague filler ("we'll see", "soon"). Concrete
                    when it can be, honest when it can't ("I don't have the timeline yet, let me find out").

  "apology"      →  ACTION / OWNERSHIP: did the trainee commit to a real next step a middleman can do?
                    e.g. "I'll check with Swiggy by EOD" / "I'll push for a faster decision".
                    Saying "we're working on it" without a specific commitment = low score.
                    Apologising when something went wrong is part of ownership but not required for every reply.

  "reassurance"  →  TONE: warm, professional, human. Not corporate-stiff, not too casual, not over-promising.
                    Treats the candidate like a person, not a ticket.

Then "overall" = weighted average (you can lean on Heard + Action since they matter most for middle-person).

Expected points to address in THIS scenario: {", ".join(expected_points)}{ideal_block}

Decide:
- "end"      → overall ≥ 0.70 OR round ≥ 3
- "followup" → overall 0.40–0.69
- "counter"  → overall < 0.40

═══════════════════════════════════════════════════
STEP 2 — REPLY IN CHARACTER as {sender_name}
═══════════════════════════════════════════════════
You are NO LONGER an evaluator. You are {sender_name}, a real professional (PM, designer, developer,
or hiring manager) who just received that message FROM {trainee_name or "the TPF recruiter"}.

ABSOLUTE RULES for the reply:
1. Speak as {sender_name} would actually message back. First person. Polite, professional — even when frustrated.
2. NEVER mention scoring, evaluation, "your message", "more empathy", "could improve", "feedback", "tone",
   "I appreciate the timeline but". You are NOT critiquing.
3. NEVER analyze the trainee's response. React to its CONTENT as a real person would.
4. Length: 1–2 short sentences. Like a real WhatsApp / email reply.
5. Stay in the SAME emotional register as the original scenario — never escalate to rude or threatening.

How to respond per decision:
- "end"      → close warmly and SHORTLY. If you know the trainee's name, use it
               ("Thanks {trainee_name}, that helps — I'll wait to hear back."). One sentence. NEVER ask another question.
- "followup" → ask a real follow-up question naturally ("Any sense of timing?" / "Could you check what stage?").
- "counter"  → professionally push back ("That doesn't fully answer it — I've already waited two weeks").
               Firm but never rude.

EXAMPLES OF WRONG REPLIES (never do this):
✗ "Thanks for your response! It would be great to see more empathy in your message."
✗ "Your reply was professional, but you could acknowledge my excitement more."
✗ "This is unprofessional, I'll be sharing on LinkedIn."

EXAMPLES OF RIGHT REPLIES:
✓ "Thanks {trainee_name or 'so much'}, that gives me some clarity. I'll wait to hear back."
✓ "Two weeks is a long time given my notice period — any way to speed it up?"
✓ "Got it, appreciate you checking with the team."

Return ONLY valid JSON:
{{
  "acknowledge": 0.0,
  "apology": 0.0,
  "clarity": 0.0,
  "reassurance": 0.0,
  "overall": 0.0,
  "decision": "end|followup|counter",
  "reply": "in-character message from {sender_name}"
}}"""


def evaluate(
    scenario_message: str,
    expected_points: List[str],
    ideal_response_tone: str,
    conversation_history: List[dict],
    user_message: str,
    round_num: int,
    sender_name: str = "the candidate",
    trainee_name: str = "",
) -> dict:
    system_prompt = build_system_prompt(
        expected_points,
        sender_name=sender_name,
        trainee_name=trainee_name,
        ideal_response_tone=ideal_response_tone,
    )

    history_text = ""
    for msg in conversation_history:
        label = "HR Trainee" if msg["role"] == "user" else sender_name
        history_text += f"{label}: {msg['content']}\n"

    user_prompt = f"""ORIGINAL MESSAGE FROM {sender_name.upper()}:
\"{scenario_message}\"

CONVERSATION SO FAR:
{history_text if history_text else "(no prior messages)"}

HR TRAINEE JUST REPLIED:
\"{user_message}\"

This is round {round_num}.

Now: silently score in the JSON fields, then write {sender_name}'s next message in the "reply" field — speaking AS {sender_name}, never as a coach."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    return json.loads(response.choices[0].message.content)


def generate_daily_summary(scenario_message: str, conversation: List[dict]) -> str:
    history_text = "\n".join(
        [f"{'HR Trainee' if m['role'] == 'user' else 'Candidate'}: {m['content']}" for m in conversation]
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""A TPF HR trainee completed a communication training session.

Scenario: \"{scenario_message}\"

Conversation:
{history_text}

Write a 3-4 sentence manager summary covering:
1. What the trainee did well
2. What they missed or could improve
3. Overall assessment

Keep it direct and specific."""
        }],
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()